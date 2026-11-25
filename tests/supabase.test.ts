import { describe, expect, it } from "vitest";
import { casoDaLinha, type LinhaCaso } from "@/lib/demo-api/repositorio-supabase";
import { sessaoDoUsuario } from "@/lib/sessao-tipos";

describe("sessão a partir do usuário do Supabase", () => {
  it("usa o perfil do app_metadata e o nome do user_metadata", () => {
    expect(sessaoDoUsuario({ email: "varejista@gmail.com", app_metadata: { perfil: "varejista" }, user_metadata: { nome: "Marina Alves" } })).toEqual({
      email: "varejista@gmail.com",
      nome: "Marina Alves",
      perfil: "varejista",
    });
  });

  it("nunca dá perfil de fornecedor pelo user_metadata (que o próprio usuário edita)", () => {
    const s = sessaoDoUsuario({ email: "alguem@exemplo.com", app_metadata: {}, user_metadata: { perfil: "varejista", nome: "Alguém" } });
    expect(s?.perfil).toBe("consumidor");
  });

  it("sem nome cai para o início do e-mail; sem usuário ou e-mail, sem sessão", () => {
    expect(sessaoDoUsuario({ email: "pessoa@exemplo.com", app_metadata: {}, user_metadata: {} })?.nome).toBe("pessoa");
    expect(sessaoDoUsuario(null)).toBeNull();
    expect(sessaoDoUsuario({ email: undefined, app_metadata: {}, user_metadata: {} })).toBeNull();
  });
});

describe("linha da tabela casos → Caso", () => {
  const base: LinhaCaso = {
    id: "caso-019",
    cliente: "Padaria (fictício)",
    segmento: "Padaria",
    uf: "SP",
    etapa: "aguardando_aprovacao",
    criado_em: "2026-11-25",
    economia_liquida_mensal_rs: "123.40",
    oferta_id: "of-alfa",
    risco_desistencia: "baixo",
    motivo_risco: null,
    proxima_acao: "Operador revisar e aprovar a migração",
    alerta_beneficio: false,
    ciencia: null,
    aprovado_por: null,
    recibo_id: null,
  };

  it("converte numeric em number e omite os opcionais nulos", () => {
    const c = casoDaLinha(base);
    expect(c.economia_liquida_mensal_rs).toBe(123.4);
    expect(c).not.toHaveProperty("ciencia");
    expect(c).not.toHaveProperty("aprovado_por");
    expect(c).not.toHaveProperty("recibo_id");
    expect(c.motivo_risco).toBeNull(); // faz parte do contrato como `string | null`
  });

  it("mantém ciência, aprovação e recibo quando existem", () => {
    const ciencia = { itens: ["a"], registrada_em: "2026-11-25T10:00:00Z", hash: "abc" };
    const aprovado_por = { operador: "Marina", em: "2026-11-25T11:00:00Z" };
    expect(casoDaLinha({ ...base, ciencia, aprovado_por, recibo_id: "r1" })).toMatchObject({ ciencia, aprovado_por, recibo_id: "r1" });
  });
});
