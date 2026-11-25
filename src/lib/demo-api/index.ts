import "server-only";
/**
 * Modo demonstração: responde no lugar do n8n quando N8N_BASE_URL não está definido.
 * As respostas são FIXAS (capturadas do serviço anterior) e só o estado mínimo do fluxo é guardado
 * (faturas confirmadas, casos e evidências), no repositório escolhido pela rota:
 * memória por padrão ou Supabase quando configurado. NÃO calcula nada: faturas enviadas por arquivo
 * simulam com os números da fatura de exemplo fat-001. Nenhuma regra de negócio mora aqui.
 */
import { createHash, randomBytes, randomUUID } from "node:crypto";
import { z } from "zod";
import { validarFaturaCompleta } from "@/lib/fatura-campos";
import { ETAPAS, type Caso, type CasoPublico, type Fatura, type Simulacao } from "@/lib/types";
import fx from "./fixtures.json";
import { repositorioMemoria, type Repositorio } from "./repositorio";

export type RespostaDemo = { status: number; body: unknown };
/** `usuarioId`: quem está logado (Supabase), para ligar faturas, casos e evidências à conta. */
export type PedidoDemo = { metodo: string; caminho: string; json?: unknown; arquivo?: boolean; usuarioId?: string | null };

/** O `acompanhamento_id` é o segredo do link do consumidor: só quem CRIA o caso o recebe. Listas e telas do console nunca o expõem. */
const semSegredo = (c: Caso): Caso => {
  const { acompanhamento_id: _segredo, ...resto } = c;
  void _segredo;
  return resto;
};

const ok = (body: unknown, status = 200): RespostaDemo => ({ status, body });
const erro = (mensagem: string, status: number, extra: object = {}): RespostaDemo => ({ status, body: { erro: mensagem, ...extra } });

const simulacoes = fx.simulacoes as unknown as Record<string, Simulacao>;
const extracoes = fx.extracoes as unknown as Record<string, { fatura: Fatura } & Record<string, unknown>>;

async function faturaDe(repo: Repositorio, id: string): Promise<Fatura | null> {
  return (extracoes[id]?.fatura as Fatura | undefined) ?? (await repo.buscarFatura(id));
}

/** Fatura enviada por arquivo (`up-…`) usa a simulação fixa da fat-001. */
async function simulacaoDe(repo: Repositorio, faturaId: string): Promise<Simulacao | null> {
  if (simulacoes[faturaId]) return structuredClone(simulacoes[faturaId]);
  if (!(await repo.buscarFatura(faturaId))) return null;
  return { ...structuredClone(simulacoes["fat-001"]), fatura_id: faturaId, recibo_id: randomUUID().replaceAll("-", "").slice(0, 16) };
}

