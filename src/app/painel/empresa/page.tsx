"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { z } from "zod";
import { ArrowLeft, Building2, CircleCheck, LoaderCircle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api, ErroApi } from "@/lib/api";
import { cn, formatarData } from "@/lib/utils";
import {
  SITUACOES_CCEE,
  UFS,
  VarejistaSchema,
  formatarCep,
  formatarCnpj,
  formatarTelefone,
  type CampoVarejista,
  type UF,
  type Varejista,
} from "@/lib/varejista";

type CampoTexto = Exclude<CampoVarejista, "ufs_atuacao" | "declaracao">;
type Form = Record<CampoTexto, string> & { ufs_atuacao: UF[]; declaracao: boolean };
type Erros = Partial<Record<CampoVarejista, string[]>>;

const VAZIO: Form = {
  razao_social: "",
  nome_fantasia: "",
  cnpj: "",
  inscricao_estadual: "",
  codigo_agente_ccee: "",
  situacao_ccee: "",
  ufs_atuacao: [],
  cep: "",
  logradouro: "",
  numero: "",
  complemento: "",
  bairro: "",
  cidade: "",
  uf: "",
  sac_telefone: "",
  sac_email: "",
  whatsapp: "",
  site: "",
  responsavel_nome: "",
  responsavel_cargo: "",
  responsavel_email: "",
  responsavel_telefone: "",
  encarregado_dados_nome: "",
  encarregado_dados_email: "",
  declaracao: false,
};

const DESCRICAO_SITUACAO: Record<keyof typeof SITUACOES_CCEE, string> = {
  habilitado: "Já pode representar consumidores na CCEE.",
  em_habilitacao: "O painel mostra o aviso até a habilitação sair.",
};

/** Cadastro salvo → valores do formulário, com máscaras. A declaração é refeita a cada salvamento. */
function paraForm(v: Varejista): Form {
  const campos = Object.fromEntries(
    (Object.keys(VAZIO) as (keyof Form)[]).map((k) => [k, k === "declaracao" ? false : v[k]])
  ) as Form;
  return {
    ...campos,
    cnpj: formatarCnpj(v.cnpj),
    cep: formatarCep(v.cep),
    sac_telefone: formatarTelefone(v.sac_telefone),
    whatsapp: formatarTelefone(v.whatsapp),
    responsavel_telefone: formatarTelefone(v.responsavel_telefone),
    declaracao: false,
  };
}

function validar(form: Form): Erros {
  const r = VarejistaSchema.safeParse(form);
  return r.success ? {} : z.flattenError(r.error).fieldErrors;
}

function Secao({ titulo, descricao, children }: { titulo: string; descricao: React.ReactNode; children: React.ReactNode }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{titulo}</CardTitle>
        <CardDescription>{descricao}</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4 sm:grid-cols-2">{children}</CardContent>
    </Card>
  );
}

