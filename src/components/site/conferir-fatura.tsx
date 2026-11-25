"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { LoaderCircle, ShieldAlert, TriangleAlert } from "lucide-react";
import { SiteShell } from "@/components/trevolt/site-shell";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { api, type ExtracaoArquivo } from "@/lib/api";
import { useCasoDemo } from "@/lib/demo/store";
import { definirCaminho, lerCaminho, type FaturaParcial } from "@/lib/fatura-campos";
import type { Beneficio } from "@/lib/types";
import { formatarBRL } from "@/lib/utils";
import { BeneficiosCampo, CampoFatura } from "./campo-fatura";
import { camposParaPreencher, completarComPadroes, converterCampo, numeroPtBr, textoInicial, validarFaturaCompleta } from "./fatura-montagem";
import { guardarRascunho, useHidratado, useRascunho } from "./rascunho";

/** S3 (tudo lido) e S3b (leitura incompleta): o consumidor confere antes do cálculo; só os campos ausentes pedem preenchimento. */
export function ConferirFatura() {
  const router = useRouter();
  const hidratado = useHidratado();
  const { leitura } = useRascunho();

  useEffect(() => {
    if (hidratado && !leitura) router.replace("/fatura");
  }, [hidratado, leitura, router]);

  if (!leitura) {
    return (
      <SiteShell topo={<span />} passo={{ n: 2 }}>
        <Skeleton className="h-9 w-3/4" />
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-16 w-full" />
      </SiteShell>
    );
  }
  return <Formulario leitura={leitura} />;
}

