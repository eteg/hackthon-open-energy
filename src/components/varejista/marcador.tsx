import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

/** Marcador de etapa do design: feito (grafite com visto), atual (anel cobre), pendente (tracejado). */
export function Marcador({ estado }: { estado: "feito" | "atual" | "pendente" }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "flex size-5 shrink-0 items-center justify-center rounded-full",
        estado === "feito" && "bg-grafite text-white",
        estado === "atual" && "border-[3px] border-primary bg-card",
        estado === "pendente" && "border-[1.5px] border-dashed border-[#a6a194]"
      )}
    >
      {estado === "feito" && <Check className="size-3" strokeWidth={3} />}
    </span>
  );
}

/** Card de passo/estado: título em eyebrow + h2 + descrição. `sel` = borda cobre de 2px (o passo em foco). */
export function CabecalhoPasso({ eyebrow, titulo, descricao, h2Ref, tamanho = "text-[26px]" }: { eyebrow: string; titulo: string; descricao: string; h2Ref?: React.Ref<HTMLHeadingElement>; tamanho?: string }) {
  return (
    <div>
      <div className="text-xs font-bold tracking-[0.08em] text-muted-foreground uppercase">{eyebrow}</div>
      <h2 ref={h2Ref} tabIndex={-1} className={cn("mt-1.5 leading-tight outline-none", tamanho)}>{titulo}</h2>
      <p className="mt-2 text-sm leading-normal text-muted-foreground">{descricao}</p>
    </div>
  );
}
