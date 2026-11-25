"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { LoaderCircle } from "lucide-react";
import { SiteShell } from "@/components/trevolt/site-shell";
import { DemoBanner } from "@/components/trevolt/demo-banner";
import { SemCaso } from "@/components/caso/sem-caso";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/lib/api";
import { useCasoDemo } from "@/lib/demo/store";
import type { ItemCiencia } from "@/lib/types";

type Prazo = "30 dias" | "90 dias" | "180 dias";

export default function CienciaPage() {
  const router = useRouter();
  const { caso, atualizar } = useCasoDemo();
  const [itens, setItens] = useState<ItemCiencia[] | null>(null);
  const [marcados, setMarcados] = useState<Set<string>>(new Set());
  const [prazo, setPrazo] = useState<Prazo>("90 dias");
  const [fornecedor, setFornecedor] = useState("Fornecedor Alfa");
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    api.regras().then((r) => setItens(r.ciencia_obrigatoria)).catch(() => setErro("Não consegui carregar os pontos. Tente de novo."));
  }, []);
  useEffect(() => {
    if (!caso.faturaId) return;
    api.simular(caso.faturaId)
      .then((s) => {
        const o = s.ofertas.find((x) => x.oferta_id === caso.ofertaId);
        if (o?.varejista) setFornecedor(o.varejista);
      })
      .catch(() => {});
  }, [caso.faturaId, caso.ofertaId]);

  const semIds = !caso.faturaId || !caso.ofertaId;
  const tudo = !!itens && itens.length > 0 && itens.every((i) => marcados.has(i.id));

  function alternar(id: string, v: boolean) {
    setMarcados((m) => {
      const p = new Set(m);
      if (v) p.add(id);
      else p.delete(id);
      return p;
    });
  }

  async function continuar() {
    if (!tudo || semIds || !itens) return;
    setEnviando(true);
    setErro(null);
    try {
      const ids = itens.map((i) => i.id);
      await api.solicitarMigracao(caso.faturaId!, caso.ofertaId!, ids);
      atualizar({ cienciaIds: ids, compartilhaDados: { fornecedor, prazo }, etapa: "aceite" });
      router.push("/aceite");
    } catch (e) {
      setErro((e as Error).message || "Não deu para registrar a ciência. Tente de novo.");
      setEnviando(false);
    }
  }

  return (
    <SiteShell
      topo={<span />}
      passo={{ n: 5 }}
      acao={
        !semIds && (
          <Button size="lg" disabled={!tudo || enviando} onClick={continuar}>
            {enviando && <LoaderCircle className="animate-spin" />}
            Aceito e continuar
          </Button>
        )
      }
    >
      {semIds ? (
        <SemCaso />
      ) : (
        <>
          <h1 className="text-[26px] leading-[1.12] font-bold">
            Antes de seguir, leia e marque os {itens?.length ?? 5} pontos
          </h1>
          <div className="divide-y rounded-xl border bg-card px-3.5 py-0.5">
            {!itens && !erro && [0, 1, 2, 3, 4].map((i) => <Skeleton key={i} className="my-3 h-8" />)}
            {itens?.map((i) => (
              <div key={i.id} className="flex min-h-12 items-center gap-2.5 py-2">
                <Checkbox id={`c-${i.id}`} checked={marcados.has(i.id)} onCheckedChange={(v) => alternar(i.id, v === true)} />
                <Label htmlFor={`c-${i.id}`} className="block text-[13px] leading-[1.35] font-normal">
                  {i.texto}
                </Label>
              </div>
            ))}
          </div>
          <div className="rounded-xl border bg-card p-3.5">
            <div className="text-sm font-bold">Compartilhar meus dados com o {fornecedor}</div>
            <div className="mt-2 flex items-center gap-2">
              <Label htmlFor="prazo" className="text-[13px] font-normal text-muted-foreground">Prazo</Label>
              <Select value={prazo} onValueChange={(v) => setPrazo(v as Prazo)}>
                <SelectTrigger id="prazo" className="h-11 w-auto">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(["30 dias", "90 dias", "180 dias"] as Prazo[]).map((p) => (
                    <SelectItem key={p} value={p}>{p}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <span className="text-[13px] text-muted-foreground">revogável</span>
            </div>
          </div>
          <Alert variant="warning">
            <AlertDescription className="text-xs leading-[1.45]">
              As regras da ANEEL e da CCEE ainda estão em regulamentação. O {fornecedor} confere o seu caso antes de pedir a migração à CCEE.
            </AlertDescription>
          </Alert>
          {erro && (
            <Alert variant="destructive">
              <AlertDescription>{erro}</AlertDescription>
            </Alert>
          )}
          <DemoBanner>Os pontos vêm das regras reais; o compartilhamento de dados e o prazo são simulados.</DemoBanner>
        </>
      )}
    </SiteShell>
  );
}
