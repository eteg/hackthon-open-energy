"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useCasoDemo } from "@/lib/demo/store";
import type { Fatura, Simulacao } from "@/lib/types";
import { useHidratado, useRascunho } from "./rascunho";

type Carga = { id: string; sim?: Simulacao; fatura?: Fatura; erro?: string };

/**
 * Simulação REAL (api.simular) da fatura do caso + a própria fatura (para a conta decomposta).
 * A fatura vem do rascunho (enviada/digitada) ou, para as de exemplo, de api.extrairFatura. Se faltar, a tela usa só `parcela_energia_pct`.
 */
export function useSimulacao() {
  const hidratado = useHidratado();
  const { caso } = useCasoDemo();
  const { confirmada } = useRascunho();
  const id = caso.faturaId;
  const [carga, setCarga] = useState<Carga | null>(null);

  useEffect(() => {
    if (!id) return;
    let ativo = true;
    (async () => {
      try {
        const sim = await api.simular(id);
        let fatura = confirmada?.id === id ? confirmada : undefined;
        if (!fatura && !id.startsWith("up-")) fatura = (await api.extrairFatura(id).catch(() => null))?.fatura;
        if (ativo) setCarga({ id, sim, fatura });
      } catch (e) {
        if (ativo) setCarga({ id, erro: (e as Error).message });
      }
    })();
    return () => {
      ativo = false;
    };
  }, [id, confirmada]);

  const atual = carga && carga.id === id ? carga : null;
  return {
    sim: atual?.sim,
    fatura: atual?.fatura,
    erro: atual?.erro,
    semFatura: hidratado && !id,
    carregando: !atual && (!hidratado || !!id),
  };
}
