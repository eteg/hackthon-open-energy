/**
 * Estado em memória para a demo (sem banco). Sobrevive ao hot reload via globalThis.
 * Evidências e observabilidade também vão para logs/*.jsonl (quando o disco permite).
 */
import { appendFileSync, mkdirSync } from "node:fs";
import path from "node:path";
import { buscarFatura, casosIniciais } from "./dados";
import type { Caso, Fatura } from "./types";
import type { Varejista } from "./varejista";

export type Evidencia = {
  em: string;
  tipo:
    | "simulacao"
    | "extracao"
    | "fatura_confirmada"
    | "ciencia"
    | "aprovacao_humana"
    | "injecao_bloqueada"
    | "escalonamento"
    | "cadastro_varejista";
  ref: string;
  dados: Record<string, unknown>;
};

export type RegistroObservabilidade = {
  em: string;
  rota: string;
  modo: "llm" | "offline";
  modelo: string | null;
  latencia_ms: number;
  tokens_entrada: number;
  tokens_saida: number;
  custo_usd: number | null; // só calcula se os preços estiverem no .env (não inventamos preço)
  escalou: boolean;
  alerta_injecao: boolean;
};

type Store = {
  casos: Caso[];
  evidencias: Evidencia[];
  observabilidade: RegistroObservabilidade[];
  /** Empresa que opera o Copiloto (uma por instalação). Opcional: um store criado antes do hot reload não tem a chave. */
  varejista?: Varejista | null;
  /** Faturas lidas de arquivo e confirmadas pelo cliente (só em memória). */
  faturasExtraidas?: Fatura[];
};

const g = globalThis as unknown as { __etegStore?: Store };
export const store: Store = (g.__etegStore ??= {
  casos: structuredClone(casosIniciais),
  evidencias: [],
  observabilidade: [],
  varejista: null,
});

/** Nome que o cliente vê: o nome fantasia cadastrado ou, sem cadastro, o das regras. */
export const nomeVarejista = (padrao: string) => store.varejista?.nome_fantasia ?? padrao;

function anexarJsonl(arquivo: string, linha: unknown) {
  try {
    const dir = path.join(process.cwd(), "logs");
    mkdirSync(dir, { recursive: true });
    appendFileSync(path.join(dir, arquivo), JSON.stringify(linha) + "\n");
  } catch {
    /* ambiente sem disco gravável (ex.: serverless): segue só em memória */
  }
}

export function registrarEvidencia(e: Omit<Evidencia, "em">) {
  const ev = { em: new Date().toISOString(), ...e };
  store.evidencias.push(ev);
  anexarJsonl("evidencias.jsonl", ev);
  return ev;
}

export function registrarObservabilidade(r: Omit<RegistroObservabilidade, "em">) {
  const reg = { em: new Date().toISOString(), ...r };
  store.observabilidade.push(reg);
  anexarJsonl("observabilidade.jsonl", reg);
  return reg;
}

/** Fatura da base sintética ou lida de arquivo e confirmada. */
export const obterFatura = (id: string): Fatura | null =>
  buscarFatura(id) ?? store.faturasExtraidas?.find((f) => f.id === id) ?? null;
