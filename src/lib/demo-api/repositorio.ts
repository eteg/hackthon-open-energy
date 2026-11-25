import "server-only";
/**
 * Onde o modo demonstração guarda o estado do fluxo (faturas confirmadas, casos, evidências).
 * Duas implementações com o mesmo contrato: memória (padrão, some ao reiniciar) e Supabase (repositorio-supabase.ts).
 */
import type { Caso, Fatura } from "@/lib/types";
import fx from "./fixtures.json";

export type Evidencia = {
  tipo: "fatura_confirmada" | "ciencia" | "aprovacao_humana";
  ref: string;
  dados: Record<string, unknown>;
  usuarioId: string | null;
};

export type NovoCaso = Omit<Caso, "id">;
export type MudancaCaso = Pick<Caso, "etapa" | "proxima_acao"> & Partial<Pick<Caso, "aprovado_por">>;

export interface Repositorio {
  inserirFatura(fatura: Fatura, usuarioId: string | null): Promise<void>;
  /** Só as faturas confirmadas pelo consumidor (`up-…`); as da base sintética estão nas fixtures. */
  buscarFatura(id: string): Promise<Fatura | null>;
  listarCasos(): Promise<Caso[]>;
  buscarCaso(id: string): Promise<Caso | null>;
  /** Busca pelo identificador do link de acompanhamento (o segredo do consumidor). */
  buscarCasoPorAcompanhamento(acompanhamentoId: string): Promise<Caso | null>;
  criarCaso(caso: NovoCaso, ctx: { faturaId: string; usuarioId: string | null }): Promise<Caso>;
  /** Aplica a mudança só se o caso ainda estiver em `etapaEsperada`; `null` se outra pessoa mudou antes. */
  atualizarCaso(id: string, etapaEsperada: Caso["etapa"], mudanca: MudancaCaso): Promise<Caso | null>;
  registrarEvidencia(e: Evidencia): Promise<void>;
}

type Estado = { faturas: Fatura[]; casos: Caso[]; evidencias?: (Evidencia & { em: string })[] };
const g = globalThis as unknown as { __trevoltDemo?: Estado };

/** Estado em memória (sobrevive ao hot reload via globalThis). */
export function repositorioMemoria(): Repositorio {
  const estado: Estado = (g.__trevoltDemo ??= { faturas: [], casos: structuredClone(fx.casos) as Caso[] });
  estado.evidencias ??= [];
  return {
    async inserirFatura(fatura) {
      estado.faturas.push(fatura);
    },
    async buscarFatura(id) {
      return estado.faturas.find((f) => f.id === id) ?? null;
    },
    async listarCasos() {
      return [...estado.casos];
    },
    async buscarCaso(id) {
      return estado.casos.find((c) => c.id === id) ?? null;
    },
    async buscarCasoPorAcompanhamento(acompanhamentoId) {
      return estado.casos.find((c) => c.acompanhamento_id === acompanhamentoId) ?? null;
    },
    async criarCaso(novo) {
      const caso: Caso = { id: `caso-${String(estado.casos.length + 1).padStart(3, "0")}`, ...novo };
      estado.casos.push(caso);
      return caso;
    },
    async atualizarCaso(id, etapaEsperada, mudanca) {
      const caso = estado.casos.find((c) => c.id === id);
      if (!caso || caso.etapa !== etapaEsperada) return null;
      Object.assign(caso, mudanca);
      return caso;
    },
    async registrarEvidencia(e) {
      estado.evidencias!.push({ em: new Date().toISOString(), ...e });
    },
  };
}