export async function demoResponder(
  { metodo, caminho, json, arquivo, usuarioId = null }: PedidoDemo,
  repo: Repositorio = repositorioMemoria()
): Promise<RespostaDemo> {
  const rota = `${metodo} ${caminho}`;
  const corpo = (json ?? {}) as Record<string, unknown>;

  if (rota === "GET faturas") return ok(fx.faturas);

  if (rota === "POST faturas/extrair") {
    if (arquivo) {
      // Leitura fixa: a fatura de exemplo, sem segmento nem histórico (o consumidor completa na conferência).
      const lida: Partial<Fatura> = { ...extracoes["fat-001"].fatura };
      for (const k of ["id", "segmento", "historico_12m_kwh", "observacoes"] as const) delete lida[k];
      return ok({ origem: "arquivo", fatura: lida, ausentes: ["segmento", "historico_12m_kwh"], confianca: 0.9, alerta_injecao: false, padroes_injecao: [] });
    }
    const id = z.object({ faturaId: z.string() }).safeParse(corpo);
    if (!id.success) return erro("faturaId obrigatório", 400);
    return extracoes[id.data.faturaId] ? ok(extracoes[id.data.faturaId]) : erro("Fatura não encontrada", 404);
  }

  if (rota === "POST faturas/confirmar") {
    const v = validarFaturaCompleta((corpo as { fatura?: unknown }).fatura);
    if (!v.success) return erro("Fatura incompleta ou inválida", 422, { campos: v.error.flatten().fieldErrors });
    const fatura: Fatura = { ...v.data, id: `up-${randomUUID().slice(0, 8)}` };
    await repo.inserirFatura(fatura, usuarioId);
    await repo.registrarEvidencia({ tipo: "fatura_confirmada", ref: fatura.id, dados: { titular: fatura.titular, uf: fatura.uf }, usuarioId });
    return ok(fatura, 201);
  }

  if (rota === "POST simulacao") {
    const id = z.object({ faturaId: z.string() }).safeParse(corpo);
    if (!id.success) return erro("faturaId obrigatório", 400);
    const sim = await simulacaoDe(repo, id.data.faturaId);
    return sim ? ok(sim) : erro("Fatura não encontrada", 404);
  }

  if (rota === "GET regras") return ok(fx.regras);
  if (rota === "GET casos") {
    const casos = (await repo.listarCasos()).map(semSegredo).sort((a, b) => b.criado_em.localeCompare(a.criado_em) || b.id.localeCompare(a.id));
    const por = Object.fromEntries(ETAPAS.map((e) => [e, casos.filter((c) => c.etapa === e).length])) as Record<Caso["etapa"], number>;
    return ok({
      casos,
      kpis: {
        total: casos.length,
        por_etapa: por,
        risco_alto: casos.filter((c) => c.risco_desistencia === "alto").length,
        aguardando_aprovacao: por.aguardando_aprovacao,
        economia_liquida_mensal_total_rs: Math.round(casos.reduce((s, c) => s + c.economia_liquida_mensal_rs, 0) * 100) / 100,
      },
    });
  }

  if (rota === "POST casos") {
    const b = z.object({ faturaId: z.string(), ofertaId: z.string(), cienciaIds: z.array(z.string()) }).safeParse(corpo);
    if (!b.success) return erro("Dados inválidos", 400);
    const { faturaId, ofertaId, cienciaIds } = b.data;
    const faltando = (fx.regras.ciencia_obrigatoria as { id: string }[]).filter((c) => !cienciaIds.includes(c.id)).map((c) => c.id);
    if (faltando.length) return erro("Ciência incompleta", 422, { faltando });
    const fatura = await faturaDe(repo, faturaId);
    const sim = await simulacaoDe(repo, faturaId);
    if (!fatura || !sim) return erro("Fatura não encontrada", 404);
    const oferta = sim.ofertas.find((o) => o.oferta_id === ofertaId);
    if (!oferta) return erro("Oferta não encontrada", 404);
    const agora = new Date().toISOString();
    const hash = createHash("sha256").update(JSON.stringify({ faturaId, ofertaId, cienciaIds, agora })).digest("hex");
    const caso = await repo.criarCaso(
      {
        cliente: fatura.titular,
        segmento: fatura.segmento,
        uf: fatura.uf,
        etapa: "aguardando_aprovacao",
        criado_em: agora.slice(0, 10),
        economia_liquida_mensal_rs: oferta.economia_liquida_mensal_rs.base,
        oferta_id: ofertaId,
        risco_desistencia: "baixo",
        motivo_risco: null,
        proxima_acao: "Operador revisar e aprovar a migração",
        alerta_beneficio: fatura.beneficios.length > 0,
        ciencia: { itens: cienciaIds, registrada_em: agora, hash },
        recibo_id: sim.recibo_id,
        acompanhamento_id: randomBytes(16).toString("base64url"), // 22 caracteres imprevisíveis: é o "segredo" do link
      },
      { faturaId, usuarioId }
    );
    await repo.registrarEvidencia({ tipo: "ciencia", ref: caso.id, dados: { faturaId, ofertaId, itens: cienciaIds, hash }, usuarioId });
    return ok(caso, 201);
  }

  // Consulta pública pelo link: só o identificador longo vale (o `id` do console, "caso-019", não abre nada).
  const publico = caminho.match(/^casos\/([\w-]{16,64})$/);
  if (metodo === "GET" && publico) {
    const caso = await repo.buscarCasoPorAcompanhamento(publico[1]);
    if (!caso) return erro("Solicitação não encontrada", 404);
    const visao: CasoPublico = {
      numero: caso.id.replace(/^caso-/, ""),
      etapa: caso.etapa,
      criado_em: caso.criado_em,
      aprovado_em: caso.aprovado_por?.em ?? null,
      oferta_id: caso.oferta_id,
    };
    return ok(visao);
  }

  const aprovar = caminho.match(/^casos\/([^/]+)\/aprovar$/);
  if (metodo === "POST" && aprovar) {
    const b = z.object({ operador: z.string().min(2) }).safeParse(corpo);
    if (!b.success) return erro("Informe o operador", 400);
    const atual = await repo.buscarCaso(aprovar[1]);
    if (!atual) return erro("Caso não encontrado", 404);
    if (atual.etapa !== "aguardando_aprovacao") return erro(`Caso está em "${atual.etapa}", não em aguardando_aprovacao`, 409);
    const aprovado_por = { operador: b.data.operador, em: new Date().toISOString() };
    const caso = await repo.atualizarCaso(atual.id, "aguardando_aprovacao", {
      etapa: "documentacao",
      proxima_acao: "Coletar procuração e documentos da unidade",
      aprovado_por,
    });
    if (!caso) return erro("O caso mudou de etapa enquanto você aprovava. Atualize a lista.", 409);
    await repo.registrarEvidencia({ tipo: "aprovacao_humana", ref: caso.id, dados: aprovado_por, usuarioId });
    return ok(semSegredo(caso));
  }

  return erro("Rota não encontrada", 404);
}
