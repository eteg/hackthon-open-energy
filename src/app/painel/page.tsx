"use client";

import { useCallback, useEffect, useState } from "react";
import { Activity, CircleCheck, Clock, ShieldAlert, TriangleAlert, Wallet } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { api, type Observabilidade, type Painel } from "@/lib/api";
import { formatarBRL, formatarData } from "@/lib/utils";
import type { Caso, Etapa } from "@/lib/types";

const ROTULO_ETAPA: Record<Etapa, string> = {
  simulado: "Simulado",
  ciencia_pendente: "Ciência pendente",
  aguardando_aprovacao: "Aguardando aprovação",
  documentacao: "Documentação",
  formalizado: "Formalizado",
  escalado_humano: "Com atendente",
};

const corRisco: Record<Caso["risco_desistencia"], "secondary" | "warning" | "destructive"> = {
  baixo: "secondary",
  medio: "warning",
  alto: "destructive",
};

function Kpi({ icon: Icon, rotulo, valor }: { icon: React.ElementType; rotulo: string; valor: string | number }) {
  return (
    <Card className="gap-1 py-4">
      <CardContent className="flex items-center gap-3">
        <Icon className="size-5 text-primary" />
        <div>
          <div className="text-xs text-muted-foreground">{rotulo}</div>
          <div className="text-xl font-semibold tabular-nums">{valor}</div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function PainelPage() {
  const [painel, setPainel] = useState<Painel | null>(null);
  const [obs, setObs] = useState<Observabilidade | null>(null);
  const [operador, setOperador] = useState("Operador Demo");
  const [filtro, setFiltro] = useState<Etapa | "todos" | "risco">("todos");

  const carregar = useCallback(() => {
    api.painel().then(setPainel);
    api.observabilidade().then(setObs);
  }, []);
  useEffect(() => {
    carregar();
  }, [carregar]);

  const [erro, setErro] = useState<string | null>(null);
  async function aprovar(id: string) {
    try {
      setErro(null);
      await api.aprovarCaso(id, operador); // HITL: a decisão é humana
    } catch (e) {
      setErro((e as Error).message);
    }
    carregar();
  }

  if (!painel) return <p className="text-sm text-muted-foreground">Carregando painel…</p>;
  const casos = painel.casos.filter((c) =>
    filtro === "todos" ? true : filtro === "risco" ? c.risco_desistencia === "alto" : c.etapa === filtro
  );

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Painel do varejista</h1>
          <p className="text-muted-foreground">Casos de migração, clientes em risco e saúde da IA.</p>
        </div>
        <label className="flex items-center gap-2 text-sm">
          Operador
          <Input value={operador} onChange={(e) => setOperador(e.target.value)} className="w-44" />
        </label>
      </header>

      {erro && <p className="text-sm text-destructive">Não foi possível aprovar: {erro}</p>}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi icon={Activity} rotulo="Casos ativos" valor={painel.kpis.total} />
        <Kpi icon={Clock} rotulo="Aguardando aprovação humana" valor={painel.kpis.aguardando_aprovacao} />
        <Kpi icon={TriangleAlert} rotulo="Risco alto de desistência" valor={painel.kpis.risco_alto} />
        <Kpi icon={Wallet} rotulo="Economia líquida estimada (mês)" valor={formatarBRL(painel.kpis.economia_liquida_mensal_total_rs)} />
      </div>

      <div className="flex flex-wrap gap-2">
        {(["todos", "risco", ...Object.keys(ROTULO_ETAPA)] as const).map((f) => (
          <Button key={f} size="sm" variant={filtro === f ? "default" : "outline"} onClick={() => setFiltro(f as typeof filtro)}>
            {f === "todos" ? "Todos" : f === "risco" ? "Em risco" : ROTULO_ETAPA[f as Etapa]}
            {f !== "todos" && f !== "risco" && <span className="text-xs opacity-70">{painel.kpis.por_etapa[f as Etapa]}</span>}
          </Button>
        ))}
      </div>

      <Card className="py-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="pl-4">Cliente</TableHead>
              <TableHead>Etapa</TableHead>
              <TableHead>Risco</TableHead>
              <TableHead className="text-right">Economia/mês</TableHead>
              <TableHead>Próxima ação</TableHead>
              <TableHead className="pr-4" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {casos.map((c) => (
              <TableRow key={c.id}>
                <TableCell className="pl-4">
                  <div className="font-medium">{c.cliente}</div>
                  <div className="text-xs text-muted-foreground">
                    {c.segmento} · {c.uf} · desde {formatarData(c.criado_em)}
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant="outline">{ROTULO_ETAPA[c.etapa]}</Badge>
                  {c.alerta_beneficio && (
                    <Badge variant="warning" className="ml-1">
                      benefício
                    </Badge>
                  )}
                </TableCell>
                <TableCell>
                  <Badge variant={corRisco[c.risco_desistencia]}>{c.risco_desistencia}</Badge>
                  {c.motivo_risco && <div className="mt-1 text-xs text-muted-foreground">{c.motivo_risco}</div>}
                </TableCell>
                <TableCell className="text-right tabular-nums">{formatarBRL(c.economia_liquida_mensal_rs)}</TableCell>
                <TableCell className="max-w-64 text-xs whitespace-normal">{c.proxima_acao}</TableCell>
                <TableCell className="pr-4 text-right">
                  {c.etapa === "aguardando_aprovacao" ? (
                    <Button size="sm" onClick={() => aprovar(c.id)} disabled={operador.trim().length < 2}>
                      <CircleCheck /> Aprovar
                    </Button>
                  ) : c.aprovado_por ? (
                    <span className="text-xs text-muted-foreground">aprovado por {c.aprovado_por.operador}</span>
                  ) : null}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      {obs && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <ShieldAlert className="size-4 text-primary" /> Observabilidade da IA (desde que o servidor subiu)
            </CardTitle>
            <CardDescription>Alimenta o ROI: custo e latência por atendimento. Logs completos em logs/*.jsonl.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 text-sm sm:grid-cols-3 lg:grid-cols-6">
            <div><div className="text-xs text-muted-foreground">Chamadas</div>{obs.chamadas}</div>
            <div><div className="text-xs text-muted-foreground">Latência média</div>{obs.latencia_media_ms} ms</div>
            <div><div className="text-xs text-muted-foreground">Tokens (in/out)</div>{obs.tokens_entrada}/{obs.tokens_saida}</div>
            <div><div className="text-xs text-muted-foreground">Custo total</div>{obs.custo_total_usd === null ? "preço não configurado" : `US$ ${obs.custo_total_usd}`}</div>
            <div><div className="text-xs text-muted-foreground">Escalonamento</div>{obs.taxa_escalonamento}%</div>
            <div><div className="text-xs text-muted-foreground">Injeções bloqueadas</div>{obs.injecoes_bloqueadas}</div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
