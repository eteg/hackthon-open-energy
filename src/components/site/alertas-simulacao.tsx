import { Info, TriangleAlert } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import type { Simulacao } from "@/lib/types";

/** Alertas reais da simulação (perda de benefício, elegibilidade) e o veredito "não compensa". Aviso antes de vender: sempre à vista. */
export function AlertasSimulacao({ sim }: { sim: Simulacao }) {
  return (
    <>
      {sim.alertas
        .filter((a) => a.tipo !== "injecao")
        .map((a) => (
          <Alert key={a.mensagem} variant={a.tipo === "perda_beneficio" || a.tipo === "elegibilidade" ? "warning" : "default"}>
            <TriangleAlert />
            <AlertTitle>{a.tipo === "perda_beneficio" ? "Você perde um benefício ao migrar" : a.tipo === "elegibilidade" ? "Atenção à elegibilidade" : "Atenção"}</AlertTitle>
            <AlertDescription>
              {a.mensagem}
              {a.fonte && <span className="text-xs">Fonte: {a.fonte}</span>}
            </AlertDescription>
          </Alert>
        ))}
      {sim.veredito === "nao_compensa" && (
        <Alert variant="warning">
          <Info />
          <AlertTitle>Pelas nossas contas, migrar não compensa agora</AlertTitle>
          <AlertDescription>Preferimos dizer isso a prometer uma economia que não vai aparecer na sua conta.</AlertDescription>
        </Alert>
      )}
    </>
  );
}
