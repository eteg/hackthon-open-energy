"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { SiteShell } from "@/components/trevolt/site-shell";
import { SeloVerificado } from "@/components/trevolt/selo-verificado";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useCasoDemo } from "@/lib/demo/store";
import type { ResultadoOferta } from "@/lib/types";
import { cn, formatarBRL, formatarPct } from "@/lib/utils";
import { AlertasSimulacao } from "./alertas-simulacao";
import { MemoriaCalculo } from "./memoria-calculo";
import { TelaSemSimulacao } from "./tela-sem-simulacao";
import { useSimulacao } from "./use-simulacao";

/** Custo oculto = taxa mensal cobrada fora do preço anunciado. Entra no ranking com alerta; a plataforma não exclui. */
export const temCustoOculto = (o: ResultadoOferta) => o.taxa_mensal_rs > 0;

const TIPO: Record<ResultadoOferta["tipo"], string> = { desconto_percentual: "desconto na energia", preco_fixo: "preço fixo", indexado: "indexado" };

function Oferta({ o, posicao, destaque, onEscolher }: { o: ResultadoOferta; posicao: number; destaque: boolean; onEscolher: () => void }) {
  const l = o.economia_liquida_mensal_rs;
  const oculto = temCustoOculto(o);
  const anual = formatarBRL(l.base * 12);
  const pcts = `${formatarPct(o.economia_pct_conta_base)} da conta · ${formatarPct(o.desconto_efetivo_energia_pct)} na energia`;
  return (
    <div className={cn("rounded-xl border bg-card px-3.5 py-3", destaque && "border-2 border-grafite p-3.5")}>
      <div className="flex items-center justify-between gap-2">
        <h2 className={cn(destaque ? "font-display text-lg font-medium" : "text-sm font-bold")}>
          #{posicao} {o.varejista}
        </h2>
        {oculto ? <Badge variant="atencao">Custo oculto</Badge> : <SeloVerificado />}
      </div>
      <div className="mt-0.5 text-xs text-muted-foreground">
        {o.prazo_meses} meses · {TIPO[o.tipo]}
        {destaque && ` · ${o.reajuste.toLowerCase()}`}
      </div>
      {destaque ? (
        <>
          <div className={cn("mt-1 font-display text-[30px] font-medium tabular-nums", l.base < 0 && "text-destructive")}>
            {anual}
            <span className="text-[13px] font-normal text-muted-foreground">/ano</span>
          </div>
          <div className="text-xs text-muted-foreground">{pcts}</div>
        </>
      ) : (
        <div className="mt-1 flex items-baseline justify-between gap-2">
          <span className={cn("font-display text-xl font-medium tabular-nums", l.base < 0 && "text-destructive")}>
            {anual}
            <span className="text-xs font-normal text-muted-foreground">/ano</span>
          </span>
          <span className="text-right text-xs text-muted-foreground">{pcts}</span>
        </div>
      )}
      <div className="text-xs text-muted-foreground">
        Faixa: {formatarBRL(l.pessimista * 12)} a {formatarBRL(l.otimista * 12)} por ano
      </div>
      {oculto && (
        <Alert variant="warning" className="mt-1.5 px-2.5 py-1.5">
          <AlertDescription className="text-xs">
            <p>
              <b className="text-warning">Alerta:</b> taxa de {formatarBRL(o.taxa_mensal_rs)}/mês fora do preço anunciado (anunciado {formatarBRL(o.economia_bruta_mensal_rs.base * 12)}/ano).{" "}
              <MemoriaCalculo oferta={o}>
                <b>Ver memória de cálculo</b>
              </MemoriaCalculo>
            </p>
          </AlertDescription>
        </Alert>
      )}
      {o.tipo === "indexado" && (
        <Alert variant="warning" className="mt-1.5 px-2.5 py-1.5">
          <AlertDescription className="text-xs">
            <p>
              <b className="text-warning">Atenção:</b> o preço pode subir na renovação.
            </p>
          </AlertDescription>
        </Alert>
      )}
      {!o.compensa && o.motivo_nao_compensa && (
        <p className="mt-1.5 text-xs text-muted-foreground">
          <b>Não compensa:</b> {o.motivo_nao_compensa}
        </p>
      )}
      {destaque ? (
        <div className="mt-2.5 flex gap-2">
          <Button className="flex-1" onClick={onEscolher}>
            Escolher esta oferta
          </Button>
          <Button asChild variant="outline">
            <Link href={`/ofertas/${o.oferta_id}`}>Ver recibo</Link>
          </Button>
        </div>
      ) : (
        <Link href={`/ofertas/${o.oferta_id}`} className="mt-1 inline-flex min-h-11 items-center text-[13px] font-semibold text-primary underline">
          Ver recibo
        </Link>
      )}
    </div>
  );
}

/** S5: ofertas pela ordem real da simulação (economia líquida estimada, igual para todos). */
export function OfertasLista() {
  const router = useRouter();
  const { atualizar } = useCasoDemo();
  const { sim, erro, semFatura } = useSimulacao();
  if (!sim) return <TelaSemSimulacao passo={4} semFatura={semFatura} erro={erro} />;

  return (
    <SiteShell topo={<span />} passo={{ n: 4 }}>
      <h1 className="text-[28px] leading-[1.1] font-medium">Ofertas para você</h1>
      <p className="text-[13px] leading-snug text-muted-foreground">Ordenadas pela economia líquida estimada. Ninguém paga por posição.</p>
      <AlertasSimulacao sim={sim} />
      {sim.ofertas.length === 0 && (
        <Alert variant="warning">
          <AlertDescription>Não há ofertas para o seu perfil agora.</AlertDescription>
        </Alert>
      )}
      {sim.ofertas.map((o, i) => (
        <Oferta
          key={o.oferta_id}
          o={o}
          posicao={i + 1}
          destaque={o.oferta_id === sim.melhor_oferta_id}
          onEscolher={() => {
            atualizar({ ofertaId: o.oferta_id, etapa: "recibo" });
            router.push(`/ofertas/${o.oferta_id}`);
          }}
        />
      ))}
    </SiteShell>
  );
}
