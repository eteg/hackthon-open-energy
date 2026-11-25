"use client";

import Link from "next/link";
import { LogIn, LogOut } from "lucide-react";
import { useSessao } from "@/lib/sessao";

/** Ícone do cabeçalho do site: "Entrar" (sem login) ou "Sair" (logado). Só renderiza depois de saber o estado. */
export function ContaLink() {
  const { sessao, sair } = useSessao();
  const cls = "flex size-11 items-center justify-center rounded-md text-foreground hover:bg-secondary";
  if (sessao === undefined) return <span className="size-11" aria-hidden="true" />;
  if (!sessao) {
    return (
      <Link href="/entrar" aria-label="Entrar" title="Entrar" className={cls}>
        <LogIn className="size-5" aria-hidden="true" />
      </Link>
    );
  }
  return (
    <button type="button" onClick={() => void sair()}aria-label={`Sair (${sessao.email})`} title={`Sair (${sessao.email})`} className={cls}>
      <LogOut className="size-5" aria-hidden="true" />
    </button>
  );
}