function Formulario({ leitura }: { leitura: ExtracaoArquivo }) {
  const router = useRouter();
  const { atualizar } = useCasoDemo();
  const campos = useMemo(() => camposParaPreencher(leitura.ausentes), [leitura]);
  const [valores, setValores] = useState<Record<string, string>>(() =>
    Object.fromEntries(campos.map((c) => [c.caminho, textoInicial(c, lerCaminho(leitura.fatura, c.caminho))]))
  );
  const [beneficios, setBeneficios] = useState<Set<Beneficio>>(new Set(leitura.fatura.beneficios ?? []));
  const [editando, setEditando] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const faltou = (caminho: string) => leitura.ausentes.includes(caminho);
  const qtdFaltou = campos.filter((c) => faltou(c.caminho)).length;

  const montagem = useMemo(() => {
    const base = structuredClone(leitura.fatura) as FaturaParcial;
    for (const c of campos) definirCaminho(base as Record<string, unknown>, c.caminho, converterCampo(c, valores[c.caminho] ?? ""));
    base.beneficios = [...beneficios];
    const m = completarComPadroes(base);
    return { ...m, validacao: validarFaturaCompleta(m.fatura) };
  }, [leitura, campos, valores, beneficios]);

  async function confirmar() {
    if (!montagem.validacao.success) return;
    setErro(null);
    setEnviando(true);
    try {
      const fatura = await api.confirmarFatura(montagem.fatura);
      guardarRascunho({ confirmada: fatura });
      // origem "digitado" quando a divisão da conta foi estimada (componentes não lidos); senão a conta veio da foto.
      atualizar({ faturaId: fatura.id, origem: montagem.derivouComponentes ? "digitado" : "foto", ofertaId: undefined, etapa: "conta" });
      router.push("/conta");
    } catch (e) {
      setErro((e as Error).message);
      setEnviando(false);
    }
  }

  const exibicao = (caminho: string, v: string) => {
    const n = numeroPtBr(v);
    if (n === undefined) return v;
    if (caminho === "total_rs") return formatarBRL(n);
    if (caminho === "consumo_kwh") return `${n.toLocaleString("pt-BR")} kWh por mês`;
    return v;
  };

  return (
    <SiteShell topo={<span />}
      passo={{ n: 2 }}
     
      acao={
        <>
          <Button size="lg" disabled={!montagem.validacao.success || enviando} onClick={confirmar}>
            {enviando && <LoaderCircle className="animate-spin" aria-hidden="true" />}
            Está certo, ver minha conta
          </Button>
          {qtdFaltou === 0 && (
            <Button variant="link" className="justify-center text-[13px]" onClick={() => setEditando((v) => !v)}>
              {editando ? "Pronto, parar de corrigir" : "Corrigir um dado"}
            </Button>
          )}
        </>
      }
    >
      <h1 className="text-[26px] leading-[1.12] font-medium">Confira o que li</h1>

      {leitura.fallback?.ativo ? (
        // FALLBACK: o n8n falhou e estes dados são de EXEMPLO, não da fatura enviada. Fica sempre visível.
        <Alert variant="warning" data-testid="leitura-mockada">
          <TriangleAlert />
          <AlertTitle>Leitura de demonstração</AlertTitle>
          <AlertDescription>
            <p>Não consegui falar com o serviço de leitura, então estes dados são de exemplo e <b>não são da sua fatura</b>. Corrija cada campo antes de continuar.</p>
            <p className="text-xs">Motivo: {leitura.fallback.motivo}</p>
          </AlertDescription>
        </Alert>
      ) : (
        <p className="text-xs text-muted-foreground" data-testid="leitura-do-n8n">
          Lida da sua fatura pelo serviço de leitura · confiança {Math.round(leitura.confianca * 100)}%
        </p>
      )}

      {leitura.alerta_injecao && (
        <Alert variant="destructive">
          <ShieldAlert />
          <AlertTitle>Instrução escondida no documento foi bloqueada</AlertTitle>
          <AlertDescription>O texto livre da fatura tentava dar ordens ao sistema. Ele foi tratado como dado e ignorado; os números vêm só dos campos lidos.</AlertDescription>
        </Alert>
      )}
      {qtdFaltou > 0 ? (
        <Alert variant="warning">
          <AlertDescription className="text-xs">
            <p>
              <b className="text-warning">{qtdFaltou === 1 ? "Faltou 1 dado." : `Faltaram ${qtdFaltou} dados.`}</b> Preencha para continuar. Toque em “Onde achar?” para ver onde eles ficam na conta.
            </p>
          </AlertDescription>
        </Alert>
      ) : (
        leitura.confianca < 0.7 && (
          <Alert variant="warning">
            <TriangleAlert />
            <AlertTitle>Confiança da leitura: {Math.round(leitura.confianca * 100)}%</AlertTitle>
            <AlertDescription>Confira cada dado com a sua fatura antes de continuar.</AlertDescription>
          </Alert>
        )
      )}

      {campos.map((c) => (
        <CampoFatura
          key={c.caminho}
          def={c}
          valor={valores[c.caminho] ?? ""}
          onChange={(v) => setValores((s) => ({ ...s, [c.caminho]: v }))}
          estado={faltou(c.caminho) ? "faltou" : qtdFaltou > 0 ? "lido" : "limpo"}
          somenteLeitura={!faltou(c.caminho) && !editando}
          exibicao={exibicao(c.caminho, valores[c.caminho] ?? "")}
        />
      ))}

      <BeneficiosCampo marcados={beneficios} onChange={setBeneficios} />

      {montagem.derivouComponentes ? (
        <Alert variant="warning">
          <TriangleAlert />
          <AlertTitle>Estimativa com dados completados</AlertTitle>
          <AlertDescription>A divisão da conta em energia, distribuição e tributos não veio da fatura; usamos uma proporção padrão. A faixa de economia sai mais larga.</AlertDescription>
        </Alert>
      ) : (
        montagem.assumido.length > 0 && (
          <p className="text-xs text-muted-foreground">Não vieram na leitura e usamos valores padrão: {montagem.assumido.join("; ")}.</p>
        )
      )}
      {erro && (
        <Alert variant="destructive">
          <TriangleAlert />
          <AlertTitle>Não deu certo</AlertTitle>
          <AlertDescription>{erro}</AlertDescription>
        </Alert>
      )}
      {montagem.derivouComponentes && <Badge variant="atencao" className="self-start">Caso marcado como dados digitados</Badge>}
    </SiteShell>
  );
}
