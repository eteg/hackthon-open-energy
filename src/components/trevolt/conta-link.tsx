"use client";

import Link from "next/link";
import { LogIn, LogOut } from "lucide-react";
import { useSessao } from "@/lib/sessao";

/** Botão do cabeçalho do site: "Entrar" com ícone (sem login) ou ícone de "Sair" (logado). Só renderiza depois de saber o estado. */
export function ContaLink() {
  const { sessao, sair } = useSessao();
  const cls = "flex size-11 items-center justify-center rounded-md text-foreground hover:bg-secondary";
  if (sessao === undefined) return <span className="h-11 w-[92px]" aria-hidden="true" />;
  if (!sessao) {
    return (
      <Link href="/entrar" className="flex h-11 items-center gap-2 rounded-md px-3 text-[15px] font-semibold text-foreground hover:bg-secondary">
        <LogIn className="size-5" aria-hidden="true" />
        Entrar
      </Link>
    );
  }
  return (
    <button type="button" onClick={() => void sair()}aria-label={`Sair (${sessao.email})`} title={`Sair (${sessao.email})`} className={cls}>
      <LogOut className="size-5" aria-hidden="true" />
    </button>
  );
}
