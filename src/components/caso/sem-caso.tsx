import Link from "next/link";
import { Button } from "@/components/ui/button";

/** Estado vazio amigável quando faltam dados de etapas anteriores. */
export function SemCaso({ texto = "Ainda falta escolher a oferta da sua conta." }: { texto?: string }) {
  return (
    <div className="flex flex-col gap-3 rounded-xl border bg-card p-4">
      <h2 className="text-xl font-bold">Vamos começar pela sua fatura</h2>
      <p className="text-sm text-muted-foreground">{texto} Envie a fatura para ver as ofertas e voltar aqui.</p>
      <Button asChild size="lg">
        <Link href="/fatura">Enviar a fatura</Link>
      </Button>
    </div>
  );
}
