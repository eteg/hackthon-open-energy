/**
 * Estado em memória para a demo (sem banco). Sobrevive ao hot reload via globalThis.
 * Evidências e observabilidade também vão para logs/*.jsonl (quando o disco permite).
 */
import { appendFileSync, mkdirSync } from "node:fs";
import path from "node:path";
import { casosIniciais } from "./dados";
import type { Caso } from "./types";

export type Evidencia = {
  em: string;
  tipo: "simulacao" | "extracao" | "ciencia" | "aprovacao_humana" | "injecao_bloqueada" | "escalonamento";
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

type Store = { casos: Caso[]; evidencias: Evidencia[]; observabilidade: RegistroObservabilidade[] };

const g = globalThis as unknown as { __etegStore?: Store };
export const store: Store = (g.__etegStore ??= {
  casos: structuredClone(casosIniciais),
  evidencias: [],
  observabilidade: [],
});

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
