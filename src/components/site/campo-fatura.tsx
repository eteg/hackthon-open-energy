"use client";

import { Check, TriangleAlert } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { CampoDef } from "@/lib/fatura-campos";
import type { Beneficio } from "@/lib/types";
import { cn } from "@/lib/utils";
import { OndeAchar, temDica } from "./onde-achar";
import { PLACEHOLDER, ROTULO } from "./fatura-montagem";

export const DISTRIBUIDORAS_EXEMPLO = [
  "Distribuidora Baiana Sintética",
  "Distribuidora Cearense Sintética",
  "Distribuidora Gaúcha Sintética",
  "Distribuidora Mineira Sintética",
  "Distribuidora Paranaense Sintética",
  "Distribuidora Paulista Sintética",
];

const OPCOES: Record<string, string[]> = {
  classe: ["comercial", "industrial", "residencial", "rural"],
  subgrupo: ["B1", "B2", "B3", "B4"],
};

export type EstadoCampo = "lido" | "faltou" | "neutro" | "limpo";

/** S3 (tudo lido): rótulos curtos, como no design. */
const ROTULO_CURTO: Record<string, string> = { total_rs: "Conta do mês", consumo_kwh: "Consumo médio" };

/**
 * Campo da conferência. "Onde achar?" aparece ao lado do campo quando a leitura não o trouxe.
 */
export function CampoFatura({
  def,
  valor,
  onChange,
  estado = "neutro",
  somenteLeitura = false,
  exibicao,
}: {
  def: CampoDef;
  valor: string;
  onChange: (v: string) => void;
  estado?: EstadoCampo;
  somenteLeitura?: boolean;
  /** Texto mostrado enquanto o campo está só para leitura (ex.: "R$ 5.221,00"). */
  exibicao?: string;
}) {
  const id = `campo-${def.caminho.replace(/\./g, "-")}`;
  const rotulo = (estado === "limpo" && !somenteLeitura ? undefined : estado === "limpo" ? ROTULO_CURTO[def.caminho] : undefined) ?? ROTULO[def.caminho] ?? def.rotulo;
  const opcoes = OPCOES[def.tipo];
  const dica = temDica(def.caminho) ? def.caminho : null;
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex min-h-6 items-center justify-between gap-2">
        <Label htmlFor={id} className="text-xs font-semibold text-muted-foreground">{rotulo}</Label>
        {estado === "lido" && (
          <span className="flex items-center gap-1 text-xs font-semibold text-muted-foreground">
            <Check className="size-3.5" aria-hidden="true" /> Lido da conta
          </span>
        )}
        {estado === "faltou" && (
          <span className="flex items-center gap-1 text-xs font-semibold text-warning">
            <TriangleAlert className="size-3.5" aria-hidden="true" /> Não consegui ler
          </span>
        )}
        {estado === "neutro" && dica && <OndeAchar campo={dica} />}
      </div>
      <div className="flex items-center gap-1.5">
        {opcoes ? (
          <Select value={valor} onValueChange={onChange} disabled={somenteLeitura}>
            <SelectTrigger id={id} className={cn("h-11 w-full", estado === "faltou" && "border-warning")}>
              <SelectValue placeholder="Selecione…" />
            </SelectTrigger>
            <SelectContent>
              {opcoes.map((o) => (
                <SelectItem key={o} value={o}>
                  {o}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : (
          <Input
            id={id}
            className={cn("h-11 text-[15px] md:text-[15px]", estado === "faltou" && "border-warning bg-card")}
            type={def.tipo === "mes" ? "month" : "text"}
            inputMode={def.tipo === "numero" ? "decimal" : undefined}
            placeholder={PLACEHOLDER[def.caminho]}
            list={def.caminho === "distribuidora" ? "lista-distribuidoras" : undefined}
            autoComplete="off"
            readOnly={somenteLeitura}
            value={somenteLeitura && exibicao ? exibicao : valor}
            onChange={(e) => onChange(e.target.value)}
          />
        )}
        {estado === "faltou" && dica && <OndeAchar campo={dica} />}
      </div>
      {def.caminho === "distribuidora" && (
        <datalist id="lista-distribuidoras">
          {DISTRIBUIDORAS_EXEMPLO.map((d) => (
            <option key={d} value={d} />
          ))}
        </datalist>
      )}
    </div>
  );
}

const BENEFICIOS: { id: Beneficio; rotulo: string }[] = [
  { id: "TSEE", rotulo: "Tarifa Social (TSEE)" },
  { id: "irrigacao", rotulo: "Desconto de irrigação" },
  { id: "aquicultura", rotulo: "Desconto de aquicultura" },
];

/** Perguntamos porque perder um benefício muda a conta (aviso antes do aceite). */
export function BeneficiosCampo({ marcados, onChange }: { marcados: Set<Beneficio>; onChange: (s: Set<Beneficio>) => void }) {
  return (
    <fieldset className="flex flex-col gap-1">
      <legend className="mb-1 text-sm font-medium">Sua conta tem algum destes benefícios?</legend>
      {BENEFICIOS.map((b) => (
        <div key={b.id} className="flex min-h-11 items-center gap-3">
          <Checkbox
            id={`ben-${b.id}`}
            checked={marcados.has(b.id)}
            onCheckedChange={(v) => {
              const n = new Set(marcados);
              if (v === true) n.add(b.id);
              else n.delete(b.id);
              onChange(n);
            }}
          />
          <Label htmlFor={`ben-${b.id}`} className="text-sm font-normal">
            {b.rotulo}
          </Label>
        </div>
      ))}
    </fieldset>
  );
}
