"use client";
/**
 * Estado simulado do caso do consumidor (localStorage). Existe porque aceite, CCV e CCEE
 * ainda não têm backend. Telas que dependem disto mostram <DemoBanner />. O que já tem API (fatura, simulação, casos) usa /api.
 */
import { useCallback, useSyncExternalStore } from "react";

export type EtapaCaso =
  | "inicio" | "fatura" | "conferencia" | "conta" | "ofertas" | "recibo" | "ciencia" | "dados" | "aceite"
  | "ccv_aguardando" | "distribuidora_validando" | "em_vigor" | "devolvido" | "rejeitado";

export type CasoDemo = {
  id: string;
  etapa: EtapaCaso;
  origem?: "foto" | "digitado";
  faturaId?: string; // id em /api (base sintética ou fatura confirmada)
  ofertaId?: string;
  cienciaIds?: string[];
  compartilhaDados?: { fornecedor: string; prazo: "30 dias" | "90 dias" | "180 dias" };
  representante?: { nome: string; cpf: string; email: string; celular: string };
  aceiteEm?: string;
  canalAvisos?: ("whatsapp" | "email")[];
};

const CHAVE = "trevolt:caso";
const VAZIO: CasoDemo = { id: "0123", etapa: "inicio" };
const ouvintes = new Set<() => void>();
let cache: CasoDemo | null = null;

function ler(): CasoDemo {
  if (cache) return cache;
  try {
    cache = JSON.parse(localStorage.getItem(CHAVE) ?? "null") ?? VAZIO;
  } catch {
    cache = VAZIO;
  }
  return cache!;
}
function gravar(c: CasoDemo) {
  cache = c;
  try { localStorage.setItem(CHAVE, JSON.stringify(c)); } catch { /* modo privado: segue só em memória */ }
  ouvintes.forEach((f) => f());
}

/** Caso em andamento; `atualizar` mescla campos, `reiniciar` volta ao começo. Renderiza VAZIO no servidor. */
export function useCasoDemo() {
  const caso = useSyncExternalStore(
    (f) => { ouvintes.add(f); return () => ouvintes.delete(f); },
    ler,
    () => VAZIO
  );
  const atualizar = useCallback((p: Partial<CasoDemo>) => gravar({ ...ler(), ...p }), []);
  const reiniciar = useCallback(() => gravar(VAZIO), []);
  return { caso, atualizar, reiniciar };
}
