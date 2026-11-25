import Link from "next/link";
import { BotaoVoltar } from "./botao-voltar";
import { ContaLink } from "./conta-link";
import { Logo } from "./logo";
import { PassoProgress } from "./passo-progress";
import { cn } from "@/lib/utils";

/**
 * Casca mobile first do site do consumidor.
 * Celular: coluna única com cabeçalho, progresso, conteúdo e barra de ação fixa no rodapé.
 * A partir de md (768px): a mesma coluna fica centralizada (máx. 480px) e `lateral` (resumo do caso) aparece ao lado.
 */
export function SiteShell({
  children,
  acao,
  passo,
  lateral,
  topo,
  voltar,
  className,
}: {
  children: React.ReactNode;
  /** Barra de ação fixa no rodapé: 1 botão primário (cobre) por tela + link secundário. */
  acao?: React.ReactNode;
  passo?: { n: number; total?: number; sufixo?: string };
  lateral?: React.ReactNode;
  /** Conteúdo à direita do logo (ex.: "Falar com uma pessoa"). */
  topo?: React.ReactNode;
  /** Seta de voltar antes do logo (veja BotaoVoltar). */
  voltar?: { href?: string; historico?: boolean };
  className?: string;
}) {
  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-[880px] justify-center gap-10 md:py-8">
      <div className={cn("flex min-h-dvh w-full max-w-[480px] flex-col bg-background md:min-h-[720px] md:rounded-[28px] md:border md:shadow-[0_12px_32px_rgba(30,34,41,.12)]", className)}>
        <header className="flex h-14 flex-none items-center justify-between border-b px-4">
          <div className="flex items-center gap-1">
            {voltar && <BotaoVoltar {...voltar} />}
            <Link href="/" aria-label="Trevolt, página inicial">
              <Logo />
            </Link>
          </div>
          {topo ?? (
            <div className="flex items-center gap-1">
              <Link href="/assistente" className="text-[13px] font-semibold text-primary underline underline-offset-4">
                Falar com uma pessoa
              </Link>
              <ContaLink />
            </div>
          )}
        </header>
        {passo && <PassoProgress {...passo} />}
        <main className="flex flex-1 flex-col gap-3 p-4">{children}</main>
        {acao && <div className="sticky bottom-0 flex flex-col gap-1 border-t bg-background px-4 py-3 md:rounded-b-[28px]">{acao}</div>}
      </div>
      {lateral && <aside className="hidden w-[320px] flex-none pt-14 lg:block">{lateral}</aside>}
    </div>
  );
}
