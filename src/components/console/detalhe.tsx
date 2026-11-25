"use client";

import { useState } from "react";
import Link from "next/link";
import { CircleCheck, Clock, Keyboard, ShieldCheck } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useCasoDemo } from "@/lib/demo/store";
import type { Caso } from "@/lib/types";
import { cn, formatarBRL, formatarData } from "@/lib/utils";
import { ATOS, DevolverDialog, ExecutarDialog, RejeitarDialog, type Ato } from "./acoes";
import { FORNECEDOR, OFERTAS, OPERADOR, ROTULO_FASE, faseDe, nomeCurto, numeroCaso, useSobreposicoes, type Fase } from "./sim";

const ORDEM: Partial<Record<Fase, number>> = { consumidor: -1, ato1: 0, espera_ccv: 1, ato2: 2, espera_distribuidora: 3, ato3: 4, concluido: 5 };
const ATO_DA_FASE: Partial<Record<Fase, Ato>> = { ato1: 1, ato2: 2, ato3: 3 };
const eyebrow = "text-xs font-bold tracking-[.08em] text-muted-foreground uppercase";

function Kv({ rotulo, children, largo }: { rotulo: string; children: React.ReactNode; largo?: boolean }) {
  return (
    <div className={largo ? "sm:col-span-2" : undefined}>
      <dt className="mb-0.5 text-muted-foreground">{rotulo}</dt>
      <dd className="font-semibold">{children}</dd>
    </div>
  );
}

function Item({ feito, children }: { feito: boolean; children: React.ReactNode }) {
  return (
    <Badge variant="outline" className={feito ? "gap-1.5" : "gap-1.5 border-dashed text-muted-foreground"}>
      {feito && <CircleCheck className="size-3.5" aria-hidden="true" />}
      {children}
      {!feito && <span className="font-normal">· pendente</span>}
    </Badge>
  );
}

