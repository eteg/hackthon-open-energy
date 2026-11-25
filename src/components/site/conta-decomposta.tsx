"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { SiteShell } from "@/components/trevolt/site-shell";
import { Button } from "@/components/ui/button";
import { useCasoDemo } from "@/lib/demo/store";
import type { Fatura } from "@/lib/types";
import { cn, formatarBRL, formatarData, formatarPct } from "@/lib/utils";
import { AlertasSimulacao } from "./alertas-simulacao";
import { TelaSemSimulacao } from "./tela-sem-simulacao";
import { useSimulacao } from "./use-simulacao";

type Parte = { nome: string; valor: number; cor: string; destaque?: boolean };

/** Partes da conta a partir dos componentes reais da fatura. Sem a fatura, cai para energia × resto (parcela vinda da simulação). */
function partes(fatura: Fatura | undefined, parcelaEnergia: number): Parte[] {
  if (!fatura) {
    return [
      { nome: "Energia, a única que muda", valor: parcelaEnergia, cor: "bg-primary", destaque: true },
      { nome: "Distribuição, encargos e tributos", valor: 100 - parcelaEnergia, cor: "bg-grafite" },
    ];
  }
  const c = fatura.componentes;
  return [
    { nome: "Energia, a única que muda", valor: c.energia_te_rs, cor: "bg-primary", destaque: true },
    { nome: "Distribuição", valor: c.distribuicao_tusd_rs, cor: "bg-grafite" },
    { nome: "Tributos", valor: c.tributos_rs, cor: "bg-grafite-suave" },
    { nome: "Bandeira e iluminação pública", valor: c.bandeira_rs + c.cip_rs, cor: "bg-linha" },
  ];
}

/** S4: a conta em partes; só a energia muda com a troca de fornecedor. */
export function ContaDecomposta() {
  const router = useRouter();
  const { atualizar } = useCasoDemo();
  const { sim, fatura, erro, semFatura } = useSimulacao();
  if (!sim) return <TelaSemSimulacao passo={3} semFatura={semFatura} erro={erro} />;

  const lista = partes(fatura, sim.parcela_energia_pct);
  const soma = lista.reduce((a, p) => a + p.valor, 0) || 1;
  const melhor = sim.ofertas.find((o) => o.oferta_id === sim.melhor_oferta_id);
  const foraDoEscopo = sim.veredito === "fora_do_escopo";

  return (
    <SiteShell topo={<span />}
      passo={{ n: 3 }}
     
      acao={
        foraDoEscopo ? (
          <Button asChild size="lg">
            <Link href="/assistente">Falar com uma pessoa</Link>
          </Button>
        ) : (
          <Button
            size="lg"
            onClick={() => {
              atualizar({ etapa: "ofertas" });
              router.push("/ofertas");
            }}
          >
            Ver ofertas
          </Button>
        )
      }
    >
      <h1 className="text-[28px] leading-[1.1] font-medium">Sua conta tem {lista.length} partes</h1>
      <p className="text-sm leading-snug text-muted-foreground">Só a energia pode mudar com a troca de fornecedor.</p>

      <div className="rounded-xl border bg-card p-4">
        <div className="text-xs font-semibold text-muted-foreground">Conta do mês{fatura ? ` · ${formatarBRL(fatura.total_rs)}` : ""}</div>
        <div className="my-2 mb-3 flex h-7 overflow-hidden rounded-md" role="img" aria-label="Divisão da conta por parte">
          {lista.map((p) => (
            <div key={p.nome} className={p.cor} style={{ flex: p.valor }} />
          ))}
        </div>
        <ul className="flex flex-col gap-2">
          {lista.map((p) => (
            <li key={p.nome} className="flex items-center justify-between gap-2 text-sm">
              <span className={cn("flex items-center gap-2", p.destaque && "font-bold")}>
                <i aria-hidden="true" className={cn("inline-block size-2.5 rounded-[3px]", p.cor)} />
                {p.nome}
              </span>
              <span className={cn("tabular-nums", p.destaque && "font-bold")}>≈ {Math.round((p.valor / soma) * 100)}%</span>
            </li>
          ))}
        </ul>
      </div>

      {melhor && (
        <div className="rounded-xl border-2 border-primary bg-card p-4">
          <div className="font-display text-[28px] leading-[1.1] font-medium">
            {formatarPct(melhor.desconto_efetivo_energia_pct)} na energia ≈ {formatarPct(melhor.economia_pct_conta_base)} na conta
          </div>
          <p className="mt-1.5 text-[13px] leading-normal text-muted-foreground">
            Economia estimada na conta inteira, com a oferta {melhor.varejista}: ≈ {formatarBRL(melhor.economia_liquida_mensal_rs.base)} por mês ou{" "}
            {formatarBRL(melhor.economia_liquida_mensal_rs.base * 12)} por ano, já com taxas e benefícios perdidos, antes de reajustes. Não é garantia.
          </p>
        </div>
      )}

      <AlertasSimulacao sim={sim} />

      {sim.elegibilidade.grupo_b && (
        <div className="rounded-xl border-2 border-primary bg-card px-3.5 py-3 text-sm leading-snug">
          <b>Pode migrar a partir de {formatarData(sim.elegibilidade.data_abertura)}.</b>
          <span className="block text-xs text-muted-foreground">Prazo para formalizar e migrar na abertura: {formatarData(sim.elegibilidade.prazo_formalizacao)}.</span>
        </div>
      )}
      <p className="text-[13px] leading-snug text-muted-foreground">A rede, as quedas de luz e os encargos continuam com a sua distribuidora.</p>
    </SiteShell>
  );
}
