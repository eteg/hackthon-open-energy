"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Copy, LoaderCircle } from "lucide-react";
import { toast } from "sonner";
import { SiteShell } from "@/components/trevolt/site-shell";
import { LinhaDoTempo, type EtapaTempo } from "@/components/trevolt/linha-do-tempo";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { api, ErroApi } from "@/lib/api";
import { useCasoDemo } from "@/lib/demo/store";
import { formatarData } from "@/lib/utils";
import type { CasoPublico, Etapa } from "@/lib/types";

const ATUALIZA_A_CADA_MS = 15_000;

/** Quantas etapas da linha do tempo já foram concluídas, pela etapa REAL do caso (a mesma que o fornecedor mexe no console). */
const CONCLUIDAS: Partial<Record<Etapa, number>> = { aguardando_aprovacao: 1, escalado_humano: 1, documentacao: 2, formalizado: 6 };

function linha(concluidas: number): EtapaTempo[] {
  const t = (i: number, titulo: string, atual: string): EtapaTempo => ({
    titulo,
    estado: i < concluidas ? "feito" : i === concluidas ? "atual" : "pendente",
    rotulo: i < concluidas ? "Concluído" : i === concluidas ? atual : "Aguardando",
  });
  return [
    t(0, "Aceite assinado", ""),
    t(1, "Conferência pelo fornecedor", "Em andamento"),
    t(2, "Assinatura do CCV (e-mail da CCEE)", "Aguardando você"),
    t(3, "Solicitação da migração à CCEE", "Em andamento"),
    t(4, "Validação da distribuidora (até 5 dias úteis)", "Em andamento"),
    t(5, "Migração em vigor", "Em vigor"),
  ];
}

const TITULO: Record<Etapa, string> = {
  simulado: "Seu pedido ainda não foi concluído",
  ciencia_pendente: "Seu pedido ainda não foi concluído",
  aguardando_aprovacao: "O fornecedor está conferindo o seu pedido",
  escalado_humano: "Um especialista da Trevolt vai falar com você",
  documentacao: "Falta a sua assinatura no contrato da CCEE",
  formalizado: "Sua migração foi formalizada",
};

type Estado = { tipo: "carregando" } | { tipo: "ok"; caso: CasoPublico } | { tipo: "nao_encontrado" } | { tipo: "erro" };