export function DetalheCaso({ caso, recarregar }: { caso: Caso; recarregar: () => void }) {
  const { mapa, atualizar } = useSobreposicoes();
  const { caso: demo } = useCasoDemo();
  const [vista, setVista] = useState<"caso" | "atos">("caso");
  const [historico, setHistorico] = useState(false);
  const [dialogo, setDialogo] = useState<"executar" | "devolver" | "rejeitar" | null>(null);

  const sobre = mapa[caso.id];
  const fase = faseDe(caso, sobre);
  const ato = ATO_DA_FASE[fase];
  const oferta = caso.oferta_id ? OFERTAS[caso.oferta_id] : undefined;
  const aberto = !["concluido", "rejeitado", "consumidor"].includes(fase);
  // "Dados digitados": a origem só existe no estado da demo do consumidor.
  const digitado = demo.origem === "digitado";
  const parado = fase === "devolvido" || fase === "rejeitado";
  const idx = parado ? (ORDEM[sobre?.anterior ?? "ato1"] ?? 0) : (ORDEM[fase] ?? -1);

  const aposAto = (a: Ato, protocolo: string) => {
    const prox: Fase = a === 1 ? "espera_ccv" : a === 2 ? "espera_distribuidora" : "concluido";
    atualizar(caso.id, { fase: prox, protocolo }, `${ATOS[a].titulo} executado por ${OPERADOR}. Protocolo ${protocolo}.`);
    recarregar();
  };

  const titulo = `Caso ${numeroCaso(caso.id)} · ${nomeCurto(caso.cliente)}`;

  const botoes = aberto && (
    <div className="flex flex-wrap gap-2.5">
      {ato && (
        <Button className="min-h-12 px-6" onClick={() => setDialogo("executar")}>
          Aprovar e executar
        </Button>
      )}
      {fase !== "devolvido" && (
        <Button variant="outline" className="min-h-12" onClick={() => setDialogo("devolver")}>
          Devolver ao consumidor
        </Button>
      )}
      {vista === "caso" && (
        <Button variant="ghost" className="min-h-12" onClick={() => setDialogo("rejeitar")}>
          Rejeitar
        </Button>
      )}
    </div>
  );

  const avisoEstado = (
    <>
      {fase === "consumidor" && (
        <Alert>
          <Clock />
          <AlertTitle>Com o consumidor</AlertTitle>
          <AlertDescription>{caso.proxima_acao}. Ainda não há ato para aprovar neste caso.</AlertDescription>
        </Alert>
      )}
      {fase === "espera_ccv" && (
        <Alert>
          <Clock />
          <AlertTitle>Esperando a assinatura do CCV</AlertTitle>
          <AlertDescription>
            <p>Aprovado por {caso.aprovado_por?.operador ?? OPERADOR}. O consumidor e o varejista assinam por e-mail.</p>
            <Button size="sm" variant="outline" className="mt-2" onClick={() => atualizar(caso.id, { fase: "ato2" }, "CCV assinado pelas duas partes (simulado).")}>
              Simular CCV assinado
            </Button>
          </AlertDescription>
        </Alert>
      )}
      {fase === "espera_distribuidora" && (
        <Alert>
          <Clock />
          <AlertTitle>Distribuidora validando</AlertTitle>
          <AlertDescription>
            <p>Protocolo {sobre?.protocolo}. A distribuidora tem até 5 dias úteis. Avisamos quando a migração entrar em vigor.</p>
            <Button size="sm" variant="outline" className="mt-2" onClick={() => atualizar(caso.id, { fase: "ato3" }, "Distribuidora validou; migração em vigor (simulado).")}>
              Simular validação da distribuidora
            </Button>
          </AlertDescription>
        </Alert>
      )}
      {fase === "devolvido" && (
        <Alert variant="warning">
          <AlertTitle>Devolvido ao consumidor · {sobre?.motivo}</AlertTitle>
          <AlertDescription>
            <p>“{sobre?.mensagem}”</p>
            <Button size="sm" variant="outline" className="mt-2" onClick={() => atualizar(caso.id, { fase: sobre?.anterior, anterior: undefined }, "Consumidor respondeu (simulado). Caso voltou para a fila.")}>
              Simular resposta do consumidor
            </Button>
          </AlertDescription>
        </Alert>
      )}
      {fase === "rejeitado" && (
        <Alert variant="destructive">
          <AlertTitle>Caso rejeitado · {sobre?.motivo}</AlertTitle>
          <AlertDescription>Nada foi executado na CCEE. Os dados do consumidor são apagados em 30 dias.</AlertDescription>
        </Alert>
      )}
      {fase === "concluido" && (
        <Alert variant="success">
          <CircleCheck />
          <AlertTitle>Caso concluído</AlertTitle>
          <AlertDescription>Migração em vigor e pacote entregue ao CRM{sobre?.protocolo ? ` (protocolo ${sobre.protocolo})` : ""}.</AlertDescription>
        </Alert>
      )}
    </>
  );

  const dialogos = (
    <>
      {ato && (
        <ExecutarDialog key={`${caso.id}-${ato}`} caso={caso} ato={ato} aberto={dialogo === "executar"} onAbertoChange={(v) => setDialogo(v ? "executar" : null)} onConcluido={(p) => aposAto(ato, p)} />
      )}
      <DevolverDialog
        key={`dev-${caso.id}`}
        caso={caso}
        aberto={dialogo === "devolver"}
        onAbertoChange={(v) => setDialogo(v ? "devolver" : null)}
        onConfirmar={(motivo, mensagem) => atualizar(caso.id, { fase: "devolvido", anterior: fase, motivo, mensagem }, `Devolvido ao consumidor: ${motivo}.`)}
      />
      <RejeitarDialog
        key={`rej-${caso.id}`}
        caso={caso}
        aberto={dialogo === "rejeitar"}
        onAbertoChange={(v) => setDialogo(v ? "rejeitar" : null)}
        onConfirmar={(motivo, obs) => atualizar(caso.id, { fase: "rejeitado", anterior: fase, motivo, mensagem: obs }, `Caso rejeitado: ${motivo}.`)}
      />
    </>
  );

  /* ---------- Prancha 10b: os 3 atos e as esperas ---------- */
  if (vista === "atos") {
    const marca = (i: number) =>
      i < idx ? (
        <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-grafite text-white"><CircleCheck className="size-3" aria-hidden="true" /></span>
      ) : i === idx ? (
        <span className="mt-0.5 size-5 shrink-0 rounded-full border-[3px] border-primary bg-card" />
      ) : (
        <span className="mt-0.5 size-5 shrink-0 rounded-full border-[1.5px] border-dashed border-[#a6a194]" />
      );
    const espera = "ml-5 border-l-2 border-dashed border-[#cfc5b0] py-0.5 pl-4 text-xs leading-snug text-muted-foreground";
    const cartaoAto = (i: number, titulo: string, sub: React.ReactNode) => (
      <Card className={cn("flex-row items-start gap-3 p-3", i === idx && !parado && "border-2 border-primary")}>
        {marca(i)}
        <div>
          <div className="text-sm font-bold">{titulo}</div>
          <div className="mt-0.5 text-xs text-muted-foreground">{sub}</div>
        </div>
      </Card>
    );
    return (
      <div className="flex flex-wrap items-start gap-6">
        <div className="flex min-w-[280px] flex-[0_1_340px] flex-col gap-2">
          <button className="mb-1 self-start text-sm font-semibold text-primary hover:underline" onClick={() => setVista("caso")}>
            ← Voltar ao caso
          </button>
          <h2 className="mb-1 text-xl font-bold">Os 3 atos e as esperas</h2>
          {cartaoAto(0, "1 · Solicitar o CCV", idx > 0 ? "Concluído · a CCEE enviou o link por e-mail" : idx === 0 ? <b className="text-primary">APROVAR AGORA</b> : "Exige a aprovação de um usuário do varejista.")}
          <div className={espera}>Espera automática: assinaturas por e-mail (consumidor e varejista). {idx > 1 && <b>Concluída.</b>}</div>
          {cartaoAto(2, "2 · Solicitar a migração", idx === 2 ? <b className="text-primary">APROVAR AGORA</b> : idx > 2 ? "Concluído" : "Depois da assinatura do CCV.")}
          <div className={espera}>Espera automática: validação da distribuidora, até 5 dias úteis. Depois, representação ativa e migração em vigor.</div>
          {cartaoAto(4, "3 · Entregar ao CRM", idx === 4 ? <b className="text-primary">APROVAR AGORA</b> : "No fim, com a migração em vigor. Também exige aprovação.")}
        </div>
        <div className="flex min-w-0 flex-[999_1_560px] flex-col gap-5">
          <Card className="gap-4 p-6">
            <div className={eyebrow}>{ato ? `Ato ${ato} de 3` : ROTULO_FASE[fase]}</div>
            <h2 className="text-[26px] font-bold">{ato ? ATOS[ato].titulo : titulo}</h2>
            {avisoEstado}
            {ato === 2 && (
              <>
                <dl className="grid gap-x-6 gap-y-3 text-[13px] sm:grid-cols-2">
                  <Kv rotulo="Unidade consumidora">0042 8815 3</Kv>
                  <Kv rotulo="Distribuidora">Distribuidora Sudeste</Kv>
                  <Kv rotulo="Representante">{FORNECEDOR}</Kv>
                  <Kv rotulo="Perfil de contabilização">Comercial A</Kv>
                  <Kv rotulo="Mês de início pretendido">Janeiro/2028</Kv>
                  <Kv rotulo="Data da denúncia na distribuidora">10/11/2027</Kv>
                  <Kv largo rotulo="E-mail do representante legal (verificado)">nome@empresa.com.br</Kv>
                  <Kv largo rotulo="Como será enviado">API da CCEE, com a credencial do {FORNECEDOR} guardada no cofre</Kv>
                </dl>
                <Alert variant="warning">
                  <AlertDescription><b>Corte do mês:</b> validado até 16/12/2027 entra em janeiro/2028. Depois disso, pode ir para o mês seguinte.</AlertDescription>
                </Alert>
              </>
            )}
            {botoes}
          </Card>
          <h3 className="text-lg font-bold">O que acontece depois de clicar</h3>
          <p className="-mt-3 text-sm text-muted-foreground">Ao clicar em “Aprovar e executar” abre a confirmação: Confirmar a execução? Depois, Enviando…, e então “Solicitação enviada” (com o protocolo) ou “Não foi possível concluir”, com “Tentar de novo”. O caso só avança quando a CCEE aceita; se falhar, nada é marcado como enviado.</p>
          <Card className="gap-3 p-6">
            <h3 className="text-lg font-bold">Se o consumidor não assinar o CCV (depois do ato 1)</h3>
            <div className="flex flex-wrap gap-3">
              {[
                ["D+0", "A CCEE envia o link por e-mail"],
                ["D+2", "Lembrete 1 no canal do consumidor"],
                ["D+5", "Lembrete 2 no canal do consumidor"],
                ["D+10", "Volta à fila “Com o consumidor” e avisa o usuário do varejista"],
              ].map(([d, t]) => (
                <Card key={d} className={cn("min-w-[140px] flex-1 gap-1 p-3", d === "D+10" && "border-2 border-primary")}>
                  <div className={cn(eyebrow, d === "D+10" && "text-primary")}>{d}</div>
                  <div className="text-[13px]">{t}</div>
                </Card>
              ))}
            </div>
            <p className="text-xs leading-normal text-muted-foreground">
              Prazos propostos por nós. A norma consultada não fixa validade do link da CCEE. Um CCV assinado perto do corte pode empurrar a migração para o mês seguinte.
            </p>
          </Card>
        </div>
        {dialogos}
      </div>
    );
  }

  /* ---------- Prancha 10: caso selecionado ---------- */
  return (
    <div className="flex flex-col gap-4">
      <Card className="gap-[18px] p-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h1 className="text-[28px] font-bold">{titulo}</h1>
          {oferta && (
            <Badge variant="verificado">
              <ShieldCheck className="size-3.5" aria-hidden="true" />
              Oferta verificada · {oferta.nome} · {oferta.prazo} meses
            </Badge>
          )}
        </div>
        {ato ? (
          <div className="flex flex-col gap-1.5">
            <div className={eyebrow}>Próximo ato · {ato} de 3</div>
            <h2 className="text-2xl font-bold">{ato === 2 ? "Solicitar a migração à CCEE" : ATOS[ato].titulo}</h2>
            <p className="max-w-[620px] text-sm leading-[1.55] text-muted-foreground">
              {ato === 1 && "A CCEE envia o link do CCV por e-mail ao consumidor e ao varejista. A plataforma não consegue desfazer o envio."}
              {ato === 2 && "A CCEE avisa a distribuidora, que tem até 5 dias úteis para validar. O CCV passa a valer quando ela aprova. A plataforma não consegue desfazer o envio."}
              {ato === 3 && "A migração está em vigor. Falta entregar o pacote do caso ao CRM do varejista."}
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-1.5">
            <div className={eyebrow}>{ROTULO_FASE[fase]}</div>
          </div>
        )}
        {avisoEstado}
        {digitado && (
          <Alert variant="warning">
            <Keyboard />
            <AlertTitle>Dados digitados</AlertTitle>
            <AlertDescription>O consumidor digitou os dados da conta, sem enviar a fatura. Confira com ele antes de aprovar.</AlertDescription>
          </Alert>
        )}
        <div className="flex flex-wrap gap-2">
          <Item feito={idx >= 2}>CCV assinado</Item>
          <Item feito={idx >= 0}>Ciência dos riscos</Item>
          <Item feito={idx >= 0}>Aceite comercial</Item>
        </div>
        {ato === 2 && (
          <Alert variant="warning">
            <AlertDescription>
              <b>Corte do mês:</b> para começar em janeiro/2028, o processo precisa estar validado até 16/12/2027 (12 dias úteis antes). Depois disso, a migração pode ir para o mês seguinte.
            </AlertDescription>
          </Alert>
        )}
        {caso.alerta_beneficio && (
          <Alert variant="warning">
            <AlertDescription><b>Benefício na conta:</b> a conta tem benefício (TSEE, irrigação ou aquicultura) que se perde ao migrar. O consumidor foi avisado antes do aceite.</AlertDescription>
          </Alert>
        )}
        {botoes}
        <Separator />
        <div className="flex flex-wrap gap-x-[22px] gap-y-1 text-[13px] font-semibold">
          <button className="text-primary hover:underline" onClick={() => setVista("atos")}>Ver os 3 atos do caso</button>
          <Link href="/console/permissoes" className="text-primary hover:underline">Permissões</Link>
          <button className="text-primary hover:underline" onClick={() => setHistorico((v) => !v)} aria-expanded={historico}>Ver histórico do caso</button>
        </div>
      </Card>

      {historico && (
        <Card className="gap-3 p-6" id="historico">
          <h3 className="text-lg font-bold">Histórico do caso</h3>
          <dl className="grid gap-x-6 gap-y-3 text-[13px] sm:grid-cols-2">
            <Kv rotulo="Cliente">{nomeCurto(caso.cliente)}</Kv>
            <Kv rotulo="Segmento · UF">{caso.segmento} · {caso.uf}</Kv>
            <Kv rotulo="Economia líquida estimada por mês">{formatarBRL(caso.economia_liquida_mensal_rs)} (cenário base, em faixa; não é garantia)</Kv>
            <Kv rotulo="Risco de desistência">{caso.risco_desistencia}{caso.motivo_risco ? ` · ${caso.motivo_risco}` : ""}</Kv>
            {caso.ciencia && <Kv largo rotulo="Ciência dos riscos">{caso.ciencia.itens.length} itens em {formatarData(caso.ciencia.registrada_em)} · sha256 <span className="font-mono text-[11px] break-all">{caso.ciencia.hash}</span></Kv>}
          </dl>
          <Separator />
          <ul className="space-y-2 text-sm">
            <li><span className="text-muted-foreground">{formatarData(caso.criado_em)}</span> · Caso aberto com a oferta {oferta?.nome ?? caso.oferta_id ?? "—"}.</li>
            {caso.ciencia && <li><span className="text-muted-foreground">{formatarData(caso.ciencia.registrada_em)}</span> · Ciência dos riscos registrada.</li>}
            {caso.aprovado_por && <li><span className="text-muted-foreground">{formatarData(caso.aprovado_por.em)}</span> · Aprovado por {caso.aprovado_por.operador}.</li>}
            {(sobre?.historico ?? []).map((h) => (
              <li key={h.em + h.texto}><span className="text-muted-foreground">{formatarData(h.em)}</span> · {h.texto} <Badge variant="outline">simulado</Badge></li>
            ))}
          </ul>
        </Card>
      )}
      {dialogos}
    </div>
  );
}
