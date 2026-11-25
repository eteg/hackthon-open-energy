"use client";

import { useState } from "react";
import { CircleCheck, Loader2, TriangleAlert } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/lib/api";
import type { Caso } from "@/lib/types";
import { FORNECEDOR, OPERADOR, numeroCaso, nomeCurto } from "./sim";

export type Ato = 1 | 2 | 3;

export const ATOS: Record<Ato, { titulo: string; confirmar: string; passos: string[]; sucesso: (p: string) => string; proximo: string }> = {
  1: {
    titulo: "Solicitar o CCV",
    confirmar: `Você vai solicitar o CCV à CCEE em nome do ${FORNECEDOR}. A CCEE envia o link de assinatura por e-mail ao consumidor e ao varejista.`,
    passos: ["Autenticar com a credencial (JWT)", "Enviar a solicitação", "Registrar o protocolo"],
    sucesso: (p) => `Protocolo ${p}. A CCEE enviou o link por e-mail. O consumidor foi avisado.`,
    proximo: "Próximo: espera automática pela assinatura do CCV.",
  },
  2: {
    titulo: "Solicitar a migração",
    confirmar: `Você vai solicitar a migração à CCEE em nome do ${FORNECEDOR}. O varejista responde pelos dados perante a CCEE, e a plataforma não desfaz o envio.`,
    passos: ["Autenticar com a credencial (JWT)", "Enviar a solicitação", "Registrar o protocolo"],
    sucesso: (p) => `Protocolo ${p}. A distribuidora tem até 5 dias úteis para validar. O consumidor foi avisado.`,
    proximo: "Próximo: acompanhamento automático; você só volta no ato 3.",
  },
  3: {
    titulo: "Entregar ao CRM",
    confirmar: `Você vai entregar o pacote do caso ao CRM do ${FORNECEDOR}. A migração já está em vigor.`,
    passos: ["Montar o pacote do caso", "Enviar ao CRM", "Registrar a entrega"],
    sucesso: (p) => `Protocolo ${p}. O pacote do caso foi entregue ao CRM.`,
    proximo: "O caso está concluído.",
  },
};

const pausa = (ms: number) => new Promise((r) => setTimeout(r, ms));

function protocoloDe(caso: Caso, ato: Ato) {
  const n = caso.id.replace(/\D/g, "").padStart(4, "0");
  return `2027-${n}-${100 + ato * 7}`;
}

type Estado = "confirmar" | "executando" | "concluido" | "falhou";

