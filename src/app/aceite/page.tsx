"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LoaderCircle } from "lucide-react";
import { SiteShell } from "@/components/trevolt/site-shell";
import { DemoBanner } from "@/components/trevolt/demo-banner";
import { SemCaso } from "@/components/caso/sem-caso";
import { celularValido, cpfValido, emailValido, mascaraCelular, mascaraCpf } from "@/components/caso/validacao";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useCasoDemo } from "@/lib/demo/store";

/** Quem assina pela empresa + aceite comercial, numa tela só. Sem código de verificação. */
export default function AceitePage() {
  const router = useRouter();
  const { caso, atualizar } = useCasoDemo();
  const [nome, setNome] = useState(caso.representante?.nome ?? "");
  const [cpf, setCpf] = useState(caso.representante?.cpf ?? "");
  const [email, setEmail] = useState(caso.representante?.email ?? "");
  const [celular, setCelular] = useState(caso.representante?.celular ?? "");
  const [aceito, setAceito] = useState(false);
  const [tocou, setTocou] = useState<Record<string, boolean>>({});
  const [assinando, setAssinando] = useState(false);
  const fornecedor = caso.compartilhaDados?.fornecedor ?? "Fornecedor Alfa";

  const erros = {
    nome: nome.trim().split(/\s+/).length < 2 ? "Informe o nome completo." : "",
    cpf: cpfValido(cpf) ? "" : "CPF inválido. Confira os números.",
    email: emailValido(email) ? "" : "E-mail inválido.",
    celular: celularValido(celular) ? "" : "Informe o celular com DDD.",
  };
  const ok = !erros.nome && !erros.cpf && !erros.email && !erros.celular && aceito;
  const marcar = (k: string) => setTocou((t) => ({ ...t, [k]: true }));
  const msg = (k: keyof typeof erros) =>
    tocou[k] && erros[k] ? <p className="mt-1 text-xs text-destructive" id={`e-${k}`}>{erros[k]}</p> : null;

  function assinar() {
    if (!ok) return;
    setAssinando(true);
    atualizar({
      representante: { nome: nome.trim(), cpf, email: email.trim(), celular },
      aceiteEm: new Date().toISOString(),
      etapa: "acompanhamento",
    });
    router.push(`/caso/${caso.acompanhamentoId}`);
  }

  return (
    <SiteShell
      topo={<span />}
      passo={{ n: 6, sufixo: "ACEITE" }}
      acao={
        <Button size="lg" disabled={!ok || assinando} onClick={assinar}>
          {assinando && <LoaderCircle className="animate-spin" />}
          Assinar o aceite
        </Button>
      }
    >
      {!caso.cienciaIds?.length || !caso.acompanhamentoId ? (
        <SemCaso texto="Falta a ciência dos riscos antes do aceite." />
      ) : (
        <>
          <h1 className="text-[26px] leading-[1.12] font-bold">Aceite da oferta do {fornecedor}</h1>
          <p className="text-[13px] leading-snug text-muted-foreground">
            A CCEE vai enviar o link do contrato (CCV) para o e-mail do representante legal. Use um e-mail dele, não do varejista.
          </p>
          <div>
            <Label htmlFor="nome" className="mb-1 text-xs font-semibold text-muted-foreground">Nome do representante legal</Label>
            <Input id="nome" className="h-11" placeholder="Nome completo" autoComplete="name" value={nome} onChange={(e) => setNome(e.target.value)} onBlur={() => marcar("nome")} aria-describedby="e-nome" aria-invalid={tocou.nome && !!erros.nome} />
            {msg("nome")}
          </div>
          <div>
            <Label htmlFor="cpf" className="mb-1 text-xs font-semibold text-muted-foreground">CPF</Label>
            <Input id="cpf" className="h-11" placeholder="000.000.000-00" inputMode="numeric" value={cpf} onChange={(e) => setCpf(mascaraCpf(e.target.value))} onBlur={() => marcar("cpf")} aria-describedby="e-cpf" aria-invalid={tocou.cpf && !!erros.cpf} />
            {msg("cpf")}
          </div>
          <div>
            <Label htmlFor="email" className="mb-1 text-xs font-semibold text-muted-foreground">E-mail do representante legal</Label>
            <Input id="email" className="h-11" placeholder="nome@empresa.com.br" inputMode="email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} onBlur={() => marcar("email")} aria-describedby="e-email" aria-invalid={tocou.email && !!erros.email} />
            {msg("email")}
          </div>
          <div>
            <Label htmlFor="celular" className="mb-1 text-xs font-semibold text-muted-foreground">Celular com DDD</Label>
            <Input id="celular" className="h-11" placeholder="(00) 00000-0000" inputMode="tel" autoComplete="tel" value={celular} onChange={(e) => setCelular(mascaraCelular(e.target.value))} onBlur={() => marcar("celular")} aria-describedby="e-celular" aria-invalid={tocou.celular && !!erros.celular} />
            {msg("celular")}
          </div>

          <div className="recibo p-3.5">
            <div className="text-sm font-bold">Contrato de compra e venda de energia · 36 meses</div>
            <p className="mt-0.5 text-xs text-muted-foreground">Prévia das primeiras linhas do contrato.</p>
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="link" className="h-11 justify-start p-0 text-[13px]">Ler o contrato completo</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Contrato de compra e venda de energia</DialogTitle>
                  <DialogDescription>Texto de exemplo, na demonstração.</DialogDescription>
                </DialogHeader>
                <p className="max-h-[50vh] overflow-y-auto text-sm leading-relaxed">
                  Cláusula 1. O {fornecedor} fornece energia elétrica à unidade consumidora indicada na fatura, por 36 meses, nas condições da oferta aceita.
                  Cláusula 2. O consumidor pode desistir em até 7 dias após o aceite, sem custo. Cláusula 3. A distribuidora continua responsável pela rede e
                  pelo atendimento a quedas de luz. Cláusula 4. A migração depende da assinatura do contrato com a CCEE (CCV) e da validação da distribuidora.
                </p>
              </DialogContent>
            </Dialog>
          </div>
          <div className="flex min-h-11 items-start gap-3">
            <Checkbox id="aceite" className="mt-0.5" checked={aceito} onCheckedChange={(v) => setAceito(v === true)} />
            <Label htmlFor="aceite" className="text-sm leading-snug font-normal">Li e aceito. Sei que posso desistir em até 7 dias.</Label>
          </div>
          <p className="text-xs leading-snug text-muted-foreground">Registramos o documento e o horário do aceite.</p>
          <div className="rounded-xl border-2 border-grafite bg-card p-3.5 text-[13px] leading-[1.45]">
            <b>O próximo passo não é aqui.</b> Depois do aceite, você recebe um e-mail da CCEE para assinar o contrato com ela (CCV). Você assina lá.
          </div>
          <DemoBanner>Aceite simulado. Nada é enviado de verdade. CNPJ e unidade vêm da fatura.</DemoBanner>
        </>
      )}
    </SiteShell>
  );
}
