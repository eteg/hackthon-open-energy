"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CircleCheck, Info, LoaderCircle, TriangleAlert } from "lucide-react";
import { FaturaDetalhe } from "@/components/app/fatura-detalhe";
import { ReciboEconomia } from "@/components/app/recibo-economia";
import { CienciaRiscos } from "@/components/app/ciencia-riscos";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { api, type Extracao, type FaturaResumo, type RegrasPublicas } from "@/lib/api";
import { cn, formatarBRL, formatarData } from "@/lib/utils";
import type { Caso, Simulacao } from "@/lib/types";

const ROTULO_BENEFICIO = { TSEE: "Tarifa Social", irrigacao: "desconto de irrigação", aquicultura: "desconto de aquicultura" };

function Passo({ n, titulo, children }: { n: number; titulo: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <h2 className="flex items-center gap-2 text-lg font-semibold">
        <span className="flex size-6 items-center justify-center rounded-full bg-primary text-xs text-primary-foreground">{n}</span>
        {titulo}
      </h2>
      {children}
    </section>
  );
}

export default function OnboardingPage() {
  const [faturas, setFaturas] = useState<FaturaResumo[]>([]);
  const [regras, setRegras] = useState<RegrasPublicas | null>(null);
  const [faturaId, setFaturaId] = useState<string | null>(null);
  const [extracao, setExtracao] = useState<Extracao | null>(null);
  const [sim, setSim] = useState<Simulacao | null>(null);
  const [ofertaId, setOfertaId] = useState<string | null>(null);
  const [ciencia, setCiencia] = useState<Set<string>>(new Set());
  const [caso, setCaso] = useState<Caso | null>(null);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([api.listarFaturas(), api.regras()])
      .then(([f, r]) => {
        setFaturas(f);
        setRegras(r);
      })
      .catch((e: Error) => setErro(e.message));
  }, []);

  async function escolher(id: string) {
    setFaturaId(id);
    setExtracao(null);
    setSim(null);
    setOfertaId(null);
    setCiencia(new Set());
    setCaso(null);
    setErro(null);
    setCarregando(true);
    try {
      const ex = await api.extrairFatura(id); // técnica: leitura de documento com saída tipada
      setExtracao(ex);
      const s = await api.simular(id); // cálculo determinístico
      setSim(s);
      setOfertaId(s.melhor_oferta_id);
    } catch (e) {
      setErro((e as Error).message);
    } finally {
      setCarregando(false);
    }
  }

  async function solicitar() {
    if (!faturaId || !ofertaId) return;
    setCarregando(true);
    try {
      setCaso(await api.solicitarMigracao(faturaId, ofertaId, [...ciencia]));
    } catch (e) {
      setErro((e as Error).message);
    } finally {
      setCarregando(false);
    }
  }

  const ofertaEscolhida = sim?.ofertas.find((o) => o.oferta_id === ofertaId);
  const cienciaCompleta = !!regras && regras.ciencia_obrigatoria.every((c) => ciencia.has(c.id));

  return (
    <div className="space-y-10">
      <header className="space-y-1">
        <h1 className="text-2xl font-bold">Onboarding de migração</h1>
        <p className="text-muted-foreground">
          Fatura → simulação honesta → ciência de riscos → pedido de migração (aprovado por uma pessoa).
        </p>
      </header>

      {erro && (
        <Alert variant="destructive">
          <TriangleAlert />
          <AlertTitle>Algo deu errado</AlertTitle>
          <AlertDescription>{erro}</AlertDescription>
        </Alert>
      )}

      <Passo n={1} titulo="Escolha a fatura (base sintética)">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {faturas.map((f) => (
            <button
              key={f.id}
              onClick={() => escolher(f.id)}
              className={cn(
                "rounded-xl border bg-card p-4 text-left text-sm shadow-xs transition hover:shadow-md",
                faturaId === f.id && "ring-2 ring-primary"
              )}
            >
              <div className="font-medium">{f.titular}</div>
              <div className="text-muted-foreground">
                {f.segmento} · {f.uf} · {formatarBRL(f.total_rs)}/mês
              </div>
              {f.beneficios.length > 0 && (
                <Badge variant="warning" className="mt-2">
                  Tem {f.beneficios.map((b) => ROTULO_BENEFICIO[b]).join(", ")}
                </Badge>
              )}
            </button>
          ))}
        </div>
      </Passo>

      {carregando && !sim && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <LoaderCircle className="size-4 animate-spin" /> Lendo a fatura e simulando…
        </div>
      )}

      {extracao && (
        <Passo n={2} titulo="O que a fatura diz">
          <FaturaDetalhe fatura={extracao.fatura} alertaInjecao={extracao.alerta_injecao} />
        </Passo>
      )}

      {sim && (
        <Passo n={3} titulo="Simulação honesta">
          <div className="space-y-3">
            {sim.alertas.map((a) => (
              <Alert key={a.mensagem} variant={a.severidade === "alta" ? "destructive" : "warning"}>
                <TriangleAlert />
                <AlertTitle>{a.tipo === "perda_beneficio" ? "Você perde um benefício ao migrar" : "Atenção à elegibilidade"}</AlertTitle>
                <AlertDescription>
                  {a.mensagem} {a.fonte && <span className="text-xs">({a.fonte})</span>}
                </AlertDescription>
              </Alert>
            ))}
            {sim.veredito === "nao_compensa" && (
              <Alert variant="warning">
                <Info />
                <AlertTitle>Pelas nossas contas, migrar não compensa agora</AlertTitle>
                <AlertDescription>
                  Preferimos dizer isso a prometer uma economia que não vai aparecer na sua conta.
                </AlertDescription>
              </Alert>
            )}
            <p className="text-sm text-muted-foreground">
              Energia é <strong>{sim.parcela_energia_pct.toLocaleString("pt-BR")}%</strong> da sua conta. O desconto vale só
              sobre essa parte. Prazo para formalizar e migrar na abertura:{" "}
              <strong>{formatarData(sim.elegibilidade.prazo_formalizacao)}</strong> (abertura em{" "}
              {formatarData(sim.elegibilidade.data_abertura)}).
            </p>
            <div className="grid gap-4 lg:grid-cols-3">
              {sim.ofertas.map((r) => (
                <ReciboEconomia
                  key={r.oferta_id}
                  r={r}
                  melhor={r.oferta_id === sim.melhor_oferta_id}
                  selecionada={r.oferta_id === ofertaId}
                  onSelecionar={() => setOfertaId(r.oferta_id)}
                />
              ))}
            </div>
            <details className="text-xs text-muted-foreground">
              <summary className="cursor-pointer">
                Premissas e recibo nº {sim.recibo_id} · regras {sim.versao_regras}
              </summary>
              <ul className="mt-2 list-disc pl-5">
                {sim.premissas.map((p) => (
                  <li key={p}>{p}</li>
                ))}
              </ul>
            </details>
          </div>
        </Passo>
      )}

      {sim && ofertaEscolhida && regras && !caso && (
        <Passo n={4} titulo="Ciência de riscos (obrigatória)">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Antes de pedir a migração, confirme que entendeu:</CardTitle>
              <CardDescription>Oferta escolhida: {ofertaEscolhida.nome}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <CienciaRiscos
                itens={regras.ciencia_obrigatoria}
                marcados={ciencia}
                onChange={setCiencia}
                destaque={extracao?.fatura.beneficios.length ? ["perda_beneficios"] : []}
              />
              <Button onClick={solicitar} disabled={!cienciaCompleta || carregando} size="lg">
                {carregando && <LoaderCircle className="animate-spin" />}
                Pedir migração (vai para aprovação de um operador)
              </Button>
            </CardContent>
          </Card>
        </Passo>
      )}

      {caso && (
        <Alert>
          <CircleCheck className="text-primary" />
          <AlertTitle>Pedido registrado: {caso.id}</AlertTitle>
          <AlertDescription>
            <p>
              Ciência registrada com hash <code className="text-xs">{caso.ciencia?.hash.slice(0, 16)}…</code>. Agora um
              operador revisa e aprova. Nada é confirmado automaticamente.
            </p>
            <Button asChild variant="outline" size="sm" className="mt-2">
              <Link href="/painel">Ver no painel do varejista</Link>
            </Button>
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
