import "server-only";
/** Estado do modo demonstração nas tabelas do Supabase (supabase/migrations). Acesso só pelo servidor, com a chave secreta. */
import type { PostgrestError } from "@supabase/supabase-js";
import { supabaseAdmin } from "@/lib/supabase/servidor";
import type { Caso, Fatura } from "@/lib/types";
import type { Repositorio } from "./repositorio";

const COLUNAS_CASO =
  "id, cliente, segmento, uf, etapa, criado_em, economia_liquida_mensal_rs, oferta_id, risco_desistencia, motivo_risco, proxima_acao, alerta_beneficio, ciencia, aprovado_por, recibo_id";

export type LinhaCaso = Omit<Caso, "ciencia" | "aprovado_por" | "recibo_id" | "economia_liquida_mensal_rs"> & {
  economia_liquida_mensal_rs: number | string;
  ciencia: Caso["ciencia"] | null;
  aprovado_por: Caso["aprovado_por"] | null;
  recibo_id: string | null;
  acompanhamento_id?: string | null;
};

/** Colunas de leitura do link de acompanhamento: só aqui o `acompanhamento_id` é lido (as listas do console nunca o selecionam). */
const COLUNAS_CASO_COM_LINK = `${COLUNAS_CASO}, acompanhamento_id`;

/** Linha da tabela `casos` → `Caso` do contrato (sem campos nulos opcionais; numeric vira number). */
export function casoDaLinha(l: LinhaCaso): Caso {
  const { ciencia, aprovado_por, recibo_id, acompanhamento_id, economia_liquida_mensal_rs, ...resto } = l;
  return {
    ...resto,
    economia_liquida_mensal_rs: Number(economia_liquida_mensal_rs),
    ...(ciencia ? { ciencia } : {}),
    ...(aprovado_por ? { aprovado_por } : {}),
    ...(recibo_id ? { recibo_id } : {}),
    ...(acompanhamento_id ? { acompanhamento_id } : {}),
  };
}

function falhou(onde: string, e: PostgrestError): never {
  throw new Error(`[supabase] ${onde}: ${e.message}`);
}

export function repositorioSupabase(): Repositorio {
  const sb = supabaseAdmin();
  return {
    async inserirFatura(fatura, usuarioId) {
      const { id, ...dados } = fatura;
      const { error } = await sb.from("faturas").insert({ id, dados, usuario_id: usuarioId });
      if (error) falhou("inserir fatura", error);
    },
    async buscarFatura(id) {
      if (!id.startsWith("up-")) return null;
      const { data, error } = await sb.from("faturas").select("dados").eq("id", id).maybeSingle();
      if (error) falhou("buscar fatura", error);
      return data ? ({ ...(data.dados as Omit<Fatura, "id">), id } as Fatura) : null;
    },
    async listarCasos() {
      const { data, error } = await sb.from("casos").select(COLUNAS_CASO).order("criado_em", { ascending: false }).order("id", { ascending: false });
      if (error) falhou("listar casos", error);
      return (data as LinhaCaso[]).map(casoDaLinha);
    },
    async buscarCaso(id) {
      const { data, error } = await sb.from("casos").select(COLUNAS_CASO).eq("id", id).maybeSingle();
      if (error) falhou("buscar caso", error);
      return data ? casoDaLinha(data as LinhaCaso) : null;
    },
    async buscarCasoPorAcompanhamento(acompanhamentoId) {
      const { data, error } = await sb.from("casos").select(COLUNAS_CASO_COM_LINK).eq("acompanhamento_id", acompanhamentoId).maybeSingle();
      if (error) falhou("buscar caso pelo link", error);
      return data ? casoDaLinha(data as LinhaCaso) : null;
    },
    async criarCaso(novo, { faturaId, usuarioId }) {
      // Devolve o link (única vez em que ele sai do banco para quem criou o caso).
      const { data, error } = await sb.from("casos").insert({ ...novo, fatura_id: faturaId, usuario_id: usuarioId }).select(COLUNAS_CASO_COM_LINK).single();
      if (error) falhou("criar caso", error);
      return casoDaLinha(data as LinhaCaso);
    },
    async atualizarCaso(id, etapaEsperada, mudanca) {
      // Condicional na etapa: duas aprovações ao mesmo tempo não passam as duas.
      const { data, error } = await sb.from("casos").update(mudanca).eq("id", id).eq("etapa", etapaEsperada).select(COLUNAS_CASO).maybeSingle();
      if (error) falhou("atualizar caso", error);
      return data ? casoDaLinha(data as LinhaCaso) : null;
    },
    async registrarEvidencia({ tipo, ref, dados, usuarioId }) {
      const { error } = await sb.from("evidencias").insert({ tipo, ref, dados, usuario_id: usuarioId });
      if (error) falhou("registrar evidência", error);
    },
  };
}
