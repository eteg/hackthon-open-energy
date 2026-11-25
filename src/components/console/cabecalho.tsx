import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Logo } from "@/components/trevolt/logo";
import { UsuarioConsole } from "@/components/trevolt/usuario-console";

/** Cabeçalho do console (prancha 10): logo + "para fornecedores" + Console; . */
export function CabecalhoConsole() {
  return (
    <header className="flex flex-wrap items-center justify-between gap-3 border-b bg-card px-4 py-3 md:px-6">
      <div className="flex flex-wrap items-center gap-x-3.5 gap-y-2">
        <Link href="/console" aria-label="Trevolt, console do fornecedor" className="inline-flex items-center gap-2">
          <Logo className="[&>span:last-child]:text-[23px]" />
          <span className="text-[13px] font-medium text-muted-foreground">para fornecedores</span>
        </Link>
        <Badge variant="outline">Console</Badge>
      </div>
      <UsuarioConsole />
    </header>
  );
}
