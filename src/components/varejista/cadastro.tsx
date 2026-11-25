"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { z } from "zod";
import { CircleCheck, LoaderCircle, Receipt, Scale, ShieldCheck, Trash2, Waypoints } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DemoBanner } from "@/components/trevolt/demo-banner";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { CabecalhoPasso, Marcador } from "@/components/varejista/marcador";
import { Campo, CampoTexto } from "@/components/varejista/campo";
import { CascaVarejista, linkCobre } from "@/components/varejista/casca";
import { api, ErroApi } from "@/lib/api";
import { cn } from "@/lib/utils";
import {
  SITUACOES_CCEE,
  UFS,
  VarejistaSchema,
  formatarCep,
  formatarCnpj,
  formatarTelefone,
  soDigitos,
  type CampoVarejista,
  type UF,
  type Varejista,
} from "@/lib/varejista";

type CampoTexto = Exclude<CampoVarejista, "ufs_atuacao" | "declaracao">;
type Form = Record<CampoTexto, string> & { ufs_atuacao: UF[]; declaracao: boolean };
type Erros = Partial<Record<string, string>>;

const VAZIO: Form = {
  razao_social: "", nome_fantasia: "", cnpj: "", inscricao_estadual: "", codigo_agente_ccee: "", situacao_ccee: "",
  ufs_atuacao: [], cep: "", logradouro: "", numero: "", complemento: "", bairro: "", cidade: "", uf: "",
  sac_telefone: "", sac_email: "", whatsapp: "", site: "", responsavel_nome: "", responsavel_cargo: "",
  responsavel_email: "", responsavel_telefone: "", encarregado_dados_nome: "", encarregado_dados_email: "", declaracao: false,
};

const CAMPOS_PASSO: Record<number, string[]> = {
  1: ["cnpj", "razao_social", "nome_fantasia", "codigo_agente_ccee", "situacao_ccee", "ufs_atuacao", "cep", "logradouro", "numero", "complemento", "bairro", "cidade", "uf", "sac_telefone", "sac_email"],
  2: ["responsavel_nome", "responsavel_cargo", "responsavel_email", "responsavel_telefone", "encarregado_dados_nome", "encarregado_dados_email"],
  3: ["declaracao"],
};

const ROTULOS = ["Empresa", "Responsáveis", "Contrato", "Credencial da CCEE", "Usuários"];
const PERFIS = ["Administrador", "Aprovador", "Somente leitura"] as const;
type Perfil = (typeof PERFIS)[number];
type Usuario = { email: string; perfil: Perfil };
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function paraForm(v: Varejista): Form {
  const campos = Object.fromEntries((Object.keys(VAZIO) as (keyof Form)[]).map((k) => [k, k === "declaracao" ? false : v[k]])) as Form;
  return { ...campos, cnpj: formatarCnpj(v.cnpj), cep: formatarCep(v.cep), sac_telefone: formatarTelefone(v.sac_telefone), whatsapp: formatarTelefone(v.whatsapp), responsavel_telefone: formatarTelefone(v.responsavel_telefone), declaracao: false };
}

function validarForm(form: Form): Erros {
  const r = VarejistaSchema.safeParse(form);
  if (r.success) return {};
  const f = z.flattenError(r.error).fieldErrors as Record<string, string[] | undefined>;
  return Object.fromEntries(Object.entries(f).map(([k, v]) => [k, v?.[0] ?? ""]));
}

const formatarCpf = (v: string) => {
  const d = soDigitos(v).slice(0, 11);
  return d.replace(/^(\d{3})(\d)/, "$1.$2").replace(/^(\d{3})\.(\d{3})(\d)/, "$1.$2.$3").replace(/\.(\d{3})(\d)/, ".$1-$2");
};