/** Acompanhamento pelo link: o andamento vem do servidor (nada fica só neste navegador) e atualiza sozinho. */
export function Acompanhamento({ id }: { id: string }) {
  const { caso: local } = useCasoDemo();
  const [estado, setEstado] = useState<Estado>({ tipo: "carregando" });
  const [reenvio, setReenvio] = useState(false);

  const carregar = useCallback(async () => {
    try {
      setEstado({ tipo: "ok", caso: await api.acompanharCaso(id) });
    } catch (e) {
      // Falha ao atualizar não apaga o que já está na tela: só a primeira carga vira erro.
      setEstado((atual) => (atual.tipo === "ok" ? atual : e instanceof ErroApi && e.status === 404 ? { tipo: "nao_encontrado" } : { tipo: "erro" }));
    }
  }, [id]);

  useEffect(() => {
    void carregar();
    const t = setInterval(() => void carregar(), ATUALIZA_A_CADA_MS);
    return () => clearInterval(t);
  }, [carregar]);

  async function copiar() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      toast.success("Link copiado.");
    } catch {
      toast.error("Não consegui copiar. Selecione o endereço na barra do navegador.");
    }
  }

  if (estado.tipo !== "ok") {
    return (
      <SiteShell topo={<span />}>
        {estado.tipo === "carregando" && (
          <p role="status" className="flex items-center gap-2 py-10 text-sm text-muted-foreground">
            <LoaderCircle className="size-4 animate-spin" aria-hidden="true" /> Buscando o andamento…
          </p>
        )}
        {estado.tipo === "nao_encontrado" && (
          <>
            <h1 className="text-[26px] leading-[1.12] font-bold">Não encontramos essa solicitação</h1>
            <p className="text-sm text-muted-foreground">Confira se o endereço está completo, do jeito que foi enviado para você.</p>
            <Button asChild size="lg" variant="outline"><Link href="/">Voltar ao início</Link></Button>
          </>
        )}
        {estado.tipo === "erro" && (
          <>
            <h1 className="text-[26px] leading-[1.12] font-bold">Não consegui buscar o andamento agora</h1>
            <p className="text-sm text-muted-foreground">Sua solicitação continua de pé. Tente de novo em instantes.</p>
            <Button size="lg" onClick={() => { setEstado({ tipo: "carregando" }); void carregar(); }}>Tentar de novo</Button>
          </>
        )}
      </SiteShell>
    );
  }

  const { caso } = estado;
  const concluidas = CONCLUIDAS[caso.etapa];
  const email = local.representante?.email;

  return (
    <SiteShell
      topo={<span />}
      acao={caso.etapa === "documentacao" && <Button size="lg" onClick={() => setReenvio(true)}>Não recebi o e-mail</Button>}
    >
      <div>
        <div className="text-xs font-bold tracking-[.08em] text-muted-foreground uppercase">Seu caso #{caso.numero}</div>
        <h1 className="mt-1 text-[26px] leading-[1.12] font-bold">{TITULO[caso.etapa]}</h1>
      </div>

      {caso.etapa === "documentacao" && (
        <div className="rounded-xl border-2 border-primary bg-card p-3.5">
          <div className="font-display text-[17px] font-bold">O que fazer agora</div>
          <p className="mt-1 text-sm leading-normal">
            Procure o e-mail da CCEE{email ? <> enviado para <b>{email}</b></> : null} e assine o CCV por lá. Veja também o spam.
          </p>
        </div>
      )}
      {caso.etapa === "aguardando_aprovacao" && (
        <p className="text-sm leading-normal text-muted-foreground">
          Recebemos o seu aceite{caso.criado_em ? ` em ${formatarData(caso.criado_em)}` : ""}. Assim que o fornecedor aprovar, a CCEE envia o contrato (CCV) para o seu e-mail.
        </p>
      )}
      {caso.etapa === "escalado_humano" && (
        <p className="text-sm leading-normal text-muted-foreground">Seu caso precisa de uma pessoa. Quem for te atender já vê tudo o que você enviou.</p>
      )}
      {(caso.etapa === "simulado" || caso.etapa === "ciencia_pendente") && (
        <>
          <p className="text-sm leading-normal text-muted-foreground">Falta concluir a ciência dos riscos e o aceite. Você pode refazer o caminho a qualquer momento.</p>
          <Button asChild size="lg"><Link href="/fatura">Continuar</Link></Button>
        </>
      )}
      {reenvio && (
        <Alert role="status">
          <AlertDescription>Pedimos um novo envio à CCEE{email ? ` para ${email}` : ""}. Pode levar alguns minutos. Veja também o spam.</AlertDescription>
        </Alert>
      )}

      {concluidas !== undefined && (
        <div className="rounded-xl border bg-card p-4">
          <LinhaDoTempo etapas={linha(concluidas)} />
        </div>
      )}
      {caso.etapa === "documentacao" && (
        <Alert variant="warning">
          <AlertDescription className="text-xs">Se a assinatura demorar, a migração pode começar só no mês seguinte.</AlertDescription>
        </Alert>
      )}
      {caso.etapa === "formalizado" && (
        <p className="text-sm text-muted-foreground">A economia realizada só aparece aqui depois de confirmada nas suas faturas.</p>
      )}

      <div className="rounded-xl border bg-card p-3.5">
        <div className="text-[13px] font-semibold">Guarde este link</div>
        <p className="mt-0.5 text-xs leading-snug text-muted-foreground">
          É por ele que você volta aqui para ver o andamento, de qualquer aparelho. Quem tiver o link vê o andamento do caso: não compartilhe.
        </p>
        <Button variant="outline" size="sm" className="mt-2" onClick={copiar}>
          <Copy aria-hidden="true" /> Copiar link
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">Esta página se atualiza sozinha.</p>
    </SiteShell>
  );
}
