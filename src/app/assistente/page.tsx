"use client";

import { useEffect, useRef, useState } from "react";
import { LoaderCircle, Send, ShieldAlert, UserRound } from "lucide-react";
import { Simbolo } from "@/components/trevolt/logo";
import { SiteShell } from "@/components/trevolt/site-shell";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api } from "@/lib/api";
import { useCasoDemo } from "@/lib/demo/store";
import { cn } from "@/lib/utils";
import type { RespostaAgente } from "@/lib/types";
import type { MensagemChat } from "@/lib/types";

type Item = MensagemChat & { meta?: RespostaAgente };

const SUGESTOES = [
  "Vou economizar 25% na conta inteira?",
  "Se faltar luz, quem resolve?",
  "Perco a Tarifa Social se migrar?",
  "Quero falar com uma pessoa",
];

const SAUDACAO: Item = {
  papel: "agente",
  texto: "Oi! Sou a Assistente Trevolt, uma IA. Posso explicar sua conta, a simulação e os passos da migração. Se preferir, chamo uma pessoa do Especialista Trevolt.",
};

export default function AssistentePage() {
  const { caso } = useCasoDemo();
  const [itens, setItens] = useState<Item[]>([SAUDACAO]);
  const [texto, setTexto] = useState("");
  const [enviando, setEnviando] = useState(false);
  const fim = useRef<HTMLDivElement>(null);
  const faturaId = caso.faturaId ?? "fat-001";
  const pediuPessoa = itens.some((i) => i.meta?.escalar_humano);

  useEffect(() => {
    fim.current?.scrollIntoView({ behavior: "smooth" });
  }, [itens]);

  async function enviar(msg: string) {
    if (!msg.trim() || enviando) return;
    const historico: Item[] = [...itens, { papel: "cliente", texto: msg.trim() }];
    setItens(historico);
    setTexto("");
    setEnviando(true);
    try {
      // O histórico enviado começa na 1ª mensagem do cliente (a saudação é da UI).
      const msgs = historico.slice(1).map(({ papel, texto }) => ({ papel, texto }));
      const r = await api.perguntarAgente(msgs, faturaId);
      setItens((h) => [...h, { papel: "agente", texto: r.resposta, meta: r }]);
    } catch (e) {
      setItens((h) => [...h, { papel: "agente", texto: `Não consegui responder agora. ${(e as Error).message}` }]);
    } finally {
      setEnviando(false);
    }
  }

  return (
    <SiteShell
      topo={<span />}
      acao={
        <form
          className="flex items-center gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            enviar(texto);
          }}
        >
          <Label htmlFor="msg" className="sr-only">Mensagem</Label>
          <Input id="msg" className="h-[38px] rounded-full px-3.5 text-[13px]" value={texto} onChange={(e) => setTexto(e.target.value)} placeholder="Mensagem" />
          <Button type="submit" size="icon" className="rounded-full" disabled={enviando || !texto.trim()} aria-label="Enviar">
            <Send />
          </Button>
        </form>
      }
    >
      <div className="-m-4 flex flex-1 flex-col">
        <div className="flex h-16 flex-none items-center gap-2.5 border-b px-4">
          <span className="flex size-[38px] flex-none items-center justify-center rounded-full border bg-card">
            <Simbolo className="h-[15px] w-6" />
          </span>
          <div>
            <div className="font-display text-base font-medium">Trevolt</div>
            <div className="text-xs text-muted-foreground">Assistente Trevolt, uma IA</div>
          </div>
          <Button variant="link" className="ml-auto h-auto p-0 text-[13px]" onClick={() => enviar("Quero falar com uma pessoa")}>
            Falar com uma pessoa
          </Button>
        </div>
        <div className="flex flex-1 flex-col gap-2 bg-secondary p-3.5" aria-live="polite">
          {itens.map((m, i) => (
            <div key={i} className={cn("flex max-w-[85%] flex-col gap-1", m.papel === "cliente" ? "items-end self-end" : "self-start")}>
              <div
                className={cn(
                  "px-3 py-2.5 text-sm leading-[1.45] whitespace-pre-line",
                  m.papel === "cliente"
                    ? "rounded-[14px_14px_4px_14px] border border-[#e9c9b5] bg-accent"
                    : "rounded-[14px_14px_14px_4px] border bg-card"
                )}
              >
                {m.texto}
              </div>
              {m.meta && (
                <div className="flex flex-wrap gap-1">
                  {m.meta.fontes.map((f) => (
                    <Badge key={f} variant="secondary">{f}</Badge>
                  ))}
                  {m.meta.escalar_humano && <Badge variant="atencao"><UserRound /> Especialista Trevolt vai assumir</Badge>}
                  {m.meta.alerta_injecao && <Badge variant="destructive"><ShieldAlert /> Instrução suspeita bloqueada</Badge>}
                </div>
              )}
            </div>
          ))}
          {enviando && <LoaderCircle className="size-4 animate-spin text-muted-foreground" aria-label="Digitando" />}
          {pediuPessoa && (
            <Alert variant="warning">
              <AlertDescription>Encaminhei para o Especialista Trevolt. Você será avisado quando uma pessoa responder.</AlertDescription>
            </Alert>
          )}
          <div className="flex flex-wrap gap-2">
            {SUGESTOES.map((s) => (
              <Button key={s} variant="outline" className="h-auto min-h-11 rounded-full px-3.5 py-2 text-left text-sm whitespace-normal" onClick={() => enviar(s)}>
                {s}
              </Button>
            ))}
          </div>
          <div ref={fim} />
        </div>
      </div>
    </SiteShell>
  );
}
