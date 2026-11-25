"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";

const CLS = "-ml-2 flex size-11 flex-none items-center justify-center rounded-md text-foreground hover:bg-secondary";

/**
 * Seta de voltar do cabeçalho. Com `historico`, volta para a tela anterior (como o botão do navegador);
 * se a página foi aberta direto, sem tela anterior, vai para `href`. Sem `historico`, vai sempre para `href`.
 */
export function BotaoVoltar({ href = "/", historico = false, rotulo = "Voltar" }: { href?: string; historico?: boolean; rotulo?: string }) {
  const router = useRouter();
  const icone = <ArrowLeft className="size-5" aria-hidden="true" />;
  if (!historico) {
    return (
      <Link href={href} aria-label={rotulo} title={rotulo} className={CLS}>
        {icone}
      </Link>
    );
  }
  return (
    <button type="button" aria-label={rotulo} title={rotulo} className={CLS} onClick={() => (window.history.length > 1 ? router.back() : router.push(href))}>
      {icone}
    </button>
  );
}
