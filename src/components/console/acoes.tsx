"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { api } from "@/lib/api";
import type { Caso } from "@/lib/types";
import { FORNECEDOR, OPERADOR, nomeCurto, numeroCaso } from "./sim";

/** Confirma e executa o ato 1 com a aprovação REAL (api.aprovarCaso). */
export function AprovarDialog({
  caso,
  aberto,
  onAbertoChange,
  onConcluido,
}: {
  caso: Caso;
  aberto: boolean;
  onAbertoChange: (v: boolean) => void;
  onConcluido: () => void;
}) {
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function confirmar() {
    setEnviando(true);
    setErro(null);
    try {
      await api.aprovarCaso(caso.id, OPERADOR); // HITL: a decisão é humana
      onAbertoChange(false);
      onConcluido();
    } catch (e) {
      setErro((e as Error).message);
    } finally {
      setEnviando(false);
    }
  }

  return (
    <Dialog open={aberto} onOpenChange={(v) => !enviando && onAbertoChange(v)}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Confirmar a execução?</DialogTitle>
          <DialogDescription>
            Você vai solicitar o CCV em nome do {FORNECEDOR}. O varejista responde pelos dados perante a CCEE, e a plataforma não desfaz o envio.
          </DialogDescription>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          {numeroCaso(caso.id)} · {nomeCurto(caso.cliente)}. Fica registrado: {OPERADOR}, data e hora.
        </p>
        {erro && <p className="text-sm text-destructive">Não foi possível concluir: {erro}</p>}
        <DialogFooter>
          <Button variant="outline" disabled={enviando} onClick={() => onAbertoChange(false)}>
            Cancelar
          </Button>
          <Button disabled={enviando} onClick={confirmar}>
            {enviando ? "Enviando…" : erro ? "Tentar de novo" : "Confirmar e executar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
