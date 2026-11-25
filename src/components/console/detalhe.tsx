"use client";

import { useState } from "react";
import { Clock, ShieldCheck } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import type { Caso } from "@/lib/types";
import { formatarBRL, formatarData } from "@/lib/utils";
import { AprovarDialog } from "./acoes";
import { OFERTAS, ROTULO_ETAPA, nomeCurto, numeroCaso } from "./sim";

const eyebrow = "text-xs font-bold tracking-[.08em] text-muted-foreground uppercase";

function Kv({ rotulo, children, largo }: { rotulo: string; children: React.ReactNode; largo?: boolean }) {
  return (
    <div className={largo ? "sm:col-span-2" : undefined}>
      <dt className="mb-0.5 text-muted-foreground">{rotulo}</dt>
      <dd className="font-semibold">{children}</dd>
    </div>
  );
}

export function DetalheCaso({ caso, recarregar }: { caso: Caso; recarregar: () => void }) {
  const [aprovando, setAprovando] = useState(false);
  const oferta = caso.oferta_id ? OFERTAS[caso.oferta_id] : undefined;
  const aprovavel = caso.etapa === "aguardando_aprovacao";

  return (
    <Card className="gap-[18px] p-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-[28px] font-bold">
          Caso {numeroCaso(caso.id)} · {nomeCurto(caso.cliente)}
        </h1>
        {oferta && (
          <Badge variant="verificado">
            <ShieldCheck className="size-3.5" aria-hidden="true" />
            Oferta verificada · {oferta.nome} · {oferta.prazo} meses
          </Badge>
        )}
      </div>

      {aprovavel ? (
        <div className="flex flex-col gap-1.5">
          <div className={eyebrow}>Próximo ato · 1 de 3</div>
          <h2 className="text-2xl font-bold">Solicitar o CCV</h2>
          <p className="max-w-[620px] text-sm leading-[1.55] text-muted-foreground">
            A CCEE envia o link do CCV por e-mail ao consumidor e ao varejista. A plataforma não consegue desfazer o envio.
          </p>
        </div>
      ) : (
        <Alert>
          <Clock />
          <AlertTitle>{ROTULO_ETAPA[caso.etapa]}</AlertTitle>
          <AlertDescription>
            <p>{caso.proxima_acao}.</p>
            {caso.aprovado_por && <p>Aprovado por {caso.aprovado_por.operador} em {formatarData(caso.aprovado_por.em)}.</p>}
          </AlertDescription>
        </Alert>
      )}

      {caso.alerta_beneficio && (
        <Alert variant="warning">
          <AlertDescription>
            <b>Benefício na conta:</b> a conta tem benefício (TSEE, irrigação ou aquicultura) que se perde ao migrar. O consumidor foi avisado antes do aceite.
          </AlertDescription>
        </Alert>
      )}

      <dl className="grid gap-x-6 gap-y-3 text-[13px] sm:grid-cols-2">
        <Kv rotulo="Cliente">{nomeCurto(caso.cliente)}</Kv>
        <Kv rotulo="Segmento · UF">
          {caso.segmento} · {caso.uf}
        </Kv>
        <Kv rotulo="Economia estimada na conta inteira, por mês">{formatarBRL(caso.economia_liquida_mensal_rs)} (cenário base; não é garantia)</Kv>
        <Kv rotulo="Risco de desistência">
          {caso.risco_desistencia}
          {caso.motivo_risco ? ` · ${caso.motivo_risco}` : ""}
        </Kv>
        <Kv largo rotulo="Ciência dos riscos">
          {caso.ciencia ? (
            <>
              {caso.ciencia.itens.length} itens em {formatarData(caso.ciencia.registrada_em)} · sha256{" "}
              <span className="font-mono text-[11px] break-all">{caso.ciencia.hash}</span>
            </>
          ) : (
            "Ainda não registrada"
          )}
        </Kv>
      </dl>

      {aprovavel && (
        <>
          <Separator />
          <div>
            <Button className="min-h-12 px-6" onClick={() => setAprovando(true)}>
              Aprovar e executar
            </Button>
          </div>
          <AprovarDialog caso={caso} aberto={aprovando} onAbertoChange={setAprovando} onConcluido={recarregar} />
        </>
      )}
    </Card>
  );
}
