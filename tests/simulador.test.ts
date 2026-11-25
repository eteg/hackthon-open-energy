import { describe, expect, it } from "vitest";
import { buscarFatura, ofertas } from "@/lib/dados";
import { carregarRegras } from "@/lib/regras";
import { simular, subtrairDias } from "@/lib/simulador";
import { detectarInjecao } from "@/lib/guardrails";
import { buscar, carregarChunks } from "@/lib/rag";

const regras = carregarRegras();
const sim = (id: string) => simular(buscarFatura(id)!, ofertas, regras);

describe("simulador honesto", () => {
  it("25% na energia de uma conta com 32,4% de energia = 8,1% na conta (nunca 25%)", () => {
    const s = sim("fat-001");
    const alfa = s.ofertas.find((o) => o.oferta_id === "of-alfa")!;
    expect(s.parcela_energia_pct).toBe(32.4);
    expect(alfa.economia_liquida_mensal_rs.base).toBe(194.4); // 777,60 × 25%
    expect(alfa.economia_pct_conta_base).toBe(8.1);
  });

  it("mostra faixa (pessimista ≤ base ≤ otimista)", () => {
    for (const o of sim("fat-001").ofertas) {
      const f = o.economia_liquida_mensal_rs;
      expect(f.pessimista).toBeLessThanOrEqual(f.base);
      expect(f.base).toBeLessThanOrEqual(f.otimista);
    }
  });

  it("diz com honestidade quando não compensa (consumo baixo)", () => {
    const s = sim("fat-004");
    expect(s.veredito).toBe("nao_compensa");
    expect(s.melhor_oferta_id).toBeNull();
  });

  it("desconta o benefício perdido e alerta (irrigação)", () => {
    const s = sim("fat-003");
    expect(s.perda_beneficio_mensal_rs).toBe(310);
    expect(s.alertas.some((a) => a.tipo === "perda_beneficio")).toBe(true);
    expect(s.veredito).toBe("nao_compensa");
  });

  it("alerta TSEE e elegibilidade só em 2028 para residencial", () => {
    const s = sim("fat-006");
    expect(s.alertas.some((a) => a.tipo === "perda_beneficio" && a.mensagem.includes("TSEE"))).toBe(true);
    expect(s.elegibilidade.data_abertura).toBe("2028-11-25");
  });

  it("prazo de formalização = abertura − 90 dias", () => {
    expect(sim("fat-001").elegibilidade.prazo_formalizacao).toBe(subtrairDias("2027-11-25", 90));
    expect(subtrairDias("2027-11-25", 90)).toBe("2027-08-27");
  });

  it("recibo é determinístico (mesmo input ⇒ mesmo recibo_id)", () => {
    expect(sim("fat-001").recibo_id).toBe(sim("fat-001").recibo_id);
  });
});

describe("guardrails", () => {
  it("bloqueia a injeção escondida na fatura sintética", () => {
    const r = detectarInjecao(buscarFatura("fat-005")!.observacoes);
    expect(r.suspeito).toBe(true);
    expect(r.trecho_sanitizado).not.toMatch(/60%/);
  });
  it("não marca texto normal como injeção", () => {
    expect(detectarInjecao("Quanto vou economizar na minha padaria?").suspeito).toBe(false);
  });
});

describe("RAG da FAQ", () => {
  it("acha a resposta sobre desconto na conta inteira", () => {
    expect(buscar("Vou economizar 25% na conta inteira?")[0].pergunta).toMatch(/conta inteira/);
  });
  it("acha a resposta sobre falta de luz", () => {
    expect(buscar("se faltar luz quem conserta a rede?")[0].pergunta).toMatch(/rede/);
  });

  // O agente só responde sozinho com score ≥ limiar / 1,6 (confiança = score × 1,6 em src/lib/agente.ts).
  const scoreMinimo = carregarRegras().premissas_produto.limiar_confianca_agente / 1.6;

  it("'quando posso migrar' acha quem pode migrar, com confiança para responder", () => {
    const [top] = buscar("Quando posso migrar para o mercado livre?");
    expect(top.pergunta).toBe("Quem pode migrar e quando?");
    expect(top.score).toBeGreaterThanOrEqual(scoreMinimo);
  });

  it("usa as variações da FAQ para perguntas com outras palavras", () => {
    expect(buscar("Minha conta aumentou, por quê?")[0].pergunta).toMatch(/mais cara/);
    expect(buscar("Qual o papel da CCEE?")[0].pergunta).toMatch(/Quem é quem/);
    expect(buscar("Se o fornecedor falir fico sem luz?")[0].pergunta).toMatch(/falir/);
  });

  it("variações ajudam a busca mas não vazam para a resposta nem para a fonte", () => {
    const chunks = carregarChunks();
    expect(chunks.every((c) => c.variacoes.length > 0)).toBe(true);
    expect(chunks.some((c) => /Variações/.test(c.resposta + c.fonte))).toBe(false);
  });

  it("pergunta fora do escopo continua abaixo do limiar (escala para humano)", () => {
    const [top] = buscar("Qual o horário de funcionamento da loja?");
    expect(top?.score ?? 0).toBeLessThan(scoreMinimo);
  });
});
