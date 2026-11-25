/**
 * Agente de atendimento N1. Dois modos:
 *  - "llm": usa a API da Anthropic se ANTHROPIC_API_KEY estiver no .env
 *  - "offline": RAG sobre a FAQ + templates (plano de falha sem internet, custo zero)
 * Em ambos: guardrails determinísticos antes e depois do modelo; números só do simulador.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import Anthropic from "@anthropic-ai/sdk";
import YAML from "yaml";
import { buscar, type Hit } from "./rag";
import { detectarInjecao, pedeHumano, temaSensivel } from "./guardrails";
import { carregarRegras } from "./regras";
import { buscarFatura, ofertas } from "./dados";
import { simular } from "./simulador";
import { nomeVarejista, registrarEvidencia, registrarObservabilidade } from "./store";
import { AgenteSaidaSchema, type AgenteSaida, type Fatura, type MensagemChat, type Simulacao } from "./types";

const MODELO = process.env.ANTHROPIC_MODEL ?? "claude-haiku-5-5";
const brl = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export type RespostaAgente = AgenteSaida & { modo: "llm" | "offline"; trechos: { pergunta: string; score: number }[] };

function custoUsd(tin: number, tout: number): number | null {
  const pin = Number(process.env.PRECO_INPUT_USD_POR_MTOK);
  const pout = Number(process.env.PRECO_OUTPUT_USD_POR_MTOK);
  if (!pin || !pout) return null;
  return (tin * pin + tout * pout) / 1_000_000;
}

function escalar(motivo: string, resposta: string, extra: Partial<AgenteSaida> = {}): AgenteSaida {
  return {
    resposta,
    fontes: [],
    confianca: 1,
    escalar_humano: true,
    motivo_escalonamento: motivo,
    alerta_injecao: false,
    proxima_acao: "transferir_humano",
    ...extra,
  };
}

/** Frase com números do simulador (o texto só formata; quem calcula é o código). */
function fraseSimulacao(sim: Simulacao): string {
  const melhor = sim.ofertas.find((o) => o.oferta_id === sim.melhor_oferta_id);
  if (!melhor) {
    return ` Na sua fatura, pelas nossas contas, nenhuma oferta compensa agora (premissas da versão ${sim.versao_regras} das regras).`;
  }
  const l = melhor.economia_liquida_mensal_rs;
  return ` Na sua fatura, a melhor oferta simulada (${melhor.nome}) dá cerca de ${brl(l.base)}/mês, numa faixa de ${brl(l.pessimista)} a ${brl(l.otimista)}, ou ${melhor.economia_pct_conta_base.toLocaleString("pt-BR")}% da conta inteira. É estimativa, não garantia.`;
}

/** Explicação linha a linha da fatura, só com valores extraídos (sem conta feita pela IA). */
function explicarFatura(f: Fatura, sim: Simulacao | null): AgenteSaida {
  const c = f.componentes;
  const pct = (v: number) => `${((v / f.total_rs) * 100).toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`;
  const linhas = [
    `Sua conta de ${f.mes_referencia.split("-").reverse().join("/")} foi de ${brl(f.total_rs)} (${f.consumo_kwh.toLocaleString("pt-BR")} kWh):`,
    `• Energia (TE): ${brl(c.energia_te_rs)} (${pct(c.energia_te_rs)}). É a única parte que muda no mercado livre.`,
    `• Distribuição (TUSD): ${brl(c.distribuicao_tusd_rs)} (${pct(c.distribuicao_tusd_rs)}). Continua com a distribuidora.`,
    `• Iluminação pública: ${brl(c.cip_rs)}. Tributos: ${brl(c.tributos_rs)}.`,
  ];
  if (c.desconto_beneficio_rs > 0) linhas.push(`• Benefício abatido: − ${brl(c.desconto_beneficio_rs)}. Ele deixa de valer se você migrar.`);
  return {
    resposta: linhas.join("\n") + (sim ? "\n\n" + fraseSimulacao(sim).trim() : ""),
    fontes: ["Fatura do cliente (dados extraídos)", "Decreto nº 13.097/2026"],
    confianca: 0.9,
    escalar_humano: false,
    motivo_escalonamento: null,
    alerta_injecao: false,
    proxima_acao: "explicar_fatura",
  };
}

function respostaOffline(pergunta: string, hits: Hit[], sim: Simulacao | null, limiar: number, fatura: Fatura | null): AgenteSaida {
  if (fatura && /\b(explic|entend|linha|detalh)\w*.{0,30}\b(fatura|conta)\b/i.test(pergunta)) return explicarFatura(fatura, sim);
  const top = hits[0];
  const confianca = top ? Math.min(1, Math.round(top.score * 1.6 * 100) / 100) : 0;
  if (!top || confianca < limiar) {
    return escalar(
      "baixa_confianca",
      "Não tenho certeza sobre isso e prefiro não arriscar. Posso te passar para uma pessoa da nossa equipe?",
      { confianca }
    );
  }
  const falaDeEconomia = /econom|desconto|%|conta inteira|quanto/i.test(pergunta);
  return {
    resposta: top.resposta + (falaDeEconomia && sim ? fraseSimulacao(sim) : ""),
    fontes: top.fonte ? [top.fonte] : [],
    confianca,
    escalar_humano: false,
    motivo_escalonamento: null,
    alerta_injecao: false,
    proxima_acao: falaDeEconomia ? "simular" : "nenhuma",
  };
}