/** Confirma e executa um ato. Ato 1 chama a aprovação REAL (api.aprovarCaso); a chamada à CCEE é simulada. */
export function ExecutarDialog({
  caso,
  ato,
  aberto,
  onAbertoChange,
  onConcluido,
}: {
  caso: Caso;
  ato: Ato;
  aberto: boolean;
  onAbertoChange: (v: boolean) => void;
  onConcluido: (protocolo: string) => void;
}) {
  const info = ATOS[ato];
  const [estado, setEstado] = useState<Estado>("confirmar");
  const [passo, setPasso] = useState(0);
  const [falhar, setFalhar] = useState(false);
  const [motivoFalha, setMotivoFalha] = useState("");
  const [protocolo, setProtocolo] = useState("");

  function mudar(v: boolean) {
    if (estado === "executando") return;
    if (!v) {
      if (estado === "concluido") onConcluido(protocolo);
      setEstado("confirmar");
      setPasso(0);
    }
    onAbertoChange(v);
  }

  async function executar() {
    setEstado("executando");
    setPasso(0);
    try {
      for (let i = 0; i < info.passos.length; i++) {
        setPasso(i);
        await pausa(700);
        if (falhar && i === 1) throw new Error("API da CCEE indisponível (503). Tente novamente em instantes.");
      }
      // HITL real: só depois de a CCEE (simulada) aceitar, a aprovação humana é gravada no caso.
      if (ato === 1) await api.aprovarCaso(caso.id, OPERADOR);
      setPasso(info.passos.length);
      setProtocolo(protocoloDe(caso, ato));
      setEstado("concluido");
    } catch (e) {
      setMotivoFalha((e as Error).message);
      setEstado("falhou");
    }
  }

  return (
    <Dialog open={aberto} onOpenChange={mudar}>
      <DialogContent showCloseButton={estado !== "executando"}>
        {estado === "confirmar" && (
          <>
            <DialogHeader>
              <DialogTitle>Confirmar a execução?</DialogTitle>
              <DialogDescription>{info.confirmar}</DialogDescription>
            </DialogHeader>
            <p className="text-sm text-muted-foreground">
              {numeroCaso(caso.id)} · {nomeCurto(caso.cliente)}. Fica registrado: {OPERADOR}, data e hora e a versão das regras.
            </p>
            <div className="flex items-center justify-between gap-3 rounded-md border border-dashed p-3">
              <Label htmlFor="falhar" className="text-xs leading-snug font-normal text-muted-foreground">
                Simular falha da API da CCEE (só nesta demonstração)
              </Label>
              <Switch id="falhar" checked={falhar} onCheckedChange={setFalhar} />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => mudar(false)}>
                Cancelar
              </Button>
              <Button onClick={executar}>Confirmar e executar</Button>
            </DialogFooter>
          </>
        )}
        {(estado === "executando" || estado === "concluido" || estado === "falhou") && (
          <>
            <DialogHeader>
              <DialogTitle>
                {estado === "executando" && "Enviando…"}
                {estado === "concluido" && "Solicitação enviada"}
                {estado === "falhou" && "Não foi possível concluir"}
              </DialogTitle>
              <DialogDescription>
                {estado === "executando" && "Você pode sair desta tela. Avisamos quando terminar."}
                {estado === "concluido" && `${info.sucesso(protocolo)} ${info.proximo}`}
                {estado === "falhou" && `Motivo: ${motivoFalha}. O caso continua no ato ${ato} e nada foi marcado como enviado.`}
              </DialogDescription>
            </DialogHeader>
            <ol className="space-y-2 text-sm" aria-live="polite">
              {info.passos.map((p, i) => {
                const feito = i < passo || estado === "concluido";
                const atual = i === passo && estado === "executando";
                const erro = estado === "falhou" && i === passo;
                return (
                  <li key={p} className="flex items-center gap-2">
                    {feito ? (
                      <CircleCheck className="size-4" aria-hidden="true" />
                    ) : atual ? (
                      <Loader2 className="size-4 animate-spin text-primary" aria-hidden="true" />
                    ) : erro ? (
                      <TriangleAlert className="size-4 text-destructive" aria-hidden="true" />
                    ) : (
                      <span className="size-4 rounded-full border border-dashed" aria-hidden="true" />
                    )}
                    <span className={feito || atual ? "" : "text-muted-foreground"}>{p}</span>
                    <span className="ml-auto text-xs text-muted-foreground">
                      {feito ? "Feito" : atual ? "Em andamento" : erro ? "Falhou" : "Aguardando"}
                    </span>
                  </li>
                );
              })}
            </ol>
            <DialogFooter>
              {estado === "concluido" && <Button onClick={() => mudar(false)}>Fechar</Button>}
              {estado === "falhou" && (
                <>
                  <Button variant="outline" onClick={() => mudar(false)}>
                    Fechar
                  </Button>
                  <Button
                    onClick={() => {
                      setFalhar(false);
                      void executar();
                    }}
                  >
                    Tentar de novo
                  </Button>
                </>
              )}
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

const MOTIVOS_DEVOLVER: Record<string, string> = {
  "E-mail do representante não verificado": "Para seguir, precisamos verificar o e-mail do representante legal. Pode confirmar por aqui mesmo?",
  "Falta o contrato social": "Para seguir, precisamos do contrato social da empresa. Pode enviar por aqui mesmo?",
  "Documento ilegível": "O documento enviado ficou ilegível. Pode enviar uma foto ou um PDF mais nítido?",
  "Dado diferente da fatura": "Um dado informado é diferente do que está na fatura. Pode conferir e corrigir?",
  Outro: "",
};

export function DevolverDialog({
  caso,
  aberto,
  onAbertoChange,
  onConfirmar,
}: {
  caso: Caso;
  aberto: boolean;
  onAbertoChange: (v: boolean) => void;
  onConfirmar: (motivo: string, mensagem: string) => void;
}) {
  const [motivo, setMotivo] = useState("Falta o contrato social");
  const [mensagem, setMensagem] = useState(MOTIVOS_DEVOLVER["Falta o contrato social"]);
  const [confirmando, setConfirmando] = useState(false);
  const pronto = mensagem.trim().length >= 5;

  return (
    <Dialog
      open={aberto}
      onOpenChange={(v) => {
        setConfirmando(false);
        onAbertoChange(v);
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Devolver ao consumidor</DialogTitle>
          <DialogDescription>
            {numeroCaso(caso.id)} · {nomeCurto(caso.cliente)}. Use quando falta algo para seguir. O caso volta para a fila quando ele responder.
          </DialogDescription>
        </DialogHeader>
        {!confirmando ? (
          <>
            <div className="space-y-1.5">
              <Label htmlFor="motivo-dev">Motivo</Label>
              <Select
                value={motivo}
                onValueChange={(v) => {
                  setMotivo(v);
                  setMensagem(MOTIVOS_DEVOLVER[v]);
                }}
              >
                <SelectTrigger id="motivo-dev" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.keys(MOTIVOS_DEVOLVER).map((m) => (
                    <SelectItem key={m} value={m}>
                      {m}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="msg-dev">Mensagem ao consumidor (pode editar)</Label>
              <Textarea id="msg-dev" value={mensagem} onChange={(e) => setMensagem(e.target.value)} rows={4} />
              <p className="text-xs text-muted-foreground">Vai pelo canal que o consumidor usa: WhatsApp ou site.</p>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => onAbertoChange(false)}>
                Cancelar
              </Button>
              <Button disabled={!pronto} onClick={() => setConfirmando(true)}>
                Enviar ao consumidor
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <Alert variant="warning">
              <TriangleAlert />
              <AlertTitle>Confirmar a devolução?</AlertTitle>
              <AlertDescription>O consumidor recebe a mensagem agora e o caso sai da fila “Para aprovar”.</AlertDescription>
            </Alert>
            <DialogFooter>
              <Button variant="outline" onClick={() => setConfirmando(false)}>
                Voltar
              </Button>
              <Button
                onClick={() => {
                  onConfirmar(motivo, mensagem.trim());
                  setConfirmando(false);
                  onAbertoChange(false);
                }}
              >
                Confirmar e devolver
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

const MOTIVOS_REJEITAR = ["Fora da elegibilidade", "Oferta indisponível", "Suspeita de fraude", "Outro"];

export function RejeitarDialog({
  caso,
  aberto,
  onAbertoChange,
  onConfirmar,
}: {
  caso: Caso;
  aberto: boolean;
  onAbertoChange: (v: boolean) => void;
  onConfirmar: (motivo: string, observacao: string) => void;
}) {
  const [motivo, setMotivo] = useState("");
  const [obs, setObs] = useState("");
  const [confirmando, setConfirmando] = useState(false);

  return (
    <Dialog
      open={aberto}
      onOpenChange={(v) => {
        setConfirmando(false);
        onAbertoChange(v);
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Rejeitar o caso</DialogTitle>
          <DialogDescription>
            {numeroCaso(caso.id)} · {nomeCurto(caso.cliente)}. Encerra o caso sem executar nada. O motivo é obrigatório e fica registrado.
          </DialogDescription>
        </DialogHeader>
        {!confirmando ? (
          <>
            <div className="space-y-1.5">
              <Label htmlFor="motivo-rej">Motivo (obrigatório)</Label>
              <Select value={motivo} onValueChange={setMotivo}>
                <SelectTrigger id="motivo-rej" className="w-full">
                  <SelectValue placeholder="Escolha um motivo" />
                </SelectTrigger>
                <SelectContent>
                  {MOTIVOS_REJEITAR.map((m) => (
                    <SelectItem key={m} value={m}>
                      {m}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="obs-rej">Observação interna (opcional)</Label>
              <Textarea id="obs-rej" value={obs} onChange={(e) => setObs(e.target.value)} rows={3} />
              <p className="text-xs text-muted-foreground">O consumidor recebe uma explicação simples. Os dados dele são apagados em 30 dias.</p>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => onAbertoChange(false)}>
                Cancelar
              </Button>
              <Button variant="destructive" disabled={!motivo} onClick={() => setConfirmando(true)}>
                Rejeitar o caso
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <Alert variant="warning">
              <TriangleAlert />
              <AlertTitle>Esta ação não pode ser desfeita</AlertTitle>
              <AlertDescription>O caso será encerrado com o motivo “{motivo}”. Nada será executado na CCEE.</AlertDescription>
            </Alert>
            <DialogFooter>
              <Button variant="outline" onClick={() => setConfirmando(false)}>
                Voltar
              </Button>
              <Button
                variant="destructive"
                onClick={() => {
                  onConfirmar(motivo, obs.trim());
                  setConfirmando(false);
                  onAbertoChange(false);
                }}
              >
                Confirmar e rejeitar
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