function Campo({
  id,
  rotulo,
  erro,
  dica,
  opcional,
  className,
  children,
}: {
  id: string;
  rotulo: string;
  erro?: string[];
  dica?: string;
  opcional?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  const ajuda = erro?.[0] ?? dica;
  return (
    <div className={cn("space-y-1.5", className)}>
      <Label htmlFor={id}>
        {rotulo}
        {opcional && <span className="font-normal text-muted-foreground">(opcional)</span>}
      </Label>
      {children}
      {ajuda && (
        <p id={`${id}-ajuda`} className={cn("text-xs", erro ? "text-destructive" : "text-muted-foreground")}>
          {ajuda}
        </p>
      )}
    </div>
  );
}

export default function CadastroEmpresaPage() {
  const [form, setForm] = useState<Form>(VAZIO);
  const [erros, setErros] = useState<Erros>({});
  const [tentou, setTentou] = useState(false); // depois da 1ª tentativa, valida a cada mudança
  const [salvando, setSalvando] = useState(false);
  const [erroGeral, setErroGeral] = useState<string | null>(null);
  const [existente, setExistente] = useState<Varejista | null | undefined>(undefined);
  const [salvo, setSalvo] = useState<Varejista | null>(null);

  useEffect(() => {
    api
      .varejista()
      .then((v) => {
        setExistente(v);
        if (v) setForm(paraForm(v));
      })
      .catch(() => setExistente(null));
  }, []);

  function atualizar<K extends keyof Form>(campo: K, valor: Form[K]) {
    const novo = { ...form, [campo]: valor };
    setForm(novo);
    setSalvo(null);
    if (tentou) setErros(validar(novo));
  }

  /** Props comuns dos campos de texto: valor, máscara, estado de erro e ligação com a mensagem de ajuda. */
  function texto(campo: CampoTexto, formatar?: (v: string) => string) {
    return {
      id: campo,
      name: campo,
      value: form[campo],
      onChange: (e: React.ChangeEvent<HTMLInputElement>) => atualizar(campo, formatar ? formatar(e.target.value) : e.target.value),
      "aria-invalid": erros[campo] ? true : undefined,
      "aria-describedby": `${campo}-ajuda`,
    };
  }

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    setTentou(true);
    setErroGeral(null);
    const r = VarejistaSchema.safeParse(form);
    if (!r.success) {
      const novos = z.flattenError(r.error).fieldErrors;
      setErros(novos);
      const primeiro = Object.keys(VAZIO).find((c) => novos[c as CampoVarejista]);
      document.getElementById(primeiro === "ufs_atuacao" ? "uf-AC" : primeiro === "situacao_ccee" ? "situacao-habilitado" : primeiro ?? "")?.focus();
      return;
    }
    setSalvando(true);
    try {
      const v = await api.salvarVarejista(r.data);
      setSalvo(v);
      setExistente(v);
      setErros({});
      setTentou(false);
      setForm(paraForm(v));
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      setErroGeral((err as Error).message);
      if (err instanceof ErroApi) setErros(err.campos as Erros);
    } finally {
      setSalvando(false);
    }
  }

  if (existente === undefined) return <p className="text-sm text-muted-foreground">Carregando cadastro…</p>;

  const totalErros = Object.keys(erros).length;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <header className="space-y-2">
        <Link href="/painel" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-4" /> Painel do varejista
        </Link>
        <h1 className="flex items-center gap-2 text-2xl font-bold">
          <Building2 className="size-6 text-primary" /> {existente ? "Dados da empresa" : "Cadastre sua empresa"}
        </h1>
        <p className="text-muted-foreground">
          Esses dados identificam sua comercializadora para os clientes e para o time de operação. Campos sem
          “(opcional)” são obrigatórios.
        </p>
        {existente && !salvo && (
          <p className="text-xs text-muted-foreground">
            Cadastrado em {formatarData(existente.cadastrado_em)} · atualizado em {formatarData(existente.atualizado_em)}
          </p>
        )}
      </header>

      {salvo && (
        <Alert>
          <CircleCheck className="text-primary" />
          <AlertTitle>Cadastro salvo</AlertTitle>
          <AlertDescription>
            <p>
              Declaração registrada com hash <code className="text-xs">{salvo.declaracao.hash.slice(0, 16)}…</code>. O
              assistente virtual já se apresenta como <strong>{salvo.nome_fantasia}</strong>.
            </p>
            <Button asChild variant="outline" size="sm" className="mt-2">
              <Link href="/painel">Voltar ao painel</Link>
            </Button>
          </AlertDescription>
        </Alert>
      )}

      <form noValidate onSubmit={salvar} className="space-y-6">
        <Secao titulo="Identificação" descricao="Como a empresa aparece para o cliente e nos documentos.">
          <Campo id="razao_social" rotulo="Razão social" erro={erros.razao_social} className="sm:col-span-2">
            <Input {...texto("razao_social")} autoComplete="organization" />
          </Campo>
          <Campo
            id="nome_fantasia"
            rotulo="Nome fantasia"
            erro={erros.nome_fantasia}
            dica="O assistente virtual se apresenta com esse nome."
          >
            <Input {...texto("nome_fantasia")} />
          </Campo>
          <Campo id="cnpj" rotulo="CNPJ" erro={erros.cnpj} dica="Numérico ou alfanumérico.">
            <Input {...texto("cnpj", formatarCnpj)} placeholder="00.000.000/0000-00" autoCapitalize="characters" />
          </Campo>
          <Campo id="inscricao_estadual" rotulo="Inscrição estadual" erro={erros.inscricao_estadual} opcional>
            <Input {...texto("inscricao_estadual")} />
          </Campo>
        </Secao>

        <Secao
          titulo="Habilitação na CCEE"
          descricao="Para representar consumidores no mercado livre, o varejista precisa estar habilitado na CCEE (Decreto nº 13.097/2026, arts. 2º e 3º)."
        >
          <Campo id="codigo_agente_ccee" rotulo="Código do agente na CCEE" erro={erros.codigo_agente_ccee}>
            <Input {...texto("codigo_agente_ccee", (v) => v.replace(/\D/g, "").slice(0, 10))} inputMode="numeric" />
          </Campo>
          <fieldset className="space-y-1.5 sm:col-span-2" aria-describedby="situacao_ccee-ajuda">
            <legend className="text-sm leading-none font-medium">Situação na CCEE</legend>
            <div className="grid gap-2 pt-1.5 sm:grid-cols-2">
              {(Object.keys(SITUACOES_CCEE) as (keyof typeof SITUACOES_CCEE)[]).map((s) => (
                <label
                  key={s}
                  className={cn(
                    "flex cursor-pointer items-start gap-2 rounded-md border p-3 text-sm",
                    form.situacao_ccee === s && "border-primary bg-primary/5",
                    erros.situacao_ccee && "border-destructive"
                  )}
                >
                  <input
                    type="radio"
                    id={`situacao-${s}`}
                    name="situacao_ccee"
                    value={s}
                    checked={form.situacao_ccee === s}
                    onChange={() => atualizar("situacao_ccee", s)}
                    className="mt-0.5 accent-primary"
                  />
                  <span>
                    <span className="font-medium">{SITUACOES_CCEE[s]}</span>
                    <span className="block text-xs text-muted-foreground">{DESCRICAO_SITUACAO[s]}</span>
                  </span>
                </label>
              ))}
            </div>
            {erros.situacao_ccee && (
              <p id="situacao_ccee-ajuda" className="text-xs text-destructive">
                {erros.situacao_ccee[0]}
              </p>
            )}
          </fieldset>
          <fieldset className="space-y-2 sm:col-span-2" aria-describedby="ufs_atuacao-ajuda">
            <legend className="text-sm leading-none font-medium">Estados onde vende energia</legend>
            <div className="grid grid-cols-4 gap-x-2 gap-y-2.5 pt-2 sm:grid-cols-7 md:grid-cols-9">
              {UFS.map((uf) => (
                <Label key={uf} htmlFor={`uf-${uf}`} className="cursor-pointer font-normal">
                  <Checkbox
                    id={`uf-${uf}`}
                    checked={form.ufs_atuacao.includes(uf)}
                    aria-invalid={erros.ufs_atuacao ? true : undefined}
                    onCheckedChange={(marcado) =>
                      atualizar(
                        "ufs_atuacao",
                        marcado ? UFS.filter((u) => u === uf || form.ufs_atuacao.includes(u)) : form.ufs_atuacao.filter((u) => u !== uf)
                      )
                    }
                  />
                  {uf}
                </Label>
              ))}
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p id="ufs_atuacao-ajuda" className={cn("text-xs", erros.ufs_atuacao ? "text-destructive" : "text-muted-foreground")}>
                {erros.ufs_atuacao?.[0] ?? `${form.ufs_atuacao.length} selecionado(s)`}
              </p>
              <div className="flex gap-1">
                <Button type="button" variant="ghost" size="sm" onClick={() => atualizar("ufs_atuacao", [...UFS])}>
                  Marcar todos
                </Button>
                <Button type="button" variant="ghost" size="sm" onClick={() => atualizar("ufs_atuacao", [])}>
                  Limpar
                </Button>
              </div>
            </div>
          </fieldset>
        </Secao>

        <Secao titulo="Endereço da sede" descricao="Endereço que consta no CNPJ.">
          <Campo id="cep" rotulo="CEP" erro={erros.cep}>
            <Input {...texto("cep", formatarCep)} inputMode="numeric" autoComplete="postal-code" placeholder="00000-000" />
          </Campo>
          <Campo id="uf" rotulo="UF" erro={erros.uf}>
            <select
              id="uf"
              name="uf"
              value={form.uf}
              onChange={(e) => atualizar("uf", e.target.value)}
              aria-invalid={erros.uf ? true : undefined}
              aria-describedby="uf-ajuda"
              autoComplete="address-level1"
              className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-base shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 aria-invalid:border-destructive md:text-sm"
            >
              <option value="">Selecione</option>
              {UFS.map((uf) => (
                <option key={uf} value={uf}>
                  {uf}
                </option>
              ))}
            </select>
          </Campo>
          <Campo id="logradouro" rotulo="Logradouro" erro={erros.logradouro} className="sm:col-span-2">
            <Input {...texto("logradouro")} autoComplete="address-line1" />
          </Campo>
          <Campo id="numero" rotulo="Número" erro={erros.numero}>
            <Input {...texto("numero")} />
          </Campo>
          <Campo id="complemento" rotulo="Complemento" erro={erros.complemento} opcional>
            <Input {...texto("complemento")} autoComplete="address-line2" />
          </Campo>
          <Campo id="bairro" rotulo="Bairro" erro={erros.bairro}>
            <Input {...texto("bairro")} />
          </Campo>
          <Campo id="cidade" rotulo="Cidade" erro={erros.cidade}>
            <Input {...texto("cidade")} autoComplete="address-level2" />
          </Campo>
        </Secao>

        <Secao titulo="Atendimento ao consumidor" descricao="Canais oficiais para o cliente falar com a empresa.">
          <Campo id="sac_telefone" rotulo="Telefone de atendimento" erro={erros.sac_telefone}>
            <Input {...texto("sac_telefone", formatarTelefone)} type="tel" inputMode="tel" placeholder="(00) 0000-0000" />
          </Campo>
          <Campo id="sac_email" rotulo="E-mail de atendimento" erro={erros.sac_email}>
            <Input {...texto("sac_email")} type="email" inputMode="email" />
          </Campo>
          <Campo id="whatsapp" rotulo="WhatsApp" erro={erros.whatsapp} opcional>
            <Input {...texto("whatsapp", formatarTelefone)} type="tel" inputMode="tel" placeholder="(00) 00000-0000" />
          </Campo>
          <Campo id="site" rotulo="Site" erro={erros.site} opcional>
            <Input {...texto("site")} type="url" inputMode="url" placeholder="https://" />
          </Campo>
        </Secao>

        <Secao titulo="Responsáveis" descricao="Quem responde pelo cadastro e quem cuida dos dados pessoais dos clientes.">
          <Campo id="responsavel_nome" rotulo="Responsável pelo cadastro" erro={erros.responsavel_nome}>
            <Input {...texto("responsavel_nome")} autoComplete="name" />
          </Campo>
          <Campo id="responsavel_cargo" rotulo="Cargo" erro={erros.responsavel_cargo} opcional>
            <Input {...texto("responsavel_cargo")} autoComplete="organization-title" />
          </Campo>
          <Campo id="responsavel_email" rotulo="E-mail do responsável" erro={erros.responsavel_email}>
            <Input {...texto("responsavel_email")} type="email" inputMode="email" autoComplete="email" />
          </Campo>
          <Campo id="responsavel_telefone" rotulo="Telefone do responsável" erro={erros.responsavel_telefone}>
            <Input {...texto("responsavel_telefone", formatarTelefone)} type="tel" inputMode="tel" autoComplete="tel" />
          </Campo>
          <Campo
            id="encarregado_dados_nome"
            rotulo="Encarregado de dados (LGPD)"
            erro={erros.encarregado_dados_nome}
            dica="Pessoa indicada para falar com titulares e com a ANPD (LGPD, art. 41)."
          >
            <Input {...texto("encarregado_dados_nome")} />
          </Campo>
          <Campo id="encarregado_dados_email" rotulo="E-mail do encarregado" erro={erros.encarregado_dados_email}>
            <Input {...texto("encarregado_dados_email")} type="email" inputMode="email" />
          </Campo>
        </Secao>

        <Card>
          <CardContent className="space-y-4">
            <div className="flex items-start gap-3">
              <Checkbox
                id="declaracao"
                checked={form.declaracao}
                onCheckedChange={(m) => atualizar("declaracao", m === true)}
                aria-invalid={erros.declaracao ? true : undefined}
                aria-describedby="declaracao-ajuda"
                className="mt-0.5"
              />
              <div className="space-y-1">
                <Label htmlFor="declaracao" className="leading-snug font-normal">
                  Declaro que as informações são verdadeiras, que represento a empresa e que a situação na CCEE informada
                  está correta.
                </Label>
                {erros.declaracao && (
                  <p id="declaracao-ajuda" className="text-xs text-destructive">
                    {erros.declaracao[0]}
                  </p>
                )}
              </div>
            </div>
            {(erroGeral || totalErros > 0) && (
              <p className="text-sm text-destructive" role="alert">
                {erroGeral ?? `Revise ${totalErros === 1 ? "1 campo destacado" : `${totalErros} campos destacados`}.`}
              </p>
            )}
            <Button type="submit" size="lg" disabled={salvando} className="w-full sm:w-auto">
              {salvando && <LoaderCircle className="animate-spin" />}
              {existente ? "Salvar alterações" : "Salvar cadastro"}
            </Button>
          </CardContent>
        </Card>
      </form>
    </div>
  );
}
