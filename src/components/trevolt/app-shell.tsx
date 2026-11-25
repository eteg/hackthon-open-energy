"use client";

import { Suspense } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Logo } from "./logo";
import { URL_LP_FORNECEDORES } from "@/lib/links";
import { cn } from "@/lib/utils";

export type NavItem = { href: string; label: string };

const ITEM = "min-h-9 shrink-0 rounded-md px-3 py-2 text-sm font-semibold whitespace-nowrap text-muted-foreground hover:bg-secondary";

/** Menu com item ativo. Lê o caminho (dado de requisição), por isso vive dentro de <Suspense>. */
function NavAtiva({ area, nav }: { area: string; nav: NavItem[] }) {
  const pathname = usePathname();
  // Só o item de caminho mais específico fica ativo (ex.: /console/permissoes não acende /console).
  const ativo = nav
    .filter((n) => pathname === n.href || pathname.startsWith(n.href + "/"))
    .sort((a, b) => b.href.length - a.href.length)[0]?.href;
  return (
    <nav aria-label={area} className="flex gap-1 overflow-x-auto">
      {nav.map((n) => (
        <Link key={n.href} href={n.href} aria-current={ativo === n.href ? "page" : undefined} className={cn(ITEM, ativo === n.href && "bg-secondary text-foreground")}>
          {n.label}
        </Link>
      ))}
    </nav>
  );
}

/** Casca de desktop do console e do portal do fornecedor: barra superior com logo, área e navegação. */
export function AppShell({ area, nav, children, direita }: { area: string; nav: NavItem[]; children: React.ReactNode; direita?: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="flex flex-wrap items-center gap-x-6 gap-y-2 border-b bg-card px-4 py-3 md:px-6">
        <Link href={URL_LP_FORNECEDORES} aria-label="Trevolt para fornecedores, página inicial" className="flex items-center gap-3">
          <Logo />
          <span className="hidden text-sm text-muted-foreground sm:inline">{area}</span>
        </Link>
        <Suspense
          fallback={
            <nav aria-label={area} className="flex gap-1 overflow-x-auto">
              {nav.map((n) => (
                <Link key={n.href} href={n.href} className={ITEM}>
                  {n.label}
                </Link>
              ))}
            </nav>
          }
        >
          <NavAtiva area={area} nav={nav} />
        </Suspense>
        <div className="ml-auto">{direita}</div>
      </header>
      <main className="mx-auto w-full max-w-[1280px] flex-1 px-4 py-6 md:px-6">{children}</main>
      <footer className="border-t py-4 text-center text-xs text-muted-foreground">
        Uma plataforma ETEG · Dados 100% sintéticos · Economia é estimativa em faixa, nunca garantia
      </footer>
    </div>
  );
}
