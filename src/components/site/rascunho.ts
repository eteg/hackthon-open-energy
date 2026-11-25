"use client";
/**
 * Rascunho da fatura entre as telas /fatura → /fatura/conferir → /conta (sessionStorage; nunca na URL).
 * Guarda a leitura bruta (para conferir) e, depois de confirmada, a Fatura completa (para a conta decomposta).
 */
import { useSyncExternalStore } from "react";
import type { ExtracaoArquivo } from "@/lib/api";
import type { Fatura } from "@/lib/types";

export type Rascunho = {
  leitura?: ExtracaoArquivo;
  arquivoNome?: string;
  confirmada?: Fatura;
};

const CHAVE = "trevolt:rascunho-fatura";
const VAZIO: Rascunho = {};
const ouvintes = new Set<() => void>();
let cache: Rascunho | null = null;

function ler(): Rascunho {
  if (cache) return cache;
  try {
    cache = JSON.parse(sessionStorage.getItem(CHAVE) ?? "null") ?? VAZIO;
  } catch {
    cache = VAZIO;
  }
  return cache!;
}

export function guardarRascunho(parcial: Rascunho) {
  cache = { ...ler(), ...parcial };
  try {
    sessionStorage.setItem(CHAVE, JSON.stringify(cache));
  } catch {
    /* sem sessionStorage: segue só em memória */
  }
  ouvintes.forEach((f) => f());
}

export function limparRascunho() {
  cache = VAZIO;
  try {
    sessionStorage.removeItem(CHAVE);
  } catch {
    /* ignora */
  }
  ouvintes.forEach((f) => f());
}

export function useRascunho(): Rascunho {
  return useSyncExternalStore(
    (f) => {
      ouvintes.add(f);
      return () => ouvintes.delete(f);
    },
    ler,
    () => VAZIO
  );
}

/** false no servidor e na hidratação; true depois. Evita tratar "ainda não carregou" como "não existe". */
export function useHidratado(): boolean {
  return useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );
}
