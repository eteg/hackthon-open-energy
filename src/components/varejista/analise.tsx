"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, CircleCheck } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DemoBanner } from "@/components/trevolt/demo-banner";
import { CampoTexto } from "@/components/varejista/campo";
import { CascaVarejista, linkCobre } from "@/components/varejista/casca";
import { CabecalhoPasso, Marcador } from "@/components/varejista/marcador";

type Estado = "analise" | "pendencia" | "convite" | "aprovado";
const ESTADOS: Record<Estado, string> = {
  analise: "Em análise",
  pendencia: "Pendência",
  convite: "Primeiro acesso (convidado)",
  aprovado: "Aprovado",
};

const cartao = "gap-4 rounded-xl border-2 border-primary p-7 shadow-none";
const aviso = "rounded-xl border border-[#e3cc98] bg-warning-tinta px-3 py-2.5 text-[13px] leading-snug text-[#6b4400]";

function Linha({ estado, texto, fim, fimSuave }: { estado: "feito" | "atual" | "pendente"; texto: string; fim: string; fimSuave?: boolean }) {
  return (
    <li className="flex items-center gap-3 text-[13px]" aria-current={estado === "atual" ? "step" : undefined}>
      <Marcador estado={estado} />
      <span className="flex-1">{texto}</span>
      {fimSuave ? <span className="text-muted-foreground">{fim}</span> : <b>{fim}</b>}
    </li>
  );
}

function Analise() {
  return (
    <Card className={cartao}>
      <CabecalhoPasso eyebrow="Estado 1" titulo="Cadastro em análise" descricao="Estamos conferindo os seus dados com a ETEG e a CCEE." />
      <ul className="flex flex-col gap-3">
        <Linha estado="feito" texto="Dados da empresa e responsáveis" fim="Recebidos" />
        <Linha estado="feito" texto="Contrato aceito pelo representante legal" fim="Recebido" />
        <Linha estado="feito" texto="Credencial da CCEE testada (mock)" fim="Concluído" />
        <Linha estado="atual" texto="Habilitação na relação da CCEE" fim="Em conferência" />
        <Linha estado="pendente" texto="Convites aos usuários" fim="Depois da aprovação" fimSuave />
      </ul>
      <div className="rounded-xl border bg-background p-4 text-[13px] leading-normal">Avisamos por e-mail quando houver resposta. Você não precisa ficar nesta tela.</div>
      <Button asChild variant="outline" className="self-start bg-card"><Link href="/assistente">Falar com a equipe ETEG</Link></Button>
    </Card>
  );
}

function Pendencia({ aoReenviar }: { aoReenviar: () => void }) {
  const [sigla, setSigla] = useState("ALFA-VAR");
  const [erro, setErro] = useState<string>();
  function enviar(e: React.FormEvent) {
    e.preventDefault();
    if (sigla.trim().length < 2) {
      setErro("Informe a sigla do agente");
      return;
    }
    aoReenviar();
  }
  return (
    <Card className={cartao}>
      <form noValidate onSubmit={enviar} className="flex flex-col gap-4">
        <CabecalhoPasso eyebrow="Estado 2" titulo="Falta corrigir um dado" descricao="A conferência encontrou uma pendência." />
        <div role="alert" className={aviso}>
          <b className="text-warning">Não encontramos a sigla ALFA-VAR</b> na relação de varejistas habilitados da CCEE.
        </div>
        <p className="text-sm leading-normal text-muted-foreground">Confira a sigla ou a situação da habilitação. Enquanto o agente não estiver habilitado, não dá para ativar o console.</p>
        <CampoTexto id="sigla" rotulo="Sigla do agente varejista na CCEE" placeholder="Ex.: ALFA-VAR" value={sigla} onChange={(e) => { setSigla(e.target.value); setErro(undefined); }} erro={erro} />
        <div className="flex flex-wrap gap-2.5">
          <Button type="submit" className="min-h-12">Corrigir e reenviar</Button>
          <Button asChild variant="outline" className="min-h-12 bg-card"><Link href="/assistente">Falar com a equipe ETEG</Link></Button>
        </div>
      </form>
    </Card>
  );
}

