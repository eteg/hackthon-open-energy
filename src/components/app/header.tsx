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
      <div className="mx-auto flex h-14 max-w-6xl items-center gap-6 px-4">
        <Link href="/" className="flex items-center gap-2 font-semibold">
          <span className="flex size-7 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <Zap className="size-4" />
          </span>
          Copiloto de Migração
        </Link>
        <nav className="flex gap-1 text-sm">
          {LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={cn(
                "rounded-md px-3 py-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground",
                pathname.startsWith(l.href) && "bg-accent font-medium text-foreground"
              )}
            >
              {l.label}
            </Link>
          ))}
        </nav>
        <span className="ml-auto hidden rounded-md border px-2 py-0.5 text-xs text-muted-foreground sm:inline">
          Dados sintéticos
        </span>
      </div>
    </header>
  );
}
