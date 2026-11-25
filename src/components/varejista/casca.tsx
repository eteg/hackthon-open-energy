import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Logo } from "@/components/trevolt/logo";
import { URL_LP_FORNECEDORES } from "@/lib/links";
import { cn } from "@/lib/utils";

/** Casca do portal do fornecedor (antes do login): cabeçalho "trevolt · para fornecedores" + selo da área + ação à direita. */
export function CascaVarejista({
  area,
  direita,
  barra,
  largura = "max-w-[1240px]",
  children,
}: {
  area: string;
  direita?: React.ReactNode;
  /** Faixa branca logo abaixo do cabeçalho (ex.: etapas do cadastro). */
  barra?: React.ReactNode;
  largura?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b bg-card px-4 py-3 md:px-6">
        <div className="flex flex-wrap items-center gap-x-3.5 gap-y-2">
          <Link href={URL_LP_FORNECEDORES} aria-label="Trevolt para fornecedores, página inicial" className="inline-flex items-center gap-2">
            <Logo />
            <span className="text-sm font-medium text-muted-foreground">para fornecedores</span>
          </Link>
          <Badge variant="outline">{area}</Badge>
        </div>
        <div className="text-sm text-muted-foreground">{direita}</div>
      </header>
      {barra}
      <main className={cn("mx-auto w-full flex-1 px-4 py-8 md:px-6", largura)}>{children}</main>
      <footer className="border-t py-4 text-center text-xs text-muted-foreground">Uma plataforma ETEG</footer>
    </div>
  );
}

export const linkCobre = "font-semibold text-cobre underline underline-offset-4 hover:text-primary";
