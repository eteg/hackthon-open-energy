"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Inbox } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { DemoBanner } from "@/components/trevolt/demo-banner";
import { api } from "@/lib/api";
import type { Caso } from "@/lib/types";
import { cn } from "@/lib/utils";
import { DetalheCaso } from "./detalhe";
import { ROTULO_ETAPA, filaDe, nomeCurto, numeroCaso, type Fila } from "./sim";

const ABAS: { id: Fila; rotulo: string; vazio: string }[] = [
  { id: "aprovar", rotulo: "Para aprovar", vazio: "Nenhum caso esperando a sua aprovação." },
  { id: "consumidor", rotulo: "Com o consumidor", vazio: "Nenhum caso esperando o consumidor." },
];

function ha(iso: string) {
  const d = Math.floor((Date.now() - new Date(`${iso.slice(0, 10)}T12:00:00`).getTime()) / 86_400_000);
  return d <= 0 ? "hoje" : d === 1 ? "há 1 dia" : `há ${d} dias`;
}

/** Prancha 10: mestre-detalhe numa tela só. Fila à esquerda (abas + cartões), caso selecionado à direita. */
export function ConsoleMestre({ id }: { id?: string }) {
  const [casos, setCasos] = useState<Caso[] | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [abaEscolhida, setAba] = useState<Fila | null>(null);

  const carregar = useCallback(() => {
    api.painel().then((p) => setCasos(p.casos)).catch((e: Error) => setErro(e.message));
  }, []);
  useEffect(() => {
    carregar();
  }, [carregar]);

  if (erro) return <p className="p-6 text-sm text-destructive">Não foi possível carregar a fila: {erro}</p>;
  if (!casos) return <div className="p-6"><Skeleton className="h-96 w-full" /></div>;

  const itens = casos.map((c) => ({ c, fila: filaDe(c) }));
  const selecionado = id ? itens.find((i) => i.c.id === id) : itens.find((i) => i.fila === "aprovar") ?? itens.find((i) => i.fila === "consumidor");
  const aba: Fila = abaEscolhida ?? (selecionado?.fila === "consumidor" ? "consumidor" : "aprovar");
  const lista = itens.filter((i) => i.fila === aba);
  const cont = (f: Fila) => itens.filter((i) => i.fila === f).length;
  const atual = ABAS.find((a) => a.id === aba)!;

  return (
    <div className="p-4 md:p-6">
      <div className="flex flex-wrap items-start gap-6">
        <aside className="flex min-w-[280px] flex-[0_1_330px] flex-col gap-3">
          <div role="tablist" aria-label="Fila de casos" className="inline-flex self-start rounded-[10px] bg-secondary p-[3px]">
            {ABAS.map((a) => (
              <button
                key={a.id}
                role="tab"
                aria-selected={aba === a.id}
                onClick={() => setAba(a.id)}
                className={cn(
                  "min-h-[38px] rounded-lg px-3.5 text-[13px] font-semibold text-muted-foreground",
                  aba === a.id && "bg-card text-foreground shadow-sm"
                )}
              >
                {a.rotulo} · {cont(a.id)}
              </button>
            ))}
          </div>
          {lista.length === 0 && (
            <div className="flex flex-col items-center gap-2 rounded-xl border bg-card px-4 py-10 text-center text-sm">
              <Inbox className="size-5 text-muted-foreground" aria-hidden="true" />
              <p className="font-medium">{atual.vazio}</p>
              <p className="text-muted-foreground">Quando houver, ele aparece aqui.</p>
            </div>
          )}
          {lista.map(({ c }) => (
            <Link
              key={c.id}
              href={`/console/casos/${c.id}`}
              aria-current={selecionado?.c.id === c.id ? "true" : undefined}
              className={cn(
                "flex flex-col gap-0.5 rounded-xl border bg-card p-3 hover:bg-secondary/40",
                selecionado?.c.id === c.id && "border-2 border-grafite",
                selecionado?.c.id !== c.id && c.alerta_beneficio && "border-[1.5px] border-warning"
              )}
            >
              <span className="flex items-baseline justify-between gap-2">
                <b className="text-sm">{numeroCaso(c.id)} · {nomeCurto(c.cliente)}</b>
                <span className="text-xs text-muted-foreground">{ha(c.criado_em)}</span>
              </span>
              <span className="text-[13px]">{ROTULO_ETAPA[c.etapa]}</span>
            </Link>
          ))}
        </aside>

        <main className="min-w-0 flex-[999_1_520px]">
          {selecionado ? (
            <DetalheCaso key={selecionado.c.id} caso={selecionado.c} recarregar={carregar} />
          ) : id ? (
            <section className="rounded-xl border bg-card p-6 text-sm">
              <h1 className="font-display text-[28px] font-bold">Caso não encontrado</h1>
              <p className="mt-2 text-muted-foreground">O caso {id} não está na fila (a lista fica em memória e zera quando o servidor reinicia).</p>
            </section>
          ) : (
            <section className="rounded-xl border bg-card p-6 text-sm text-muted-foreground">Nenhum caso na fila.</section>
          )}
        </main>
      </div>
      <DemoBanner className="mt-6">Dados sintéticos. A aprovação do ato 1 é real; os atos seguintes na CCEE não fazem parte desta demonstração.</DemoBanner>
    </div>
  );
}
