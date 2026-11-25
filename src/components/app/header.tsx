import Link from "next/link";
import { Zap } from "lucide-react";

// Sem menu: cada pessoa entra pela home, escolhendo o perfil, e segue o fluxo daquele perfil.
// O logo leva de volta à home, que é onde se troca de perfil.
export function Header() {
  return (
    <header className="sticky top-0 z-10 border-b bg-background/95 backdrop-blur">
      <div className="mx-auto flex min-h-14 max-w-6xl items-center justify-between gap-3 px-4 py-2">
        <Link href="/" className="flex items-center gap-2 leading-tight font-semibold">
          <span className="flex size-7 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <Zap className="size-4" />
          </span>
          Copiloto de Migração
        </Link>
        <span className="shrink-0 rounded-md border px-2 py-0.5 text-xs text-muted-foreground">Dados sintéticos</span>
      </div>
    </header>
  );
}
