"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Camera, LoaderCircle, TriangleAlert } from "lucide-react";
import { SiteShell } from "@/components/trevolt/site-shell";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";
import { useCasoDemo } from "@/lib/demo/store";
import { CAMPOS } from "@/lib/fatura-campos";
import type { Beneficio } from "@/lib/types";
import { BeneficiosCampo, CampoFatura } from "./campo-fatura";
import { CAMPOS_ESSENCIAIS, completarComPadroes, converterCampo, validarFaturaCompleta } from "./fatura-montagem";
import { guardarRascunho } from "./rascunho";

// `new Date()` não pode rodar na renderização (prerender). A validação usa um mês provisório; o mês real entra ao enviar.
const MES_PROVISORIO = "0000-00";
const DEFS = CAMPOS_ESSENCIAIS.map((k) => CAMPOS.find((c) => c.caminho === k)!);

/** S3c: sem a conta, o consumidor digita só 3 dados; o resto é completado com padrões explícitos e o caso vai marcado "digitado". */
export function DigitarDados() {
  const router = useRouter();
  const { atualizar } = useCasoDemo();
  const [valores, setValores] = useState<Record<string, string>>({});
  const [beneficios, setBeneficios] = useState<Set<Beneficio>>(new Set());
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const montagem = useMemo(() => {
    const base: Record<string, unknown> = { beneficios: [...beneficios] };
    for (const c of DEFS) {
      const v = converterCampo(c, valores[c.caminho] ?? "");
      if (v !== undefined && v !== "") base[c.caminho] = v;
    }
    const m = completarComPadroes(base, true, MES_PROVISORIO);
    const positivos = typeof base.total_rs === "number" && base.total_rs > 0 && typeof base.consumo_kwh === "number" && base.consumo_kwh > 0;
    return { ...m, ok: positivos && validarFaturaCompleta(m.fatura).success };
  }, [valores, beneficios]);

  async function simular() {
    if (!montagem.ok) return;
    setErro(null);
    setEnviando(true);
    try {
      const final = completarComPadroes({ ...montagem.fatura, mes_referencia: undefined }, true, new Date().toISOString().slice(0, 7));
      const fatura = await api.confirmarFatura(final.fatura);
      guardarRascunho({ leitura: undefined, confirmada: fatura });
      atualizar({ faturaId: fatura.id, origem: "digitado", ofertaId: undefined, etapa: "conta" });
      router.push("/conta");
    } catch (e) {
      setErro((e as Error).message);
      setEnviando(false);
    }
  }

  return (
    <SiteShell topo={<span />}
      passo={{ n: 2, sufixo: "SEM A CONTA" }}
     
      acao={
        <Button size="lg" disabled={!montagem.ok || enviando} onClick={simular}>
          {enviando && <LoaderCircle className="animate-spin" aria-hidden="true" />}
          Simular com esses dados
        </Button>
      }
    >
      <h1 className="text-[26px] leading-[1.12] font-medium">Digite os dados da sua conta</h1>
      <div className="flex flex-col gap-2 rounded-xl bg-accent p-3.5">
        <p className="text-[13px] leading-snug">
          <b>Com a foto da conta, a análise fica muito mais precisa.</b> Sem ela, a faixa de economia sai mais larga.
        </p>
        <Button asChild variant="outline" size="sm" className="self-start">
          <Link href="/fatura">
            <Camera aria-hidden="true" /> Enviar a foto agora
          </Link>
        </Button>
      </div>
      {DEFS.map((c) => (
        <CampoFatura key={c.caminho} def={c} valor={valores[c.caminho] ?? ""} onChange={(v) => setValores((s) => ({ ...s, [c.caminho]: v }))} />
      ))}
      <BeneficiosCampo marcados={beneficios} onChange={setBeneficios} />
      <Badge variant="atencao" className="self-start">
        Estimativa com dados digitados
      </Badge>
      <p className="text-xs leading-snug text-muted-foreground">
        O que você não digitou usa valores padrão: {montagem.assumido.join("; ") || "nenhum"}. O fornecedor confere a conta antes de formalizar.
      </p>
      {erro && (
        <Alert variant="destructive">
          <TriangleAlert />
          <AlertTitle>Não deu certo</AlertTitle>
          <AlertDescription>{erro}</AlertDescription>
        </Alert>
      )}
    </SiteShell>
  );
}
