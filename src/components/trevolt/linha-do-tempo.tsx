import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

export type EtapaTempo = { titulo: string; estado: "feito" | "atual" | "pendente"; detalhe?: string; rotulo?: string };

/** O fio da migração: cada etapa é um ponto ligado ao próximo. Feito = grafite, atual = cobre, pendente = tracejado. */
export function LinhaDoTempo({ etapas, className }: { etapas: EtapaTempo[]; className?: string }) {
  return (
    <ol className={cn("flex flex-col", className)}>
      {etapas.map((e, i) => (
        <li key={e.titulo} className="relative flex gap-3 pb-5 last:pb-0" aria-current={e.estado === "atual" ? "step" : undefined}>
          {i < etapas.length - 1 && <span aria-hidden="true" className="absolute top-6 bottom-0 left-2.5 w-px bg-border" />}
          <span
            aria-hidden="true"
            className={cn(
              "relative z-[1] mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full",
              e.estado === "feito" && "bg-grafite text-white",
              e.estado === "atual" && "border-[3px] border-primary bg-card",
              e.estado === "pendente" && "border-[1.5px] border-dashed border-[#a6a194]"
            )}
          >
            {e.estado === "feito" && <Check className="size-3" strokeWidth={3} />}
          </span>
          <div className="min-w-0 flex-1 text-sm">
            <div className="flex items-baseline justify-between gap-2">
              <span className={cn(e.estado === "pendente" ? "text-muted-foreground" : "font-medium")}>{e.titulo}</span>
              {e.rotulo && <span className="shrink-0 text-xs font-semibold text-muted-foreground">{e.rotulo}</span>}
            </div>
            {e.detalhe && <p className="mt-0.5 text-xs leading-snug text-muted-foreground">{e.detalhe}</p>}
          </div>
        </li>
      ))}
    </ol>
  );
}
