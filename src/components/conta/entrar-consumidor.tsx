"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { SiteShell } from "@/components/trevolt/site-shell";
import { DemoBanner } from "@/components/trevolt/demo-banner";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useSessao } from "@/lib/sessao";
import { useCasoDemo, type CasoDemo } from "@/lib/demo/store";

/** Onde o caso em andamento continua (o login é opcional: sem caso, o consumidor começa pela fatura). */
function rotaDoCaso(c: CasoDemo): string {
  switch (c.etapa) {
    case "fatura": return "/fatura";
    case "conferencia": return "/fatura/conferir";
    case "conta": return "/conta";
    case "ofertas": return "/ofertas";
    case "recibo": return c.ofertaId ? `/ofertas/${c.ofertaId}` : "/ofertas";
    case "ciencia": return "/ciencia";
    case "aceite": return "/aceite";
    case "ccv_aguardando":
    case "distribuidora_validando":
    case "em_vigor": return `/caso/${c.id}`;
    default: return "/";
  }
}

export function EntrarConsumidor() {
  const router = useRouter();
  const { entrar } = useSessao();
  const { caso } = useCasoDemo();
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    if (enviando) return;
    setEnviando(true);
    try {
      const s = await entrar(email, senha);
      if (!s) {
        setErro("E-mail ou senha incorretos. Confira e tente de novo.");
        return;
      }
      // O fornecedor que entra por aqui vai para o console; o consumidor continua o caso.
      router.push(s.perfil === "varejista" ? "/console" : rotaDoCaso(caso));
    } catch (falha) {
      setErro(falha instanceof Error ? falha.message : "Não consegui entrar agora. Tente de novo.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <SiteShell
      topo={<span />}
      voltar={{ href: "/", historico: true }}
      acao={
        <>
          <Button size="lg" type="submit" form="form-entrar" disabled={enviando} aria-busy={enviando}>
            {enviando ? "Entrando…" : "Entrar"}
          </Button>
          <Link href="/assistente" className="flex min-h-11 items-center justify-center text-[13px] font-semibold text-primary underline underline-offset-4">
            Tirar uma dúvida com a Assistente Trevolt
          </Link>
        </>
      }
    >
      <div>
        <h1 className="text-[32px] leading-[1.08] font-extrabold">Entrar</h1>
        <p className="mt-2 text-[15px] leading-normal text-muted-foreground">
          Use o e-mail e a senha da sua conta. Entrar é opcional: você também pode enviar a fatura sem criar conta.
        </p>
      </div>
      <form id="form-entrar" noValidate onSubmit={enviar} className="flex flex-col gap-3">
        {erro && (
          <Alert variant="destructive" role="alert">
            <AlertDescription>{erro}</AlertDescription>
          </Alert>
        )}
        <div>
          <Label htmlFor="email" className="mb-1 text-xs font-semibold text-muted-foreground">E-mail</Label>
          <Input id="email" className="h-11" type="email" inputMode="email" autoComplete="username" placeholder="nome@empresa.com.br" value={email} onChange={(e) => { setEmail(e.target.value); setErro(null); }} aria-invalid={erro ? true : undefined} />
        </div>
        <div>
          <Label htmlFor="senha" className="mb-1 text-xs font-semibold text-muted-foreground">Senha</Label>
          <Input id="senha" className="h-11" type="password" autoComplete="current-password" value={senha} onChange={(e) => { setSenha(e.target.value); setErro(null); }} aria-invalid={erro ? true : undefined} />
        </div>
      </form>
      <div className="mt-auto flex flex-col gap-2">
        <DemoBanner>Ambiente de demonstração: use as contas de teste. Os dados são sintéticos.</DemoBanner>
        <p className="text-xs leading-normal text-muted-foreground">
          Ao entrar, você aceita os <span className="font-semibold text-primary underline">Termos de uso</span> e a{" "}
          <span className="font-semibold text-primary underline">Política de privacidade</span>.
        </p>
      </div>
    </SiteShell>
  );
}
