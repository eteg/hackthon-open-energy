import { ShieldAlert } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatarBRL, formatarPct } from "@/lib/utils";
import type { Fatura } from "@/lib/types";

const LINHAS: { chave: keyof Fatura["componentes"]; rotulo: string; negociavel?: boolean; sinal?: -1 }[] = [
  { chave: "energia_te_rs", rotulo: "Energia (TE)", negociavel: true },
  { chave: "distribuicao_tusd_rs", rotulo: "Distribuição (TUSD)" },
  { chave: "bandeira_rs", rotulo: "Bandeira tarifária" },
  { chave: "cip_rs", rotulo: "Iluminação pública (CIP)" },
  { chave: "tributos_rs", rotulo: "Tributos (ICMS, PIS/Cofins)" },
  { chave: "desconto_beneficio_rs", rotulo: "Desconto de benefício", sinal: -1 },
];

export function FaturaDetalhe({ fatura, alertaInjecao }: { fatura: Fatura; alertaInjecao: boolean }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{fatura.titular}</CardTitle>
        <CardDescription>
          {fatura.segmento} · {fatura.classe} · {fatura.subgrupo} · {fatura.tensao_v} V · {fatura.distribuidora} ({fatura.uf}) ·
          ref. {fatura.mes_referencia.split("-").reverse().join("/")} · {fatura.consumo_kwh.toLocaleString("pt-BR")} kWh
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {alertaInjecao && (
          <Alert variant="destructive">
            <ShieldAlert />
            <AlertTitle>Instrução escondida no documento foi bloqueada</AlertTitle>
            <AlertDescription>
              O texto livre da fatura tentava dar ordens ao sistema. Ele foi tratado como dado e removido do contexto da IA.
              Os números da simulação vêm só dos campos tipados.
            </AlertDescription>
          </Alert>
        )}
        <div className="divide-y rounded-lg border">
          {LINHAS.filter((l) => l.chave !== "desconto_beneficio_rs" || fatura.componentes[l.chave] > 0).map((l) => {
            const valor = fatura.componentes[l.chave] * (l.sinal ?? 1);
            return (
              <div key={l.chave} className="flex items-center justify-between px-4 py-2 text-sm">
                <span className="flex items-center gap-2">
                  {l.rotulo}
                  {l.negociavel && <Badge>única parte negociável</Badge>}
                </span>
                <span className="tabular-nums">
                  {formatarBRL(valor)}
                  <span className="ml-2 text-xs text-muted-foreground">
                    {formatarPct((Math.abs(valor) / fatura.total_rs) * 100)}
                  </span>
                </span>
              </div>
            );
          })}
          <div className="flex items-center justify-between bg-muted/50 px-4 py-2 text-sm font-semibold">
            <span>Total da conta</span>
            <span className="tabular-nums">{formatarBRL(fatura.total_rs)}</span>
          </div>
        </div>
        {fatura.observacoes && !alertaInjecao && (
          <p className="text-xs text-muted-foreground">Observação extraída: {fatura.observacoes}</p>
        )}
      </CardContent>
    </Card>
  );
}
