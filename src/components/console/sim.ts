/**
 * Mapa explícito etapa real (api.painel) -> fila do console:
 *   aguardando_aprovacao                                    -> "Para aprovar" (ato 1: solicitar o CCV; aprovação REAL)
 *   simulado, ciencia_pendente, documentacao, escalado_humano -> "Com o consumidor"
 *   formalizado                                             -> encerrado (fora das abas; abre pela URL)
 * Só usuários do varejista aprovam; a ETEG não entra na fila.
 */
import type { Caso, Etapa } from "@/lib/types";

export type Fila = "aprovar" | "consumidor" | "encerrados";

export const OPERADOR = "Marina Alves";
export const FORNECEDOR = "Fornecedor Alfa";

export const OFERTAS: Record<string, { nome: string; prazo: number }> = {
  "of-alfa": { nome: "Fornecedor Alfa", prazo: 12 },
  "of-beta": { nome: "Fornecedor Beta", prazo: 36 },
  "of-gama": { nome: "Fornecedor Gama", prazo: 24 },
  "of-delta": { nome: "Fornecedor Delta", prazo: 36 },
};

export const ROTULO_ETAPA: Record<Etapa, string> = {
  simulado: "Simulado, com o consumidor",
  ciencia_pendente: "Ciência dos riscos pendente",
  aguardando_aprovacao: "Solicitar o CCV",
  documentacao: "Aprovado, esperando a assinatura do CCV",
  formalizado: "Formalizado",
  escalado_humano: "Com atendente",
};

export function filaDe(c: Caso): Fila {
  if (c.etapa === "aguardando_aprovacao") return "aprovar";
  if (c.etapa === "formalizado") return "encerrados";
  return "consumidor";
}

export function numeroCaso(id: string) {
  return id.replace(/^caso-/, "#");
}
export function nomeCurto(cliente: string) {
  return cliente.replace(/\s*\(fictício\)/, "");
}
