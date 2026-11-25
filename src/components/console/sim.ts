"use client";
/**
 * Estado SIMULADO do console (localStorage): execução por atos com a API mockada da CCEE, esperas, devolver e rejeitar.
 * O que é REAL vem de /api/casos (store em memória): etapa, risco, economia, aprovação humana (api.aprovarCaso).
 *
 * Mapa explícito etapa real -> fase do console -> fila (aba):
 *   simulado, ciencia_pendente, escalado_humano -> "consumidor"      -> "Com o consumidor" (a bola está com o consumidor ou com o atendimento)
 *   aguardando_aprovacao                         -> "ato1"            -> "Para aprovar" (ato 1: solicitar o CCV; aprovação REAL)
 *   documentacao                                 -> "espera_ccv"      -> "Com o consumidor" (espera da assinatura do CCV, lembretes D+2/D+5/D+10)
 *   formalizado                                  -> "concluido"       -> "Encerrados"
 * As fases abaixo existem só no simulado e se sobrepõem à real depois da aprovação do ato 1:
 *   ato2 (Para aprovar), espera_distribuidora (Com o consumidor), ato3 (Para aprovar), concluido, devolvido, rejeitado.
 */
import { useCallback, useSyncExternalStore } from "react";
import type { Caso } from "@/lib/types";

export type Fase =
  | "consumidor"
  | "ato1"
  | "espera_ccv"
  | "ato2"
  | "espera_distribuidora"
  | "ato3"
  | "concluido"
  | "devolvido"
  | "rejeitado";
export type Fila = "aprovar" | "consumidor" | "encerrados";

export type Sobreposicao = {
  fase?: Fase;
  anterior?: Fase; // fase de antes de devolver/rejeitar, para retomar
  protocolo?: string;
  motivo?: string;
  mensagem?: string;
  historico?: { em: string; texto: string }[];
};

export const OPERADOR = "Marina Alves";
export const FORNECEDOR = "Fornecedor Alfa";

export const OFERTAS: Record<string, { nome: string; prazo: number }> = {
  "of-alfa": { nome: "Fornecedor Alfa", prazo: 12 },
  "of-beta": { nome: "Fornecedor Beta", prazo: 36 },
  "of-gama": { nome: "Fornecedor Gama", prazo: 24 },
  "of-delta": { nome: "Fornecedor Delta", prazo: 36 },
};

const CHAVE = "trevolt:console";
const VAZIO: Record<string, Sobreposicao> = {};
const ouvintes = new Set<() => void>();
let cache: Record<string, Sobreposicao> | null = null;

function ler() {
  if (cache) return cache;
  try {
    cache = JSON.parse(localStorage.getItem(CHAVE) ?? "{}") ?? {};
  } catch {
    cache = {};
  }
  return cache!;
}
function gravar(v: Record<string, Sobreposicao>) {
  cache = v;
  try {
    localStorage.setItem(CHAVE, JSON.stringify(v));
  } catch {
    /* modo privado: segue em memória */
  }
  ouvintes.forEach((f) => f());
}

export function useSobreposicoes() {
  const mapa = useSyncExternalStore(
    (f) => {
      ouvintes.add(f);
      return () => ouvintes.delete(f);
    },
    ler,
    () => VAZIO
  );
  const atualizar = useCallback((id: string, p: Partial<Sobreposicao>, evento?: string) => {
    const atual = ler()[id] ?? {};
    const historico = evento ? [...(atual.historico ?? []), { em: new Date().toISOString(), texto: evento }] : atual.historico;
    gravar({ ...ler(), [id]: { ...atual, ...p, historico } });
  }, []);
  return { mapa, atualizar };
}

export function faseDe(caso: Caso, sobre?: Sobreposicao): Fase {
  if (sobre?.fase && caso.etapa === "documentacao") return sobre.fase;
  if (sobre?.fase && (sobre.fase === "devolvido" || sobre.fase === "rejeitado")) return sobre.fase;
  switch (caso.etapa) {
    case "aguardando_aprovacao":
      return "ato1";
    case "documentacao":
      return "espera_ccv";
    case "formalizado":
      return "concluido";
    default:
      return "consumidor";
  }
}

export function filaDe(f: Fase): Fila {
  if (f === "ato1" || f === "ato2" || f === "ato3") return "aprovar";
  if (f === "concluido" || f === "rejeitado") return "encerrados";
  return "consumidor";
}

export const ROTULO_FASE: Record<Fase, string> = {
  consumidor: "Com o consumidor",
  ato1: "Ato 1 · Solicitar o CCV",
  espera_ccv: "Esperando a assinatura do CCV",
  ato2: "Ato 2 · Solicitar a migração à CCEE",
  espera_distribuidora: "Distribuidora validando",
  ato3: "Ato 3 · Entregar ao CRM",
  concluido: "Concluído",
  devolvido: "Devolvido ao consumidor",
  rejeitado: "Rejeitado",
};

export function numeroCaso(id: string) {
  return id.replace(/^caso-/, "#");
}
export function nomeCurto(cliente: string) {
  return cliente.replace(/\s*\(fictício\)/, "");
}

/** Texto curto do cartão da fila para os casos em ato; outras fases usam a próxima ação do caso. */
export function rotuloAto(f: Fase): string | null {
  return f === "ato1" ? "Solicitar o CCV" : f === "ato2" ? "Solicitar a migração à CCEE" : f === "ato3" ? "Entregar ao CRM" : null;
}
