"use client";

import { CircleHelp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

export type ChaveDica = "distribuidora" | "total_rs" | "consumo_kwh";

export const temDica = (c: string): c is ChaveDica => c === "distribuidora" || c === "total_rs" || c === "consumo_kwh";

const DICAS: Record<ChaveDica, { titulo: string; texto: string; area: { x: number; y: number; w: number; h: number } }> = {
  distribuidora: {
    titulo: "Distribuidora",
    texto: "É o nome da empresa que entrega a luz. Fica no alto da conta, junto ao logotipo.",
    area: { x: 14, y: 14, w: 92, h: 22 },
  },
  total_rs: {
    titulo: "Total a pagar",
    texto: "Fica no alto da conta, à direita. Pode aparecer como “Valor a pagar” ou “Total da fatura”.",
    area: { x: 150, y: 14, w: 96, h: 34 },
  },
  consumo_kwh: {
    titulo: "Consumo em kWh",
    texto: "Fica na tabela de leitura ou no quadro “Consumo faturado”, em kWh. Se a conta mostrar vários meses, use o do mês atual.",
    area: { x: 14, y: 96, w: 232, h: 30 },
  },
};

/** Mini-conta genérica (a mesma para qualquer distribuidora) com a área procurada em destaque. */
function MiniConta({ chave }: { chave: ChaveDica }) {
  const a = DICAS[chave].area;
  return (
    <svg viewBox="0 0 260 190" role="img" aria-label={`Exemplo de conta de luz com o campo ${DICAS[chave].titulo} em destaque`} className="w-full rounded-md border bg-card">
      <rect x="14" y="14" width="92" height="22" rx="3" fill="var(--secondary)" />
      <rect x="150" y="14" width="96" height="34" rx="3" fill="var(--secondary)" />
      <rect x="14" y="56" width="120" height="6" rx="3" fill="var(--linha)" />
      <rect x="14" y="68" width="90" height="6" rx="3" fill="var(--linha)" />
      <rect x="14" y="96" width="232" height="30" rx="3" fill="var(--secondary)" />
      <rect x="14" y="138" width="232" height="6" rx="3" fill="var(--linha)" />
      <rect x="14" y="150" width="232" height="6" rx="3" fill="var(--linha)" />
      <rect x="14" y="162" width="160" height="6" rx="3" fill="var(--linha)" />
      <rect x={a.x - 3} y={a.y - 3} width={a.w + 6} height={a.h + 6} rx="5" fill="var(--cobre-tinta)" fillOpacity="0.6" stroke="var(--cobre)" strokeWidth="2" strokeDasharray="5 3" />
    </svg>
  );
}

export function OndeAchar({ campo }: { campo: ChaveDica }) {
  const d = DICAS[campo];
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button type="button" variant="link" size="sm" aria-label={`Onde encontrar: ${d.titulo}`} className="h-auto min-h-11 shrink-0 px-1 text-[13px] whitespace-nowrap">
          <CircleHelp aria-hidden="true" /> Onde achar?
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-[calc(100%-2rem)] sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{d.titulo}</DialogTitle>
          <DialogDescription>{d.texto}</DialogDescription>
        </DialogHeader>
        <MiniConta chave={campo} />
        <DialogClose asChild>
          <Button type="button">Entendi</Button>
        </DialogClose>
      </DialogContent>
    </Dialog>
  );
}
