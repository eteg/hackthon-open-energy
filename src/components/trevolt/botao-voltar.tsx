"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { URL_LP, ehExterno } from "@/lib/links";

const CLS = "-ml-2 flex size-11 flex-none items-center justify-center rounded-full text-white hover:bg-white/10"; // fica no cabeçalho escuro

/**
 * Seta de voltar do cabeçalho. Com `historico`, volta para a tela anterior (como o botão do navegador);
 * se a página foi aberta direto, sem tela anterior, vai para `href`. Sem `historico`, vai sempre para `href`.
 * O padrão de `href` é a landing page, que é a home do produto.
 */
export function BotaoVoltar({ href = URL_LP, historico = false, rotulo = "Voltar" }: { href?: string; historico?: boolean; rotulo?: string }) {
  const router = useRouter();
  const icone = <ArrowLeft className="size-5" aria-hidden="true" />;
  if (!historico) {
    return (
      <Link href={href} aria-label={rotulo} title={rotulo} className={CLS}>
        {icone}
      </Link>
    );
  }
  const irPara = () => (ehExterno(href) ? window.location.assign(href) : router.push(href));
  return (
    <button type="button" aria-label={rotulo} title={rotulo} className={CLS} onClick={() => (window.history.length > 1 ? router.back() : irPara())}>
      {icone}
    </button>
  );
}
