"use client";

import Link from "next/link";
import { TriangleAlert } from "lucide-react";
import { SiteShell } from "@/components/trevolt/site-shell";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

/** Estados de carregamento, "sem fatura" e erro das telas que dependem da simulação. */
export function TelaSemSimulacao({ passo, semFatura, erro }: { passo: number; semFatura: boolean; erro?: string }) {
  const problema = semFatura || erro;
  return (
    <SiteShell topo={<span />}
      passo={{ n: passo }}
      acao={
        problema && (
          <Button asChild size="lg">
            <Link href="/fatura">Enviar a fatura</Link>
          </Button>
        )
      }
    >
      {problema ? (
        <Alert variant={erro ? "destructive" : "warning"}>
          <TriangleAlert />
          <AlertTitle>{erro ? "Não consegui montar a sua conta" : "Ainda não temos a sua fatura"}</AlertTitle>
          <AlertDescription>{erro ? `${erro} Envie a fatura de novo para refazer a simulação.` : "Envie a fatura (ou digite os dados) para ver a sua conta e as ofertas."}</AlertDescription>
        </Alert>
      ) : (
        <>
          <Skeleton className="h-9 w-3/4" />
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-28 w-full" />
        </>
      )}
    </SiteShell>
  );
}
