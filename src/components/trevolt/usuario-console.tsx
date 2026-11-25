"use client";

import { LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useSessao } from "@/lib/sessao";

/** Quem está logado no console e o botão Sair. */
export function UsuarioConsole() {
  const router = useRouter();
  const { sessao, sair } = useSessao();
  if (!sessao) return null;
  return (
    <div className="flex items-center gap-2 text-sm text-sobre-escuro">
      <span className="hidden sm:inline">{sessao.nome} · Fornecedor Alfa</span>
      <Button variant="ghost" size="sm" className="text-white hover:bg-white/10" onClick={() => void sair().finally(() => router.replace("/varejista/entrar"))}>
        <LogOut aria-hidden="true" /> Sair
      </Button>
    </div>
  );
}
