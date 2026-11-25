"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Zap } from "lucide-react";
import { cn } from "@/lib/utils";

const LINKS = [
  { href: "/onboarding", label: "Onboarding" },
  { href: "/atendimento", label: "Atendimento" },
  { href: "/painel", label: "Painel do varejista" },
];

export function Header() {
  const pathname = usePathname();
  return (
    <header className="sticky top-0 z-10 border-b bg-background/95 backdrop-blur">
      {/* Celular: logo + selo na 1ª linha, menu rolável na 2ª. A partir de md: tudo numa linha. */}
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-6 px-4 md:h-14 md:flex-nowrap">
        <Link href="/" className="flex h-12 shrink-0 items-center gap-2 font-semibold md:h-auto">
          <span className="flex size-7 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <Zap className="size-4" />
          </span>
          Copiloto de Migração
        </Link>
        <span className="ml-auto shrink-0 rounded-md border px-2 py-0.5 text-xs text-muted-foreground md:order-last">
          Dados sintéticos
        </span>
        <nav className="-mx-4 flex w-[calc(100%+2rem)] gap-1 overflow-x-auto px-4 pb-2 text-sm md:mx-0 md:w-auto md:overflow-visible md:p-0">
          {LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={cn(
                "shrink-0 rounded-md px-2.5 py-1.5 whitespace-nowrap md:px-3 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground",
                pathname.startsWith(l.href) && "bg-accent font-medium text-foreground"
              )}
            >
              {l.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
