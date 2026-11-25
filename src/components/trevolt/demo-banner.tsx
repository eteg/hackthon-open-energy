import { FlaskConical } from "lucide-react";
import { cn } from "@/lib/utils";

/** Faixa para telas cujo backend ainda é simulado (login, e-mail, CCV/CCEE, permissões). */
export function DemoBanner({ children, className }: { children?: React.ReactNode; className?: string }) {
  return (
    <div role="note" className={cn("flex items-start gap-2 rounded-md border border-[#e3cc98] bg-warning-tinta px-3 py-2 text-xs leading-snug text-[#6b4400]", className)}>
      <FlaskConical className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
      <span>
        <b className="text-warning">Demonstração.</b> {children ?? "Esta etapa usa dados simulados; nada é enviado de verdade."}
      </span>
    </div>
  );
}
