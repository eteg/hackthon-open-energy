"use client";

import { useState } from "react";
import { TriangleAlert } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DemoBanner } from "@/components/trevolt/demo-banner";
import { FORNECEDOR } from "./sim";

const PAPEIS = ["Administrador", "Aprovador", "Somente leitura", "Consumidor"];
const MATRIZ: [string, string[]][] = [
  ["Ver os casos e os dados (depois do aceite)", ["Sim", "Sim", "Sim", "Os próprios"]],
  ["Aprovar e executar os atos", ["Sim", "Sim", "Não", "Não"]],
  ["Devolver ao consumidor", ["Sim", "Sim", "Não", "Não"]],
  ["Rejeitar o caso", ["Sim", "Sim", "Não", "Não"]],
  ["Gerenciar usuários", ["Sim", "Não", "Não", "Não"]],
  ["Gerenciar a credencial da CCEE", ["Sim", "Não", "Não", "Não"]],
];
const PASSOS = [
  "O varejista emite a credencial da API da CCEE para a nossa plataforma, como pacote de terceiro.",
  `O administrador guarda a credencial no cofre do ${FORNECEDOR}, separado dos outros varejistas.`,
  "O administrador define quais usuários do varejista podem aprovar.",
  "Cada ato exige a aprovação de um desses usuários. Sem aprovação, a política bloqueia a chamada.",
  "A plataforma chama a API com a credencial e registra quem aprovou, quando e com que versão das regras.",
];

type Status = "ativa" | "revogada";

export function Permissoes() {
  const [status, setStatus] = useState<Status>("ativa");
  const [renovada, setRenovada] = useState("03/11/2027");
  const [dialogo, setDialogo] = useState<"substituir" | "revogar" | null>(null);

  return (
    <div className="flex flex-wrap items-start gap-6 p-4 md:p-6">
      <div className="flex min-w-0 flex-[999_1_560px] flex-col gap-5">
        <Card className="gap-3 p-6">
          <h2 className="text-[22px] font-bold">Quem faz o quê</h2>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Ação</TableHead>
                {PAPEIS.map((p) => (
                  <TableHead key={p}>{p}</TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {MATRIZ.map(([acao, vals]) => (
                <TableRow key={acao}>
                  <TableCell className="whitespace-normal">{acao}</TableCell>
                  {vals.map((v, i) => (
                    <TableCell key={PAPEIS[i]} className={i === 3 ? "text-muted-foreground" : acao.startsWith("Aprovar") && v === "Sim" ? "font-bold" : ""}>
                      {v}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <p className="text-xs leading-normal text-muted-foreground">Só usuários do varejista aprovam e executam. A ETEG não aprova atos nem acessa a credencial.</p>
        </Card>

        <Card className="gap-3.5 p-6">
          <h2 className="text-[22px] font-bold">Como a permissão vira ação na CCEE</h2>
          <ol className="flex flex-col gap-3 text-sm leading-normal">
            {PASSOS.map((p, i) => (
              <li key={p} className="flex gap-3">
                <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-grafite text-[11px] font-bold text-white" aria-hidden="true">
                  {i + 1}
                </span>
                <span>{p}</span>
              </li>
            ))}
          </ol>
        </Card>
      </div>

      <div className="flex min-w-[280px] flex-[1_1_340px] flex-col gap-5">
        <Card className="gap-3 border-2 border-primary p-6">
          <h2 className="text-[22px] font-bold">Credencial da API da CCEE</h2>
          <Badge variant="outline" className="self-start border-dashed border-primary text-primary">Mock nesta demo</Badge>
          <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-[13px]">
            <div><dt className="mb-0.5 text-muted-foreground">Cofre</dt><dd className="font-semibold">{FORNECEDOR}</dd></div>
            <div><dt className="mb-0.5 text-muted-foreground">Status</dt><dd className="font-semibold">{status === "ativa" ? "Ativa" : "Revogada"}</dd></div>
            <div><dt className="mb-0.5 text-muted-foreground">Autenticação</dt><dd className="font-semibold">Credencial + token JWT</dd></div>
            <div><dt className="mb-0.5 text-muted-foreground">Renovada em</dt><dd className="font-semibold">{renovada}</dd></div>
          </dl>
          {status === "revogada" && (
            <Alert variant="destructive">
              <TriangleAlert />
              <AlertTitle>Sem credencial ativa</AlertTitle>
              <AlertDescription>Nenhum ato pode ser executado até você substituir a credencial.</AlertDescription>
            </Alert>
          )}
          <p className="text-xs leading-normal text-muted-foreground">
            A credencial é do varejista, e o risco também: ele responde à CCEE pelos dados e poderes enviados. Falta confirmar se a CCEE emite por agente ou por usuário.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => setDialogo("substituir")}>Substituir credencial</Button>
            <Button variant="outline" disabled={status === "revogada"} onClick={() => setDialogo("revogar")}>Revogar acesso</Button>
          </div>
        </Card>

        <Card className="gap-3 p-6">
          <div className="text-xs font-bold tracking-[.08em] text-muted-foreground uppercase">Retaguarda ETEG · proposta</div>
          <h3 className="text-xl font-bold">O que a ETEG faz fora dos casos</h3>
          <div className="flex flex-col gap-2 text-[13px] leading-normal">
            <div>Revisa a qualidade das respostas da IA antes do aceite, quando a plataforma é a controladora dos dados. Não há atendimento humano ao consumidor nessa fase.</div>
            <div>Trata alertas de segurança da leitura de fatura, também antes do aceite.</div>
            <div>Aprova o cadastro de novos varejistas.</div>
          </div>
          <Alert variant="warning"><AlertDescription className="text-xs">Não aprova atos, não vê a credencial e não entra na fila do varejista.</AlertDescription></Alert>
        </Card>
        <DemoBanner>Papéis, cofre e credencial da CCEE são simulados: nada é gravado nem enviado de verdade.</DemoBanner>
      </div>

      <Dialog open={dialogo === "substituir"} onOpenChange={(v) => !v && setDialogo(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Substituir a credencial?</DialogTitle>
            <DialogDescription>A credencial atual deixa de valer e a nova fica no cofre do {FORNECEDOR}. Os atos em andamento usam a nova na próxima chamada.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogo(null)}>
              Cancelar
            </Button>
            <Button
              onClick={() => {
                setStatus("ativa");
                setRenovada(new Date().toLocaleDateString("pt-BR"));
                setDialogo(null);
              }}
            >
              Confirmar e substituir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={dialogo === "revogar"} onOpenChange={(v) => !v && setDialogo(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Revogar o acesso?</DialogTitle>
            <DialogDescription>A plataforma para de chamar a API da CCEE em nome do {FORNECEDOR}. Nenhum ato poderá ser executado até haver uma nova credencial.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogo(null)}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                setStatus("revogada");
                setDialogo(null);
              }}
            >
              Confirmar e revogar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
