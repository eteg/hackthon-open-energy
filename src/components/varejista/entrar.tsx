"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { DemoBanner } from "@/components/trevolt/demo-banner";
import { Campo, CampoTexto } from "@/components/varejista/campo";
import { CascaVarejista, linkCobre } from "@/components/varejista/casca";
import { useSessao } from "@/lib/auth-mock";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Login do fornecedor: e-mail e senha (usuário de teste em `auth-mock`). Sem código, sem recuperação de senha. */
export function EntrarVarejista() {
  const router = useRouter();
  const { entrar: entrarMock } = useSessao();
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [mostrar, setMostrar] = useState(false);
  const [erros, setErros] = useState<Partial<Record<"email" | "senha", string>>>({});

  function entrar(e: React.FormEvent) {
    e.preventDefault();
    if (!EMAIL.test(email.trim())) {
      setErros({ email: "Informe um e-mail corporativo válido" });
      document.getElementById("email")?.focus();
      return;
    }
    if (!senha) {
      setErros({ senha: "Informe a senha" });
      document.getElementById("senha")?.focus();
      return;
    }
    if (!entrarMock(email, senha)) {
      setErros({ senha: "E-mail ou senha incorretos" });
      document.getElementById("senha")?.focus();
      return;
    }
    router.push("/console");
  }

  return (
    <CascaVarejista area="Console do varejista">
      <div className="flex flex-col gap-6">
        <div>
          <h1 className="max-w-[560px] text-[clamp(28px,5vw,40px)] leading-[1.1]">Entre para aprovar e acompanhar os seus casos.</h1>
          <p className="mt-2.5 font-display text-lg font-semibold text-cobre">Energia do jeito combinado.</p>
        </div>

        <Card className="w-full max-w-[440px] gap-4 rounded-xl border-2 border-primary p-7 shadow-none">
          <form noValidate onSubmit={entrar} className="flex flex-col gap-4">
            <div className="space-y-1">
              <p className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">Entrar</p>
              <h2 className="text-titulo">Acesso do varejista</h2>
              <p className="text-sm text-muted-foreground">Use o e-mail corporativo do fornecedor.</p>
            </div>
            <CampoTexto id="email" rotulo="E-mail corporativo" type="email" inputMode="email" autoComplete="username" placeholder="nome@varejista.com.br" value={email} onChange={(e) => { setEmail(e.target.value); setErros({}); }} erro={erros.email} />
            <Campo id="senha" rotulo="Senha" erro={erros.senha}>
              <div className="relative">
                <Input id="senha" name="senha" type={mostrar ? "text" : "password"} autoComplete="current-password" value={senha} onChange={(e) => { setSenha(e.target.value); setErros({}); }} aria-invalid={erros.senha ? true : undefined} aria-describedby={erros.senha ? "senha-ajuda" : undefined} className="h-11 bg-card pr-20 md:text-[15px]" />
                <button type="button" onClick={() => setMostrar((m) => !m)} aria-pressed={mostrar} className={`${linkCobre} absolute top-1/2 right-3 -translate-y-1/2 text-xs no-underline`}>
                  {mostrar ? "Ocultar" : "Mostrar"}
                </button>
              </div>
            </Campo>
            <Button type="submit" className="min-h-12">Entrar</Button>
          </form>
        </Card>

        <DemoBanner className="max-w-[440px]">Login de teste, validado no navegador. Nada é enviado de verdade.</DemoBanner>
      </div>
    </CascaVarejista>
  );
}
