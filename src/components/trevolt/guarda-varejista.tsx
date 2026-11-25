"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSessao } from "@/lib/sessao";

/** Só deixa passar quem entrou como fornecedor; os demais vão para o login. (Proteção de demonstração, no cliente.) */
export function GuardaVarejista({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { sessao } = useSessao();
  const liberado = sessao?.perfil === "varejista";
  useEffect(() => {
    if (sessao !== undefined && !liberado) router.replace("/varejista/entrar");
  }, [sessao, liberado, router]);
  if (!liberado) return <p role="status" className="py-16 text-center text-sm text-muted-foreground">Verificando o seu acesso…</p>;
  return <>{children}</>;
}
