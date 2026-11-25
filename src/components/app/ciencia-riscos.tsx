"use client";

import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import type { ItemCiencia } from "@/lib/types";

/** Ciência prévia obrigatória (Decreto nº 13.097/2026): sem todos os itens, não há pedido de migração. */
export function CienciaRiscos({
  itens,
  marcados,
  onChange,
  destaque,
}: {
  itens: ItemCiencia[];
  marcados: Set<string>;
  onChange: (proximo: Set<string>) => void;
  destaque?: string[];
}) {
  return (
    <div className="space-y-3">
      {itens.map((i) => (
        <div
          key={i.id}
          className={`flex items-start gap-3 rounded-lg border p-3 ${destaque?.includes(i.id) ? "border-destructive/60 bg-destructive/5" : ""}`}
        >
          <Checkbox
            id={`ciencia-${i.id}`}
            checked={marcados.has(i.id)}
            onCheckedChange={(v) => {
              const prox = new Set(marcados);
              if (v === true) prox.add(i.id);
              else prox.delete(i.id);
              onChange(prox);
            }}
            className="mt-0.5"
          />
          <Label htmlFor={`ciencia-${i.id}`} className="block font-normal">
            {i.texto}
            <span className="mt-0.5 block text-xs text-muted-foreground">Fonte: {i.fonte}</span>
          </Label>
        </div>
      ))}
    </div>
  );
}