function PrimeiroAcesso({ aoAtivar }: { aoAtivar: () => void }) {
  const [senha, setSenha] = useState("");
  const [repita, setRepita] = useState("");
  const [termos, setTermos] = useState(false);
  const [erros, setErros] = useState<Partial<Record<"senha" | "repita" | "termos", string>>>({});

  function enviar(e: React.FormEvent) {
    e.preventDefault();
    const n: typeof erros = {};
    if (senha.length < 12) n.senha = "Use ao menos 12 caracteres";
    if (repita !== senha) n.repita = "As senhas não são iguais";
    if (!termos) n.termos = "Aceite os termos para ativar o acesso";
    setErros(n);
    const primeiro = (["senha", "repita", "termos"] as const).find((c) => n[c]);
    if (primeiro) {
      document.getElementById(primeiro)?.focus();
      return;
    }
    aoAtivar();
  }

  return (
    <Card className={cartao}>
      <form noValidate onSubmit={enviar} className="flex flex-col gap-4">
        <CabecalhoPasso eyebrow="Estado 3 · Convidado" titulo="Primeiro acesso" descricao="Convite aceito. Defina a senha." />
        <div className="rounded-xl border bg-background p-4 text-[13px] leading-normal">
          <b>Marina Alves</b> convidou <b>paulo@fornecedoralfa.com.br</b> como <b>Aprovador</b> do Fornecedor Alfa.
        </div>
        <CampoTexto id="senha" rotulo="Crie uma senha" type="password" autoComplete="new-password" placeholder="Mínimo de 12 caracteres" value={senha} onChange={(e) => setSenha(e.target.value)} erro={erros.senha} />
        <CampoTexto id="repita" rotulo="Repita a senha" type="password" autoComplete="new-password" value={repita} onChange={(e) => setRepita(e.target.value)} erro={erros.repita} />
        <div className="flex flex-col gap-1">
          <Label htmlFor="termos" className="items-start text-[13px] leading-snug font-normal">
            <Checkbox id="termos" checked={termos} onCheckedChange={(m) => setTermos(m === true)} aria-invalid={erros.termos ? true : undefined} aria-describedby={erros.termos ? "termos-ajuda" : undefined} className="mt-0.5" />
            Aceito os Termos de uso do console e a Política de privacidade.
          </Label>
          {erros.termos && <p id="termos-ajuda" role="alert" className="text-xs text-destructive">{erros.termos}</p>}
        </div>
        <Button type="submit" className="min-h-12">Ativar acesso</Button>
      </form>
    </Card>
  );
}

export function AnaliseVarejista() {
  const [estado, setEstado] = useState<Estado>("analise");
  const [ativado, setAtivado] = useState(false);

  return (
    <CascaVarejista area="Cadastro de varejista" largura="max-w-[560px]" direita={<Link href="/assistente" className={linkCobre}>Precisa de ajuda?</Link>}>
      <div className="flex flex-col gap-5">
        {estado === "analise" && <Analise />}
        {estado === "pendencia" && <Pendencia aoReenviar={() => setEstado("analise")} />}
        {estado === "convite" && !ativado && <PrimeiroAcesso aoAtivar={() => setAtivado(true)} />}
        {((estado === "convite" && ativado) || estado === "aprovado") && (
          <Card className={cartao}>
            <CabecalhoPasso eyebrow={ativado ? "Estado 3 · Convidado" : "Aprovado"} titulo={ativado ? "Acesso ativado" : "Cadastro aprovado"} descricao={ativado ? "Senha definida. Já dá para entrar no console." : "A habilitação foi conferida. O console está liberado."} />
            <Alert variant="success"><CircleCheck /><AlertDescription>Os convites aos usuários seguem o perfil definido no cadastro.</AlertDescription></Alert>
            <Button asChild className="min-h-12"><Link href="/console">Ir para o console <ArrowRight /></Link></Button>
          </Card>
        )}

        <DemoBanner>A conferência da habilitação é manual no hackathon e os estados desta tela são simulados.</DemoBanner>
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <Label htmlFor="estado-demo" className="text-xs font-normal">Estado simulado</Label>
          <Select value={estado} onValueChange={(v) => { setEstado(v as Estado); setAtivado(false); }}>
            <SelectTrigger id="estado-demo" size="sm" className="w-56"><SelectValue /></SelectTrigger>
            <SelectContent>{(Object.keys(ESTADOS) as Estado[]).map((e) => <SelectItem key={e} value={e}>{ESTADOS[e]}</SelectItem>)}</SelectContent>
          </Select>
        </div>
      </div>
    </CascaVarejista>
  );
}
