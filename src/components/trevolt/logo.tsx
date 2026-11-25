import { cn } from "@/lib/utils";

/** Símbolo "o fio": curva em cobre ligando dois pontos (quem compra e quem vende). Área de respiro = diâmetro de um ponto. */
export function Simbolo({ negativo = false, className }: { negativo?: boolean; className?: string }) {
  return (
    <svg viewBox="0 0 48 30" fill="none" aria-hidden="true" className={cn("h-5 w-8", className)}>
      <path d="M7 22 C 15 2, 33 2, 41 22" stroke={negativo ? "#E9A27C" : "#8A3B1C"} strokeWidth="3.5" strokeLinecap="round" />
      <circle cx="7" cy="22" r="5" fill={negativo ? "#F6F2EA" : "#1E2229"} />
      <circle cx="41" cy="22" r="5" fill={negativo ? "#F6F2EA" : "#1E2229"} />
    </svg>
  );
}

/** Logotipo completo: símbolo + "trevolt" em minúsculas (nunca TREVOLT, TreVolt ou Tre-volt). */
export function Logo({ negativo = false, className }: { negativo?: boolean; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <Simbolo negativo={negativo} />
      <span className={cn("font-display text-[19px] leading-none font-medium", negativo ? "text-papel" : "text-grafite")}>trevolt</span>
    </span>
  );
}