export function CadastroVarejista() {
  const router = useRouter();
  const [passo, setPasso] = useState(1);
  const [form, setForm] = useState<Form>(VAZIO);
  const [erros, setErros] = useState<Erros>({});
  const [erroGeral, setErroGeral] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [verContrato, setVerContrato] = useState(false);
  // Simulado (o schema real não cobre): CPF, administrador, credencial CCEE e usuários.
  const [cpf, setCpf] = useState("");
  const [mesmaPessoa, setMesmaPessoa] = useState(true);
  const [admin, setAdmin] = useState({ nome: "", email: "", celular: "" });
  const [ambiente, setAmbiente] = useState("sandbox");
  const [credId, setCredId] = useState("");
  const [segredo, setSegredo] = useState("");
  const [teste, setTeste] = useState<"parado" | "testando" | "ok">("parado");
  const [usuarios, setUsuarios] = useState<Usuario[]>([{ email: "", perfil: "Administrador" }, { email: "", perfil: "Aprovador" }, { email: "", perfil: "Somente leitura" }]);
  const titulo = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    api.varejista().then((v) => {
      if (v) {
        setForm(paraForm(v));
      }
    }).catch(() => {});
  }, []);

  useEffect(() => {
    titulo.current?.focus();
  }, [passo]);

  function atualizar<K extends keyof Form>(campo: K, valor: Form[K]) {
    setForm((f) => ({ ...f, [campo]: valor }));
    setErros((e) => (e[campo] ? { ...e, [campo]: undefined } : e));
  }
  function t(campo: CampoTexto, formatar?: (v: string) => string) {
    return {
      value: form[campo],
      onChange: (e: React.ChangeEvent<HTMLInputElement>) => atualizar(campo, formatar ? formatar(e.target.value) : e.target.value),
      erro: erros[campo],
    };
  }

  function mostrarErros(novos: Erros, ordem: string[]) {
    setErros(novos);
    const primeiro = ordem.find((c) => novos[c]);
    const alvo = primeiro === "ufs_atuacao" ? "uf-AC" : primeiro === "situacao_ccee" ? "situacao-habilitado" : primeiro;
    if (alvo) setTimeout(() => document.getElementById(alvo)?.focus(), 0);
    return !primeiro;
  }

  function validarPasso(n: number, simulados: Erros = {}) {
    const campos = CAMPOS_PASSO[n] ?? [];
    const todos = validarForm(form);
    const novos: Erros = { ...simulados };
    campos.forEach((c) => { if (todos[c]) novos[c] = todos[c]; });
    return mostrarErros(novos, [...campos, ...Object.keys(simulados)]);
  }

  function avancar() {
    setPasso((p) => p + 1);
    window.scrollTo({ top: 0 });
  }
  function voltar() {
    setErros({});
    setErroGeral(null);
    setPasso((p) => p - 1);
  }

  function continuar1(e: React.FormEvent) {
    e.preventDefault();
    if (validarPasso(1)) avancar();
  }

  function continuar2(e: React.FormEvent) {
    e.preventDefault();
    const sim: Erros = {};
    if (soDigitos(cpf).length !== 11) sim.cpf = "CPF com 11 dígitos";
    if (!mesmaPessoa) {
      if (admin.nome.trim().length < 3) sim.admin_nome = "Informe o nome do administrador";
      if (!EMAIL.test(admin.email.trim())) sim.admin_email = "E-mail inválido";
      if (!/^\d{10,11}$/.test(soDigitos(admin.celular))) sim.admin_celular = "Celular com DDD (10 ou 11 dígitos)";
    }
    if (validarPasso(2, sim)) {
      setUsuarios((u) => [{ email: mesmaPessoa ? form.responsavel_email : admin.email, perfil: "Administrador" }, ...u.slice(1)]);
      avancar();
    }
  }

  /** Salva de verdade em PUT /api/varejista ao aceitar o contrato (a declaração é o aceite do representante legal). */
  async function continuar3(e: React.FormEvent) {
    e.preventDefault();
    setErroGeral(null);
    const completo = { ...validarForm({ ...form, declaracao: form.declaracao }) };
    const r = VarejistaSchema.safeParse(form);
    if (!r.success) {
      const campoPasso = (c: string) => Object.entries(CAMPOS_PASSO).find(([, l]) => l.includes(c))?.[0];
      const fora = Object.keys(completo).find((c) => completo[c] && campoPasso(c) !== "3");
      if (fora) {
        setErros(completo);
        setPasso(Number(campoPasso(fora)));
        setErroGeral("Revise os campos destacados antes de aceitar o contrato.");
        return;
      }
      mostrarErros(completo, ["declaracao"]);
      return;
    }
    setSalvando(true);
    try {
      await api.salvarVarejista(r.data);
      avancar();
    } catch (err) {
      setErroGeral((err as Error).message);
      if (err instanceof ErroApi) {
        const campos = err.campos as Record<string, string[] | undefined>;
        setErros(Object.fromEntries(Object.entries(campos).map(([k, v]) => [k, v?.[0] ?? ""])));
      }
    } finally {
      setSalvando(false);
    }
  }

  function testar() {
    const sim: Erros = {};
    if (credId.trim().length < 3) sim.cred_id = "Informe o identificador da credencial";
    if (segredo.length < 6) sim.segredo = "Informe o segredo da credencial";
    if (!mostrarErros(sim, ["cred_id", "segredo"])) return;
    setTeste("testando");
    setTimeout(() => setTeste("ok"), 900);
  }

  function continuar4(e: React.FormEvent) {
    e.preventDefault();
    if (teste !== "ok") {
      setErros({ teste: "Teste a conexão antes de continuar" });
      return;
    }
    avancar();
  }

  function concluir(e: React.FormEvent) {
    e.preventDefault();
    const sim: Erros = {};
    usuarios.forEach((u, i) => { if ((i === 0 || u.email.trim()) && !EMAIL.test(u.email.trim())) sim[`usuario_${i}`] = "E-mail inválido"; });
    if (mostrarErros(sim, usuarios.map((_, i) => `usuario_${i}`))) router.push("/varejista/analise");
  }

  const sel = "gap-4 rounded-xl border-2 border-primary p-7 shadow-none";
  const cartao = "gap-3.5 rounded-xl p-6 shadow-none";
  const interno = "flex flex-col gap-3 rounded-xl border bg-background p-4";
  const botao = "min-h-12 px-7";
  const rotuloL = "text-xs font-semibold text-muted-foreground";
  const acoes = (continuarRotulo = "Continuar", comVoltar = true) => (
    <div className={cn("flex gap-3 pt-1", comVoltar ? "justify-between" : "justify-end")}>
      {comVoltar && <Button type="button" variant="outline" className="min-h-12 bg-card" onClick={voltar}>Voltar</Button>}
      <Button type="submit" disabled={salvando} className={botao}>
        {salvando && <LoaderCircle className="animate-spin" />}
        {continuarRotulo}
      </Button>
    </div>
  );
  const estadoDe = (i: number): "feito" | "atual" | "pendente" => (i + 1 < passo ? "feito" : i + 1 === passo ? "atual" : "pendente");

  const barra = (
    <ol aria-label="Etapas do cadastro" className="flex flex-wrap gap-x-7 gap-y-3 border-b bg-card px-4 py-4 md:px-6">
      {ROTULOS.map((r, i) => (
        <li key={r} aria-current={i + 1 === passo ? "step" : undefined} className={cn("flex items-center gap-2 text-[13px]", estadoDe(i) === "pendente" ? "text-muted-foreground" : i + 1 === passo ? "font-bold" : "font-semibold")}>
          <Marcador estado={estadoDe(i)} />
          <span>{i + 1} · {r}</span>
        </li>
      ))}
    </ol>
  );

  return (
    <CascaVarejista
      area="Cadastro de varejista"
      barra={barra}
      largura={passo === 1 || passo === 2 ? "max-w-[620px]" : "max-w-[560px]"}
      direita={
        passo >= 3 && form.nome_fantasia ? (
          <span>{form.nome_fantasia} · rascunho salvo</span>
        ) : (
          <span>Já tem conta? <Link href="/varejista/entrar" className={linkCobre}>Entrar</Link></span>
        )
      }
    >
      <div className="flex flex-col gap-5">
        {passo === 1 && (
          <Card className={sel}>
            <form noValidate onSubmit={continuar1} className="flex flex-col gap-4">
              <CabecalhoPasso h2Ref={titulo} eyebrow="Passo 1" titulo="Dados da empresa" descricao="Comece pelo CNPJ. O restante vem preenchido." />
              <CampoTexto id="cnpj" rotulo="CNPJ" {...t("cnpj", formatarCnpj)} placeholder="00.000.000/0000-00" autoCapitalize="characters" inputMode="text" />
              <div className="flex flex-wrap gap-4">
                <CampoTexto id="razao_social" rotulo="Razão social" {...t("razao_social")} placeholder="Preenchida pelo CNPJ" autoComplete="organization" campoClassName="flex-[1_1_200px]" />
                <CampoTexto id="nome_fantasia" rotulo="Nome fantasia" {...t("nome_fantasia")} placeholder="Como aparece para o consumidor" campoClassName="flex-[1_1_200px]" />
              </div>
              <CampoTexto id="codigo_agente_ccee" rotulo="Sigla do agente varejista na CCEE" {...t("codigo_agente_ccee", (v) => v.replace(/\D/g, "").slice(0, 10))} inputMode="numeric" placeholder="Código do agente, só números" />
              <div role="note" className="rounded-xl border border-[#e3cc98] bg-warning-tinta px-3 py-2.5 text-[13px] leading-snug text-[#6b4400]">
                <b className="text-warning">Habilitação:</b> conferimos a sua sigla na relação de varejistas habilitados da CCEE. Sem habilitação ativa, o cadastro não avança.
              </div>

              <fieldset className="flex flex-col gap-1" aria-describedby={erros.situacao_ccee ? "situacao_ccee-ajuda" : undefined}>
                <legend className={cn(rotuloL, "mb-1")}>Situação na CCEE</legend>
                <RadioGroup value={form.situacao_ccee} onValueChange={(v) => atualizar("situacao_ccee", v)} className="gap-2">
                  {(Object.keys(SITUACOES_CCEE) as (keyof typeof SITUACOES_CCEE)[]).map((s) => (
                    <Label key={s} htmlFor={`situacao-${s}`} className={cn("min-h-11 cursor-pointer rounded-md border bg-card p-3 font-normal", form.situacao_ccee === s && "border-primary", erros.situacao_ccee && "border-destructive")}>
                      <RadioGroupItem id={`situacao-${s}`} value={s} />
                      {SITUACOES_CCEE[s]}
                    </Label>
                  ))}
                </RadioGroup>
                {erros.situacao_ccee && <p id="situacao_ccee-ajuda" role="alert" className="text-xs text-destructive">{erros.situacao_ccee}</p>}
              </fieldset>

              <fieldset className="flex flex-col gap-1" aria-describedby="ufs_atuacao-ajuda">
                <legend className={cn(rotuloL, "mb-1")}>Estados onde vende energia</legend>
                <div className="grid grid-cols-4 gap-x-2 sm:grid-cols-6">
                  {UFS.map((uf) => (
                    <Label key={uf} htmlFor={`uf-${uf}`} className="min-h-9 cursor-pointer text-[13px] font-normal">
                      <Checkbox id={`uf-${uf}`} checked={form.ufs_atuacao.includes(uf)} aria-invalid={erros.ufs_atuacao ? true : undefined} onCheckedChange={(m) => atualizar("ufs_atuacao", m ? UFS.filter((u) => u === uf || form.ufs_atuacao.includes(u)) : form.ufs_atuacao.filter((u) => u !== uf))} />
                      {uf}
                    </Label>
                  ))}
                </div>
                <p id="ufs_atuacao-ajuda" role={erros.ufs_atuacao ? "alert" : undefined} className={cn("text-xs", erros.ufs_atuacao ? "text-destructive" : "text-muted-foreground")}>{erros.ufs_atuacao ?? `${form.ufs_atuacao.length} selecionado(s)`}</p>
              </fieldset>

              <div className={interno}>
                <b className="text-sm">Sede e atendimento</b>
                <div className="grid gap-3 sm:grid-cols-2">
                  <CampoTexto id="cep" rotulo="CEP" {...t("cep", formatarCep)} inputMode="numeric" autoComplete="postal-code" placeholder="00000-000" />
                  <Campo id="uf" rotulo="UF" erro={erros.uf}>
                    <Select value={form.uf} onValueChange={(v) => atualizar("uf", v)} name="uf">
                      <SelectTrigger id="uf" className="h-11 w-full bg-card" aria-invalid={erros.uf ? true : undefined} aria-describedby={erros.uf ? "uf-ajuda" : undefined}><SelectValue placeholder="Selecione" /></SelectTrigger>
                      <SelectContent>{UFS.map((u) => <SelectItem key={u} value={u}>{u}</SelectItem>)}</SelectContent>
                    </Select>
                  </Campo>
                  <CampoTexto id="logradouro" rotulo="Logradouro" {...t("logradouro")} autoComplete="address-line1" campoClassName="sm:col-span-2" />
                  <CampoTexto id="numero" rotulo="Número" {...t("numero")} />
                  <CampoTexto id="complemento" rotulo="Complemento" opcional {...t("complemento")} autoComplete="address-line2" />
                  <CampoTexto id="bairro" rotulo="Bairro" {...t("bairro")} />
                  <CampoTexto id="cidade" rotulo="Cidade" {...t("cidade")} autoComplete="address-level2" />
                  <CampoTexto id="sac_telefone" rotulo="Telefone de atendimento" {...t("sac_telefone", formatarTelefone)} type="tel" inputMode="tel" placeholder="(00) 0000-0000" />
                  <CampoTexto id="sac_email" rotulo="E-mail de atendimento" {...t("sac_email")} type="email" inputMode="email" placeholder="atendimento@varejista.com.br" />
                </div>
              </div>
              <div className="flex justify-end">
                <Button type="submit" className={botao}>Continuar</Button>
              </div>
            </form>
          </Card>
        )}

        {passo === 2 && (
          <Card className={sel}>
            <form noValidate onSubmit={continuar2} className="flex flex-col gap-4">
              <CabecalhoPasso h2Ref={titulo} eyebrow="Passo 2" titulo="Responsáveis" descricao="Quem responde pela empresa e quem administra o console." />
              <div className={interno}>
                <b className="text-sm">Representante legal</b>
                <CampoTexto id="responsavel_nome" rotulo="Nome completo" {...t("responsavel_nome")} placeholder="Nome" autoComplete="name" />
                <CampoTexto id="cpf" rotulo="CPF" value={cpf} onChange={(e) => { setCpf(formatarCpf(e.target.value)); setErros((x) => ({ ...x, cpf: undefined })); }} erro={erros.cpf} inputMode="numeric" placeholder="000.000.000-00" />
                <CampoTexto id="responsavel_email" rotulo="E-mail corporativo" {...t("responsavel_email")} type="email" inputMode="email" autoComplete="email" placeholder="nome@varejista.com.br" />
                <CampoTexto id="responsavel_telefone" rotulo="Celular com DDD" {...t("responsavel_telefone", formatarTelefone)} type="tel" inputMode="tel" autoComplete="tel" placeholder="(00) 00000-0000" />
              </div>
              <div className={interno}>
                <b className="text-sm">Administrador do console</b>
                <Label htmlFor="mesma" className="min-h-12 text-[13px] font-normal">
                  <Checkbox id="mesma" checked={mesmaPessoa} onCheckedChange={(m) => setMesmaPessoa(m === true)} />
                  É a mesma pessoa do representante legal
                </Label>
                <CampoTexto id="admin_nome" rotulo="Nome completo" placeholder="Nome" disabled={mesmaPessoa} value={mesmaPessoa ? form.responsavel_nome : admin.nome} onChange={(e) => setAdmin({ ...admin, nome: e.target.value })} erro={erros.admin_nome} />
                <CampoTexto id="admin_email" rotulo="E-mail corporativo" type="email" inputMode="email" placeholder="nome@varejista.com.br" disabled={mesmaPessoa} value={mesmaPessoa ? form.responsavel_email : admin.email} onChange={(e) => setAdmin({ ...admin, email: e.target.value })} erro={erros.admin_email} />
                <CampoTexto id="admin_celular" rotulo="Celular com DDD" type="tel" inputMode="tel" placeholder="(00) 00000-0000" disabled={mesmaPessoa} value={mesmaPessoa ? form.responsavel_telefone : admin.celular} onChange={(e) => setAdmin({ ...admin, celular: formatarTelefone(e.target.value) })} erro={erros.admin_celular} />
              </div>
              <div className={interno}>
                <b className="text-sm">Encarregado de dados (LGPD)</b>
                <CampoTexto id="encarregado_dados_nome" rotulo="Nome completo" {...t("encarregado_dados_nome")} placeholder="Nome" />
                <CampoTexto id="encarregado_dados_email" rotulo="E-mail corporativo" {...t("encarregado_dados_email")} type="email" inputMode="email" placeholder="nome@varejista.com.br" />
              </div>
              <p className="text-xs leading-normal text-muted-foreground">Use e-mails corporativos. O representante legal responde perante a CCEE pelos dados e poderes enviados.</p>
              {acoes()}
            </form>
          </Card>
        )}

        {passo === 3 && (
          <Card className={cartao}>
            <form noValidate onSubmit={continuar3} className="flex flex-col gap-3.5">
              <CabecalhoPasso h2Ref={titulo} tamanho="text-2xl" eyebrow="Passo 3" titulo="Contrato com a Trevolt" descricao="Resumo do que você está aceitando." />
              <ul className={cn(interno, "gap-2.5")}>
                {[
                  { I: Receipt, r: "Cobrança", x: "taxa por migração efetivada e mantida, igual para todos os varejistas. Valor e prazo no contrato." },
                  { I: Waypoints, r: "Atribuição por UC", x: "a unidade atendida pelo fluxo fica atribuída ao varejista pelo prazo do contrato, mesmo que o fechamento ocorra fora dele." },
                  { I: Scale, r: "Ranking neutro", x: "ofertas ordenadas pela economia líquida. Ninguém paga por posição." },
                  { I: ShieldCheck, r: "Dados (LGPD)", x: "a Trevolt é controladora até o aceite do consumidor e operadora do varejista depois." },
                ].map(({ I, r, x }) => (
                  <li key={r} className="flex items-start gap-2.5 text-[13px] leading-snug">
                    <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-accent"><I className="size-3 text-cobre" aria-hidden="true" /></span>
                    <span><b>{r}:</b> {x}</span>
                  </li>
                ))}
              </ul>
              <button type="button" onClick={() => setVerContrato(true)} className={cn(linkCobre, "self-start text-sm")}>Ler o contrato completo (PDF)</button>
              {verContrato && <p role="status" className="text-xs text-muted-foreground">O PDF do contrato não está disponível na demonstração.</p>}
              <div className="flex flex-col gap-1">
                <Label htmlFor="declaracao" className="items-start text-[13px] leading-snug font-normal">
                  <Checkbox id="declaracao" checked={form.declaracao} onCheckedChange={(m) => atualizar("declaracao", m === true)} aria-invalid={erros.declaracao ? true : undefined} aria-describedby={erros.declaracao ? "declaracao-ajuda" : undefined} className="mt-0.5" />
                  Li e aceito o contrato com a Trevolt. Quem aceita é o representante legal.
                </Label>
                {erros.declaracao && <p id="declaracao-ajuda" role="alert" className="text-xs text-destructive">{erros.declaracao}</p>}
              </div>
              {erroGeral && <p role="alert" className="text-sm text-destructive">{erroGeral}</p>}
              {acoes("Continuar", false)}
            </form>
          </Card>
        )}

        {passo === 4 && (
          <Card className={cartao}>
            <form noValidate onSubmit={continuar4} className="flex flex-col gap-3.5">
              <CabecalhoPasso h2Ref={titulo} tamanho="text-2xl" eyebrow="Passo 4" titulo="Credencial da API da CCEE" descricao="Para solicitar o CCV e a migração em seu nome." />
              <Badge variant="outline" className="self-start border-dashed border-primary text-cobre">Mock nesta demo</Badge>
              <div role="note" className="rounded-xl border border-[#e3cc98] bg-warning-tinta px-3 py-2.5 text-[13px] leading-snug text-[#6b4400]">
                <b className="text-warning">Pacote de terceiro:</b> a Trevolt usa a credencial do seu agente para chamar as APIs da CCEE em seu nome. Guardamos num cofre só seu e só chamamos depois da aprovação de um usuário seu.
              </div>
              <Campo id="ambiente" rotulo="Ambiente">
                <Select value={ambiente} onValueChange={(v) => { setAmbiente(v); setTeste("parado"); }}>
                  <SelectTrigger id="ambiente" className="h-11 w-full bg-card"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sandbox">Sandbox da CCEE</SelectItem>
                    <SelectItem value="producao">Produção</SelectItem>
                  </SelectContent>
                </Select>
              </Campo>
              <CampoTexto id="cred_id" rotulo="Identificador da credencial" placeholder="Cole aqui" value={credId} onChange={(e) => { setCredId(e.target.value); setTeste("parado"); }} erro={erros.cred_id} autoComplete="off" />
              <CampoTexto id="segredo" rotulo="Segredo" type="password" placeholder="Cole aqui" value={segredo} onChange={(e) => { setSegredo(e.target.value); setTeste("parado"); }} erro={erros.segredo} autoComplete="off" />
              <div className="flex flex-wrap items-center gap-2.5">
                <Button type="button" variant="outline" className="min-h-12 bg-card" onClick={testar} disabled={teste === "testando"}>
                  {teste === "testando" && <LoaderCircle className="animate-spin" />}
                  Testar conexão
                </Button>
                {teste === "ok" && <Badge variant="escuro" role="status"><CircleCheck /> Conexão testada (mock)</Badge>}
                {erros.teste && <span role="alert" className="text-sm text-destructive">{erros.teste}</span>}
              </div>
              <p className="text-xs leading-normal text-muted-foreground">Falta confirmar se a CCEE emite a credencial por agente ou por usuário.</p>
              {acoes()}
            </form>
          </Card>
        )}

        {passo === 5 && (
          <Card className={cartao}>
            <form noValidate onSubmit={concluir} className="flex flex-col gap-3.5">
              <CabecalhoPasso h2Ref={titulo} tamanho="text-2xl" eyebrow="Passo 5" titulo="Usuários do console" descricao="Quem aprova e quem só acompanha." />
              {usuarios.map((u, i) => (
                <div key={i} className="flex flex-wrap items-start gap-2">
                  <CampoTexto id={`usuario_${i}`} rotulo="E-mail" type="email" inputMode="email" placeholder="novo@varejista.com.br" readOnly={i === 0} value={u.email} erro={erros[`usuario_${i}`]} campoClassName="flex-[2_1_180px]" onChange={(e) => setUsuarios(usuarios.map((x, j) => (j === i ? { ...x, email: e.target.value } : x)))} />
                  <Campo id={`perfil_${i}`} rotulo="Perfil" className="flex-[1_1_140px]">
                    <Select value={u.perfil} onValueChange={(v) => setUsuarios(usuarios.map((x, j) => (j === i ? { ...x, perfil: v as Perfil } : x)))}>
                      <SelectTrigger id={`perfil_${i}`} className="h-11 w-full bg-card"><SelectValue /></SelectTrigger>
                      <SelectContent>{PERFIS.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
                    </Select>
                  </Campo>
                  {i > 2 && (
                    <Button type="button" variant="ghost" size="icon" aria-label={`Remover usuário ${i + 1}`} className="mt-5" onClick={() => setUsuarios(usuarios.filter((_, j) => j !== i))}><Trash2 /></Button>
                  )}
                </div>
              ))}
              <Button type="button" variant="outline" className="self-start bg-card" onClick={() => setUsuarios([...usuarios, { email: "", perfil: "Somente leitura" }])}>Adicionar usuário</Button>
              <div className="rounded-xl border bg-background p-4 text-xs leading-normal">
                <b>Aprovador</b> executa os atos no console. <b>Administrador</b> também gerencia usuários e a credencial. Só usuários do varejista aprovam. A ETEG não aprova nem acessa a credencial.
              </div>
              {acoes("Enviar convites e concluir")}
            </form>
          </Card>
        )}

        {passo >= 4 && <DemoBanner>{passo === 4 ? "A credencial da CCEE é simulada nesta demonstração." : "O envio de convites é simulado nesta demonstração."}</DemoBanner>}
      </div>
    </CascaVarejista>
  );
}
