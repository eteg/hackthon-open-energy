"use client";

import { Button } from "@/components/ui/button";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import type { ResultadoOferta } from "@/lib/types";

function Passos({ o }: { o: ResultadoOferta }) {
  return (
    <ol className="list-decimal space-y-1.5 pl-5 text-[13px] leading-snug text-muted-foreground">
      {o.memoria_calculo.map((m) => (
        <li key={m}>{m}</li>
      ))}
    </ol>
  );
}

/** "Ver memória de cálculo" de uma oferta (o texto vem pronto de api.simular). */
export function MemoriaCalculo({ oferta, children }: { oferta: ResultadoOferta; children?: React.ReactNode }) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="link" size="sm" className="h-auto min-h-0 p-0 text-xs">
          {children ?? "Ver memória de cálculo"}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[85dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Memória de cálculo</DialogTitle>
          <DialogDescription>
            {oferta.varejista} · {oferta.nome}
          </DialogDescription>
        </DialogHeader>
        <Passos o={oferta} />
      </DialogContent>
    </Dialog>
  );
}

/** "Auditar uma oferta": todas as ofertas, cada uma com a sua memória de cálculo. */
export function AuditarOferta({ ofertas }: { ofertas: ResultadoOferta[] }) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button size="lg" variant="outline">
          Auditar uma oferta
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[85dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Auditar uma oferta</DialogTitle>
          <DialogDescription>Escolha uma oferta para ver a conta feita, passo a passo. O cálculo é feito por código, igual para todas.</DialogDescription>
        </DialogHeader>
        <Accordion type="single" collapsible>
          {ofertas.map((o) => (
            <AccordionItem key={o.oferta_id} value={o.oferta_id}>
              <AccordionTrigger className="text-sm">
                {o.varejista}
                <span className="ml-auto pr-2 text-xs font-normal text-muted-foreground">{o.prazo_meses} meses</span>
              </AccordionTrigger>
              <AccordionContent>
                <Passos o={o} />
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </DialogContent>
    </Dialog>
  );
}
