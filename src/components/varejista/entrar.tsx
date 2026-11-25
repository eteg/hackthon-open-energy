"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CircleCheck } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { DemoBanner } from "@/components/trevolt/demo-banner";
import { Campo, CampoTexto } from "@/components/varejista/campo";
import { CascaVarejista, linkCobre } from "@/components/varejista/casca";
import { CabecalhoPasso } from "@/components/varejista/marcador";
import { useSessao } from "@/lib/auth-mock";

type Tela = "entrar" | "recuperar";
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function EntrarVarejista() {
  const router = useRouter();
  const { entrar: entrarMock } = useSessao();
  const [tela, setTela] = useState<Tela>("entrar");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [mostrar, setMostrar] = useState(false);
  const [enviado, setEnviado] = useState(false);
  const [erros, setErros] = useState<Partial<Record<"email" | "senha", string>>>({});
  const titulo = useRef<HTMLHeadingElement>(null);

  function ir(t: Tela) {
    setTela(t);
    setEnviado(false);
    setErros({});
    setTimeout(() => titulo.current?.focus(), 0);
  }

  function emailOk() {
    if (EMAIL.test(email.trim())) return true;
    setErros({ email: "Informe um e-mail corporativo válido" });
    document.getElementById("email")?.focus();
    return false;
  }

  function entrar(e: React.FormEvent) {
    e.preventDefault();
    if (!emailOk()) return;
    if (!senha) {
      setErros({ senha: "Informe a senha" });
      document.getElementById("senha")?.focus();
      return;
    }
    if (!entrarMock(email, senha, "varejista")) {
      setErros({ senha: "E-mail ou senha incorretos" });
      document.getElementById("senha")?.focus();
      return;
    }
    router.push("/console");
  }

  function recuperar(e: React.FormEvent) {
    e.preventDefault();
    if (emailOk()) setEnviado(true);
  }

  return (
    <CascaVarejista area="Console do varejista" direita={<Link href="/assistente" className={linkCobre}>Precisa de ajuda?</Link>}>
      <div className="flex flex-col gap-6">
        <div>
          <h1 className="max-w-[560px] text-[clamp(28px,5vw,40px)] leading-[1.1]">Entre para aprovar e acompanhar os seus casos.</h1>
          <p className="mt-2.5 font-display text-lg font-semibold text-cobre">Energia do jeito combinado.</p>
        </div>

        <Card className="w-full max-w-[440px] gap-4 rounded-xl border-2 border-primary p-7 shadow-none">
          {tela === "entrar" && (
            <form noValidate onSubmit={entrar} className="flex flex-col gap-4">
              <CabecalhoPasso h2Ref={titulo} eyebrow="1 · Entrar" titulo="Acesso do varejista" descricao="Use o e-mail corporativo que recebeu o convite." />
              <CampoTexto id="email" rotulo="E-mail corporativo" type="email" inputMode="email" autoComplete="username" placeholder="nome@varejista.com.br" value={email} onChange={(e) => setEmail(e.target.value)} erro={erros.email} />
              <Campo
                id="senha"
                rotulo="Senha"
                erro={erros.senha}
              >
                <div className="relative">
                  <Input id="senha" name="senha" type={mostrar ? "text" : "password"} autoComplete="current-password" value={senha} onChange={(e) => setSenha(e.target.value)} aria-invalid={erros.senha ? true : undefined} aria-describedby={erros.senha ? "senha-ajuda" : undefined} className="h-11 bg-card pr-20 md:text-[15px]" />
                  <button type="button" onClick={() => setMostrar((m) => !m)} aria-pressed={mostrar} className="absolute top-1/2 right-3 -translate-y-1/2 text-xs font-semibold text-cobre">
                    {mostrar ? "Ocultar" : "Mostrar"}
                  </button>
                </div>
              </Campo>
              <button type="button" onClick={() => ir("recuperar")} className={`${linkCobre} -mt-2 self-start text-xs`}>Esqueci a senha</button>
              <Button type="submit" className="min-h-12">Entrar</Button>
              <div className="flex items-center gap-2.5 text-xs text-muted-foreground"><Separator className="flex-1" />ou<Separator className="flex-1" /></div>
              <Button type="button" variant="outline" className="min-h-12 bg-card" onClick={() => setErros({ email: "O login único da ETEG não está disponível na demonstração. Entre com e-mail e senha." })}>Equipe ETEG: entrar com SSO</Button>
              <p className="text-center text-sm text-muted-foreground">Ainda não é parceiro? <Link href="/varejista/cadastro" className={linkCobre}>Solicitar cadastro</Link></p>
            </form>
          )}

          {tela === "recuperar" && (
            <form noValidate onSubmit={recuperar} className="flex flex-col gap-4">
              <CabecalhoPasso h2Ref={titulo} eyebrow="2 · Recuperar senha" titulo="Esqueceu a senha?" descricao="Enviamos um link para redefinir." />
              <CampoTexto id="email" rotulo="E-mail corporativo" type="email" inputMode="email" autoComplete="username" placeholder="nome@varejista.com.br" value={email} onChange={(e) => setEmail(e.target.value)} erro={erros.email} />
              <Button type="submit" className="min-h-12">Enviar link de recuperação</Button>
              {enviado && (
                <Alert variant="success" role="status"><CircleCheck /><AlertDescription>Se {email} estiver cadastrado, o link chega em instantes.</AlertDescription></Alert>
              )}
              <div className="rounded-xl border bg-background p-4 text-[13px] leading-normal">
                <b>Por segurança,</b> a resposta é a mesma exista ou não a conta. Se o e-mail estiver cadastrado, o link chega em instantes.
              </div>
              <button type="button" onClick={() => ir("entrar")} className={`${linkCobre} self-start text-sm`}>← Voltar para entrar</button>
            </form>
          )}
        </Card>

        <DemoBanner className="max-w-[440px]">Login de teste, validado no navegador; a recuperação de senha é simulada.</DemoBanner>
      </div>
    </CascaVarejista>
  );
}
