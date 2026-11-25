"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { SiteShell } from "@/components/trevolt/site-shell";
import { Simbolo } from "@/components/trevolt/logo";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useCasoDemo } from "@/lib/demo/store";
import { formatarBRL, formatarPct } from "@/lib/utils";
import { AlertasSimulacao } from "./alertas-simulacao";
import { MemoriaCalculo } from "./memoria-calculo";
import { temCustoOculto } from "./ofertas-lista";
import { TelaSemSimulacao } from "./tela-sem-simulacao";
import { useSimulacao } from "./use-simulacao";

function Bloco({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-[13px] font-semibold">{titulo}</div>
      <div className="text-[13px] leading-normal text-muted-foreground">{children}</div>
    </div>
  );
}

/** S6: recibo de economia da oferta (combinado hoje; o realizado só aparece depois da 1ª fatura). */
export function ReciboOferta({ id }: { id: string }) {
  const router = useRouter();
  const { atualizar } = useCasoDemo();
  const { sim, fatura, erro, semFatura } = useSimulacao();
  if (!sim) return <TelaSemSimulacao passo={4} semFatura={semFatura} erro={erro} />;

  const o = sim.ofertas.find((x) => x.oferta_id === id);
  if (!o) {
    return (
      <SiteShell topo={<span />} passo={{ n: 4 }} acao={<Button asChild size="lg"><Link href="/ofertas">Voltar às ofertas</Link></Button>}>
        <Alert variant="warning">
          <AlertDescription>Não encontramos essa oferta na sua simulação.</AlertDescription>
        </Alert>
      </SiteShell>
    );
  }

  const l = o.economia_liquida_mensal_rs;
  const mes = fatura?.mes_referencia.split("-").reverse().join("/");
  return (
    <SiteShell topo={<span />}
      passo={{ n: 4 }}
     
      acao={
        <>
          <Button
            size="lg"
            disabled={!o.compensa}
            onClick={() => {
              atualizar({ ofertaId: o.oferta_id, etapa: "ciencia" });
              router.push("/ciencia");
            }}
          >
            {o.compensa ? "Quero esta oferta" : "Esta oferta não compensa"}
          </Button>
        </>
      }
    >
      <Button asChild variant="link" className="self-start text-[13px]">
        <Link href="/ofertas">
          <ArrowLeft aria-hidden="true" /> Voltar às ofertas
        </Link>
      </Button>

      <article className="recibo flex flex-col gap-2.5 p-4" aria-label="Recibo de economia">
        <div className="text-[13px] font-semibold text-primary">Recibo de economia · {o.varejista}</div>
        <Bloco titulo="Base">
          {fatura ? `Fatura de ${mes} · conta de ${formatarBRL(fatura.total_rs)}` : "Fatura enviada por você"}
        </Bloco>
        <Bloco titulo="O que é prometido">
          {o.nome}. Desconto equivalente a {formatarPct(o.desconto_efetivo_energia_pct)} só sobre a energia (≈ {formatarPct(sim.parcela_energia_pct)} da conta).
        </Bloco>
        <div>
          <div className="text-[13px] font-semibold">Combinado</div>
          <div className="font-display text-xl font-medium tabular-nums">
            {formatarBRL(l.pessimista)} a {formatarBRL(l.otimista)}{" "}
            <span className="font-sans text-xs font-normal text-muted-foreground">
              por mês · {formatarBRL(l.pessimista * 12)} a {formatarBRL(l.otimista * 12)} por ano
            </span>
          </div>
          <div className="text-xs text-muted-foreground">
            Estimativa na conta inteira (base {formatarBRL(l.base)}/mês, {formatarPct(o.economia_pct_conta_base)} da conta). Não é garantia.
          </div>
        </div>
        <div className="flex items-center justify-between gap-2">
          <span className="text-[13px] font-semibold">Realizado</span>
          <Badge variant="outline">Aparece após a 1ª fatura</Badge>
        </div>
        <Bloco titulo="Premissas">
          {sim.premissas.join(" ")} Prazo de {o.prazo_meses} meses · reajuste: {o.reajuste} · multa: {o.multa}.
          {temCustoOculto(o) ? ` Já descontada a taxa de ${formatarBRL(o.taxa_mensal_rs)}/mês.` : ""}
        </Bloco>
        <Alert variant="warning" className="px-2.5 py-1.5">
          <AlertDescription className="text-xs">
            <p>
              <b className="text-warning">Risco:</b> o preço pode mudar ({o.reajuste.toLowerCase()}). A economia não é garantida.
            </p>
          </AlertDescription>
        </Alert>
        <div className="text-[11px] text-muted-foreground">
          Fonte das tarifas: regras versão {sim.versao_regras} · recibo nº {sim.recibo_id} · <MemoriaCalculo oferta={o}>memória de cálculo</MemoriaCalculo>
        </div>
        <Simbolo className="self-end opacity-60" />
      </article>

      <AlertasSimulacao sim={sim} />
    </SiteShell>
  );
}
