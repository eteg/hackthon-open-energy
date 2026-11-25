import "server-only";
/** Estado do modo demonstração nas tabelas do Supabase (supabase/migrations). Acesso só pelo servidor, com a chave secreta. */
import type { PostgrestError } from "@supabase/supabase-js";
import { supabaseAdmin } from "@/lib/supabase/servidor";
import type { Caso, Fatura } from "@/lib/types";
import type { Varejista } from "@/lib/varejista";
import type { Repositorio } from "./repositorio";

const COLUNAS_CASO =
  "id, cliente, segmento, uf, etapa, criado_em, economia_liquida_mensal_rs, oferta_id, risco_desistencia, motivo_risco, proxima_acao, alerta_beneficio, ciencia, aprovado_por, recibo_id";

export type LinhaCaso = Omit<Caso, "ciencia" | "aprovado_por" | "recibo_id" | "economia_liquida_mensal_rs"> & {
  economia_liquida_mensal_rs: number | string;
  ciencia: Caso["ciencia"] | null;
  aprovado_por: Caso["aprovado_por"] | null;
  recibo_id: string | null;
};

/** Linha da tabela `casos` → `Caso` do contrato (sem campos nulos opcionais; numeric vira number). */
export function casoDaLinha(l: LinhaCaso): Caso {
  const { ciencia, aprovado_por, recibo_id, economia_liquida_mensal_rs, ...resto } = l;
  return {
    ...resto,
    economia_liquida_mensal_rs: Number(economia_liquida_mensal_rs),
    ...(ciencia ? { ciencia } : {}),
    ...(aprovado_por ? { aprovado_por } : {}),
    ...(recibo_id ? { recibo_id } : {}),
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
    async criarCaso(novo, { faturaId, usuarioId }) {
      const { data, error } = await sb.from("casos").insert({ ...novo, fatura_id: faturaId, usuario_id: usuarioId }).select(COLUNAS_CASO).single();
      if (error) falhou("criar caso", error);
      return casoDaLinha(data as LinhaCaso);
    },
    async atualizarCaso(id, etapaEsperada, mudanca) {
      // Condicional na etapa: duas aprovações ao mesmo tempo não passam as duas.
      const { data, error } = await sb.from("casos").update(mudanca).eq("id", id).eq("etapa", etapaEsperada).select(COLUNAS_CASO).maybeSingle();
      if (error) falhou("atualizar caso", error);
      return data ? casoDaLinha(data as LinhaCaso) : null;
    },
    async obterVarejista() {
      const { data, error } = await sb.from("varejista").select("dados").eq("id", 1).maybeSingle();
      if (error) falhou("ler cadastro do varejista", error);
      return (data?.dados as Varejista | undefined) ?? null;
    },
    async salvarVarejista(v) {
      const { error } = await sb.from("varejista").upsert({ id: 1, dados: v });
      if (error) falhou("salvar cadastro do varejista", error);
    },
    async registrarEvidencia({ tipo, ref, dados, usuarioId }) {
      const { error } = await sb.from("evidencias").insert({ tipo, ref, dados, usuario_id: usuarioId });
      if (error) falhou("registrar evidência", error);
    },
  };
}
