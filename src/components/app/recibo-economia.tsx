"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn, formatarBRL, formatarPct } from "@/lib/utils";
import type { ResultadoOferta } from "@/lib/types";

/** Recibo de economia auditável: o que é prometido, o que é premissa e o que é risco. */
export function ReciboEconomia({
  r,
  melhor,
  selecionada,
  onSelecionar,
}: {
  r: ResultadoOferta;
  melhor: boolean;
  selecionada: boolean;
  onSelecionar: () => void;
}) {
  const [aberto, setAberto] = useState(false);
  const l = r.economia_liquida_mensal_rs;
  return (
    <Card
      onClick={r.compensa ? onSelecionar : undefined}
      className={cn(
        "gap-4 transition-all",
        r.compensa ? "cursor-pointer hover:shadow-md" : "opacity-80",
        selecionada && "ring-2 ring-primary"
      )}
    >
      <CardHeader>
        <CardTitle className="text-base">{r.nome}</CardTitle>
        <CardDescription>{r.varejista}</CardDescription>
        <CardAction className="flex gap-1">
          {melhor && <Badge>Melhor para você</Badge>}
          {!r.compensa && <Badge variant="secondary">Não compensa</Badge>}
        </CardAction>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 gap-3 text-center">
          <div className="rounded-lg bg-muted/60 p-3">
            <div className="text-xs text-muted-foreground">Desconto na energia</div>
            <div className="text-xl font-semibold tabular-nums">{formatarPct(r.desconto_efetivo_energia_pct)}</div>
          </div>
          <div className="rounded-lg bg-accent p-3">
            <div className="text-xs text-muted-foreground">Efeito na conta inteira</div>
            <div className={cn("text-xl font-semibold tabular-nums", l.base < 0 && "text-destructive")}>
              {formatarPct(r.economia_pct_conta_base)}
            </div>
          </div>
        </div>
        <div className="text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Economia líquida estimada</span>
            <span className={cn("font-semibold tabular-nums", l.base < 0 && "text-destructive")}>{formatarBRL(l.base)}/mês</span>
          </div>
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Faixa (pessimista → otimista)</span>
            <span className="tabular-nums">
              {formatarBRL(l.pessimista)} a {formatarBRL(l.otimista)}
            </span>
          </div>
        </div>
        {r.motivo_nao_compensa && <p className="text-xs text-destructive">{r.motivo_nao_compensa}</p>}
        <dl className="grid grid-cols-3 gap-2 border-t pt-3 text-xs">
          <div>
            <dt className="text-muted-foreground">Prazo</dt>
            <dd>{r.prazo_meses} meses</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Reajuste</dt>
            <dd>{r.reajuste}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Multa</dt>
            <dd>{r.multa}</dd>
          </div>
        </dl>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setAberto((v) => !v);
          }}
          className="flex items-center gap-1 text-xs font-medium text-primary"
        >
          Memória de cálculo <ChevronDown className={cn("size-3 transition-transform", aberto && "rotate-180")} />
        </button>
        {aberto && (
          <ol className="list-decimal space-y-1 pl-4 text-xs text-muted-foreground">
            {r.memoria_calculo.map((m) => (
              <li key={m}>{m}</li>
            ))}
          </ol>
        )}
      </CardContent>
    </Card>
  );
}
