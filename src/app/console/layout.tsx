import { Suspense } from "react";
import { CabecalhoConsole } from "@/components/console/cabecalho";
import { GuardaVarejista } from "@/components/trevolt/guarda-varejista";

export default function ConsoleLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh bg-background">
      {/* O cabeçalho lê o caminho da URL (dado de requisição): dentro de <Suspense> para a rota poder ser pré-renderizada. */}
      <Suspense fallback={<div className="cabecalho-escuro h-[61px]" aria-hidden="true" />}>
        <CabecalhoConsole />
      </Suspense>
      <GuardaVarejista>{children}</GuardaVarejista>
    </div>
  );
}
