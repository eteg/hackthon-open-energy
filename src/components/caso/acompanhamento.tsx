"use client";

import Link from "next/link";
import { useState } from "react";
import { SiteShell } from "@/components/trevolt/site-shell";
import { DemoBanner } from "@/components/trevolt/demo-banner";
import { LinhaDoTempo, type EtapaTempo } from "@/components/trevolt/linha-do-tempo";
import { SemCaso } from "@/components/caso/sem-caso";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useCasoDemo, type EtapaCaso } from "@/lib/demo/store";

const PROXIMA: Partial<Record<EtapaCaso, EtapaCaso>> = { ccv_aguardando: "distribuidora_validando", distribuidora_validando: "em_vigor" };

function linha(etapa: EtapaCaso): EtapaTempo[] {
  const n = etapa === "ccv_aguardando" ? 1 : etapa === "distribuidora_validando" ? 3 : 5;
  const t = (i: number, titulo: string, atual: string, esperando = "Aguardando"): EtapaTempo => ({
    titulo,
    estado: i < n ? "feito" : i === n ? "atual" : "pendente",
    rotulo: i < n ? "Concluído" : i === n ? atual : esperando,
  });
  return [
    t(0, "Aceite assinado", ""),
    t(1, "Assinatura do CCV (e-mail da CCEE)", "Aguardando você"),
    t(2, "Solicitação da migração à CCEE", "Em andamento"),
    t(3, "Validação da distribuidora (até 5 dias úteis)", "Em andamento"),
    t(4, "Migração em vigor", "Em vigor"),
  ];
}

export function Acompanhamento({ id }: { id: string }) {
  const { caso, atualizar } = useCasoDemo();
  const [reenvio, setReenvio] = useState(false);
  const fornecedor = caso.compartilhaDados?.fornecedor ?? "Fornecedor Alfa";
  const etapa = caso.etapa;
  const ativo = etapa === "ccv_aguardando" || etapa === "distribuidora_validando" || etapa === "em_vigor";
  const avisos = caso.canalAvisos ?? ["whatsapp"];
  const email = caso.representante?.email ?? "nome@empresa.com.br";

  const simular = PROXIMA[etapa] && (
    <DemoBanner>
      <Button variant="link" className="h-auto p-0 text-xs text-[#6b4400] underline" onClick={() => atualizar({ etapa: PROXIMA[etapa]! })}>
        Simular próxima etapa
      </Button>
    </DemoBanner>
  );

  const titulo =
    etapa === "ccv_aguardando"
      ? "Falta a sua assinatura no contrato da CCEE"
      : etapa === "distribuidora_validando"
        ? "A distribuidora está validando"
        : "Sua migração está em vigor";

  return (
    <SiteShell
      topo={<span />}
      acao={
        ativo && (
          <>
            {etapa === "ccv_aguardando" ? (
              <Button size="lg" onClick={() => setReenvio(true)}>Não recebi o e-mail</Button>
            ) : (
              <Button size="lg" variant="outline" asChild>
                <Link href="/assistente">Falar com o {fornecedor}</Link>
              </Button>
            )}
            {etapa === "ccv_aguardando" ? (
              <Link href="/assistente" className="flex min-h-11 items-center justify-center text-[13px] font-semibold text-primary underline underline-offset-4">
                Falar com o {fornecedor}
              </Link>
            ) : (
              <Link href="/assistente" className="flex min-h-11 items-center justify-center text-[13px] font-semibold text-primary underline underline-offset-4">
                Abrir uma reclamação
              </Link>
            )}
          </>
        )
      }
    >
      {!ativo ? (
        <SemCaso texto="Este caso ainda não chegou ao acompanhamento." />
      ) : (
        <>
          <div>
            <div className="text-xs font-bold tracking-[.08em] text-muted-foreground uppercase">Seu caso #{id}</div>
            <h1 className="mt-1 text-[26px] leading-[1.12] font-bold">{titulo}</h1>
          </div>
          {etapa === "ccv_aguardando" && (
            <div className="rounded-xl border-2 border-primary bg-card p-3.5">
              <div className="font-display text-[17px] font-bold">O que fazer agora</div>
              <p className="mt-1 text-sm leading-normal">
                Procure o e-mail da CCEE enviado para <b>{email}</b> e assine o CCV por lá. Veja também o spam.
              </p>
            </div>
          )}
          {reenvio && (
            <Alert role="status">
              <AlertDescription>Pedimos um novo envio à CCEE para {email}. Pode levar alguns minutos. Veja também o spam.</AlertDescription>
            </Alert>
          )}
          <div className="rounded-xl border bg-card p-4">
            <LinhaDoTempo etapas={linha(etapa)} />
          </div>
          {etapa === "ccv_aguardando" && (
            <Alert variant="warning">
              <AlertDescription className="text-xs">
                Se a assinatura demorar, a migração pode começar só no mês seguinte. Lembramos você em 2 e 5 dias.
              </AlertDescription>
            </Alert>
          )}
          {etapa === "distribuidora_validando" && (
            <div className="rounded-xl border-2 border-primary bg-card p-3.5">
              <div className="font-display text-[17px] font-bold">Previsão de início: janeiro/2028</div>
              <p className="mt-0.5 text-[13px] leading-snug text-muted-foreground">
                Se a validação passar do corte de 16/12/2027, pode ficar para o mês seguinte.
              </p>
            </div>
          )}
          {etapa === "em_vigor" && (
            <p className="text-sm text-muted-foreground">
              A economia realizada só aparece aqui depois de confirmada nas suas faturas.
            </p>
          )}
          {etapa !== "ccv_aguardando" && (
            <RadioGroup
              value={avisos.includes("email") && !avisos.includes("whatsapp") ? "email" : "whatsapp"}
              onValueChange={(v) => atualizar({ canalAvisos: [v as "whatsapp" | "email"] })}
              aria-labelledby="lg-avisos"
              className="gap-0"
            >
              <div id="lg-avisos" className="text-[13px] font-semibold">Receber avisos por</div>
              <div className="flex min-h-11 items-center gap-2.5">
                <RadioGroupItem id="av-wa" value="whatsapp" />
                <Label htmlFor="av-wa" className="text-sm font-normal">WhatsApp</Label>
              </div>
              <div className="flex min-h-11 items-center gap-2.5">
                <RadioGroupItem id="av-em" value="email" />
                <Label htmlFor="av-em" className="text-sm font-normal">E-mail</Label>
              </div>
              <p className="text-xs leading-[1.4] text-muted-foreground">Para voltar a esta página, enviamos um link por e-mail ou SMS.</p>
            </RadioGroup>
          )}
          {simular}
          <DemoBanner>Etapas e avisos simulados; no console, o operador faz os atos de verdade.</DemoBanner>
        </>
      )}
    </SiteShell>
  );
}