async function respostaLLM(mensagens: MensagemChat[], hits: Hit[], sim: Simulacao | null, faturaJson: unknown) {
  const regras = carregarRegras();
  const template = readFileSync(path.join(process.cwd(), "prompts", "agente-sistema.md"), "utf8");
  const system = template
    .replaceAll("{{nome_varejista}}", nomeVarejista(regras.nome_varejista))
    .replaceAll("{{beneficios_nao_aplicaveis}}", Object.values(regras.beneficios_nao_aplicaveis).join(", "))
    .replaceAll("{{antecedencia_dias}}", String(regras.antecedencia_migracao_dias))
    .replaceAll("{{retorno_acr_meses}}", String(regras.retorno_acr_aviso_meses))
    .replaceAll("{{limiar_confianca}}", String(regras.premissas_produto.limiar_confianca_agente))
    .replaceAll("{{regras_yaml}}", YAML.stringify({ ...regras, ciencia_obrigatoria: undefined }))
    .replaceAll("{{pendencias_aneel}}", regras.pendencias_aneel.join("; "))
    .replaceAll("{{trechos_rag}}", hits.map((h) => `### ${h.pergunta}\n${h.resposta}\nFonte: ${h.fonte}`).join("\n\n"))
    .replaceAll("{{fatura_json}}", faturaJson ? JSON.stringify(faturaJson) : "nenhuma")
    .replaceAll("{{simulacao_json}}", sim ? JSON.stringify(sim) : "nenhuma");

  const client = new Anthropic(); // lê ANTHROPIC_API_KEY do ambiente
  const res = await client.messages.create({
    model: MODELO,
    max_tokens: 800,
    system,
    messages: mensagens.map((m) => ({ role: m.papel === "cliente" ? ("user" as const) : ("assistant" as const), content: m.texto })),
  });
  const texto = res.content.map((b) => (b.type === "text" ? b.text : "")).join("");
  const json = texto.slice(texto.indexOf("{"), texto.lastIndexOf("}") + 1);
  const saida = AgenteSaidaSchema.parse(JSON.parse(json)); // saída fora do schema ⇒ exceção ⇒ fallback
  return { saida, tin: res.usage.input_tokens, tout: res.usage.output_tokens };
}

export async function responder(mensagens: MensagemChat[], faturaId?: string | null): Promise<RespostaAgente> {
  const t0 = Date.now();
  const regras = carregarRegras();
  const limiar = regras.premissas_produto.limiar_confianca_agente;
  const ultima = [...mensagens].reverse().find((m) => m.papel === "cliente")?.texto ?? "";
  const fatura = faturaId ? buscarFatura(faturaId) : null;

  // Guardrails de entrada (determinísticos, antes de qualquer modelo)
  const injMsg = detectarInjecao(ultima);
  const injDoc = detectarInjecao(fatura?.observacoes);
  const alertaInjecao = injMsg.suspeito || injDoc.suspeito;
  if (alertaInjecao) {
    registrarEvidencia({ tipo: "injecao_bloqueada", ref: faturaId ?? "chat", dados: { padroes: [...injMsg.padroes, ...injDoc.padroes] } });
  }

  const hits = buscar(ultima);
  const trechos = hits.map((h) => ({ pergunta: h.pergunta, score: Math.round(h.score * 100) / 100 }));
  const sim = fatura ? simular(fatura, ofertas, regras) : null;
  // O documento suspeito entra no contexto sanitizado: o texto malicioso nunca chega ao modelo.
  const faturaParaModelo = fatura ? { ...fatura, observacoes: injDoc.trecho_sanitizado } : null;

  let saida: AgenteSaida;
  let modo: "llm" | "offline" = "offline";
  let tin = 0;
  let tout = 0;

  if (pedeHumano(ultima)) {
    saida = escalar("pedido_do_cliente", "Claro! Vou te passar agora para uma pessoa da nossa equipe, com o resumo da nossa conversa.");
  } else if (temaSensivel(ultima)) {
    saida = escalar("tema_sensivel", "Esse assunto precisa de uma pessoa da nossa equipe. Já estou transferindo, com o resumo do seu caso.");
  } else if (injMsg.suspeito) {
    saida = {
      resposta: "Não consigo seguir esse tipo de pedido. Posso te ajudar a entender sua conta, a simulação ou os passos da migração.",
      fontes: [],
      confianca: 1,
      escalar_humano: false,
      motivo_escalonamento: null,
      alerta_injecao: true,
      proxima_acao: "nenhuma",
    };
  } else if (process.env.ANTHROPIC_API_KEY) {
    try {
      const r = await respostaLLM(mensagens, hits, sim, faturaParaModelo);
      saida = r.saida;
      tin = r.tin;
      tout = r.tout;
      modo = "llm";
    } catch (e) {
      console.error("[agente] falha no LLM, caindo para offline:", e);
      saida = respostaOffline(ultima, hits, sim, limiar, fatura);
    }
  } else {
    saida = respostaOffline(ultima, hits, sim, limiar, fatura);
  }

  // Guardrails de saída (determinísticos, depois do modelo)
  saida.alerta_injecao = saida.alerta_injecao || alertaInjecao;
  if (saida.confianca < limiar && !saida.escalar_humano) {
    saida = { ...saida, escalar_humano: true, motivo_escalonamento: "baixa_confianca", proxima_acao: "transferir_humano" };
  }
  if (saida.escalar_humano) {
    registrarEvidencia({ tipo: "escalonamento", ref: faturaId ?? "chat", dados: { motivo: saida.motivo_escalonamento, pergunta: ultima } });
  }

  registrarObservabilidade({
    rota: "/api/agente",
    modo,
    modelo: modo === "llm" ? MODELO : null,
    latencia_ms: Date.now() - t0,
    tokens_entrada: tin,
    tokens_saida: tout,
    custo_usd: modo === "llm" ? custoUsd(tin, tout) : 0,
    escalou: saida.escalar_humano,
    alerta_injecao: saida.alerta_injecao,
  });

  return { ...saida, modo, trechos };
}
