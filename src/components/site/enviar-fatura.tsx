"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Camera, LoaderCircle } from "lucide-react";
import { SiteShell } from "@/components/trevolt/site-shell";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { api, ErroApi, type FaturaResumo } from "@/lib/api";
import { useCasoDemo } from "@/lib/demo/store";
import { CAMPOS_ESSENCIAIS } from "./fatura-montagem";
import { guardarRascunho, limparRascunho } from "./rascunho";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { cn, formatarBRL } from "@/lib/utils";

const LIMITE_BYTES = 5 * 1024 * 1024;

/** Fotos de celular costumam passar de 5 MB: reduz para até 2000 px e reencoda em JPEG antes de enviar. PDF segue como está. */
async function prepararArquivo(a: File): Promise<File> {
  if (a.type === "application/pdf" || (a.size <= LIMITE_BYTES / 2 && a.type === "image/png")) return a;
  try {
    const bmp = await createImageBitmap(a);
    const k = Math.min(1, 2000 / Math.max(bmp.width, bmp.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bmp.width * k);
    canvas.height = Math.round(bmp.height * k);
    canvas.getContext("2d")!.drawImage(bmp, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/jpeg", 0.85));
    return blob ? new File([blob], "fatura.jpg", { type: "image/jpeg" }) : a;
  } catch {
    return a; // formato que o navegador não decodifica (ex.: HEIC): o servidor responde 415 com mensagem clara
  }
}

type Falha = { titulo: string; texto: string; semChave?: boolean };

/** Classifica pelo status HTTP do contrato (415 formato, 413 tamanho, 422 PDF com senha, 502 leitura falhou, 503 IA indisponível). */
function classificar(e: unknown): Falha {
  const msg = e instanceof Error ? e.message : "Erro inesperado";
  const status = e instanceof ErroApi ? e.status : 0;
  if (status === 415) return { titulo: "Não consegui ler essa imagem", texto: "Esse formato não funciona. Envie JPG, PNG ou PDF." };
  if (status === 413) return { titulo: "Esse arquivo é grande demais", texto: "O limite é 5 MB. Tire outra foto, mais perto da conta, ou envie o PDF." };
  if (status === 422) return { titulo: "Esse PDF tem senha", texto: msg };
  if (status === 503) return { titulo: "A leitura da fatura está indisponível agora", texto: "Você pode digitar os dados da conta ou usar uma fatura de exemplo.", semChave: true };
  if (status === 502) return { titulo: "Não consegui ler agora", texto: "Tente de novo, com outra foto, ou digite os dados." };
  return { titulo: "Não deu certo", texto: msg };
}

const DICAS = [
  "A conta inteira no quadro, de frente.",
  "Luz boa, sem reflexo e sem sombra.",
  "O PDF que a distribuidora manda por e-mail funciona ainda melhor.",
];

export function EnviarFatura() {
  const router = useRouter();
  const { atualizar } = useCasoDemo();
  const entrada = useRef<HTMLInputElement>(null);
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [aceito, setAceito] = useState(false);
  const [lendo, setLendo] = useState(false);
  const [falha, setFalha] = useState<Falha | null>(null);
  const [exemplos, setExemplos] = useState<FaturaResumo[]>([]);

  async function enviar() {
    if (!arquivo || !aceito) return;
    setFalha(null);
    setLendo(true);
    try {
      const r = await api.extrairDeArquivo(await prepararArquivo(arquivo));
      const lidos = CAMPOS_ESSENCIAIS.filter((c) => !r.ausentes.includes(c)).length;
      if (r.confianca < 0.3 || lidos === 0) {
        setFalha({ titulo: "Não consegui ler essa imagem", texto: "Parece não ser uma conta de luz, ou está cortada ou desfocada." });
        return;
      }
      guardarRascunho({ leitura: r, arquivoNome: arquivo.name, confirmada: undefined });
      atualizar({ etapa: "conferencia" });
      router.push("/fatura/conferir");
    } catch (e) {
      const f = classificar(e);
      setFalha(f);
      if (f.semChave && exemplos.length === 0) api.listarFaturas().then(setExemplos).catch(() => {});
    } finally {
      setLendo(false);
    }
  }

  function usarExemplo(f: FaturaResumo) {
    limparRascunho();
    atualizar({ faturaId: f.id, origem: undefined, ofertaId: undefined, etapa: "conta" });
    router.push("/conta");
  }

  /** Só abre o seletor: a tela de erro some quando o novo arquivo chega (onChange), senão o seletor seria desmontado antes. */
  function trocarArquivo() {
    entrada.current?.click();
  }

  const seletor = (
    <input
      ref={entrada}
      id="arquivo-fatura"
      type="file"
      accept="image/*,application/pdf"
      className="sr-only"
      disabled={lendo}
      onChange={(e) => {
        const a = e.target.files?.[0];
        if (a) {
          setArquivo(a);
          setFalha(null);
        }
        e.target.value = "";
      }}
    />
  );

  // S2b: imagem que não é uma conta (e demais falhas de leitura)
  if (falha) {
    return (
      <SiteShell topo={<span />}
        passo={{ n: 1 }}
       
        acao={
          <>
            <Button size="lg" onClick={trocarArquivo}>
              <Camera aria-hidden="true" /> Tirar outra foto
            </Button>
            <Button asChild variant="link" className="justify-center text-[13px]">
              <Link href="/fatura/digitar">Digitar os dados</Link>
            </Button>
          </>
        }
      >
        {seletor}
        <h1 className="text-[26px] leading-[1.12] font-medium">{falha.titulo}</h1>
        {arquivo && (
          <div className="flex items-center gap-3 rounded-xl border bg-card p-3">
            <div aria-hidden="true" className="h-20 w-16 flex-none rounded-md border border-dashed border-[#a6a194] bg-[repeating-linear-gradient(135deg,var(--secondary)_0_6px,#e4dccb_6px_12px)]" />
            <div className="min-w-0 text-[13px] leading-snug">
              <b className="block truncate">{arquivo.name}</b>
              <span className="text-muted-foreground">{falha.texto}</span>
            </div>
          </div>
        )}
        {!arquivo && <p className="text-sm text-muted-foreground">{falha.texto}</p>}
        <div className="flex flex-col gap-2 rounded-xl border bg-card p-4 text-sm leading-snug">
          <b className="font-display text-[17px] font-medium">Para a leitura dar certo</b>
          {DICAS.map((d) => (
            <div key={d}>• {d}</div>
          ))}
        </div>
        <Alert variant="warning">
          <AlertDescription className="text-xs">
            Com a conta, a análise fica bem mais precisa: separamos energia, distribuição e encargos de verdade e a faixa de economia fica mais estreita.
          </AlertDescription>
        </Alert>
        {falha.semChave && exemplos.length > 0 && (
          <div className="flex flex-col gap-2 rounded-xl border bg-card p-4">
            <b className="text-sm">Ou use uma fatura de exemplo (dados sintéticos)</b>
            {exemplos.map((f) => (
              <Button key={f.id} variant="outline" className="h-auto justify-between py-2 text-left whitespace-normal" onClick={() => usarExemplo(f)}>
                <span>
                  {f.titular}
                  <span className="block text-xs font-normal text-muted-foreground">
                    {f.segmento} · {f.uf}
                  </span>
                </span>
                <span className="tabular-nums">{formatarBRL(f.total_rs)}</span>
              </Button>
            ))}
          </div>
        )}
      </SiteShell>
    );
  }

  // S2: enviar a fatura, com consentimento
  return (
    <SiteShell topo={<span />}
      passo={{ n: 1 }}
     
      acao={
        <>
          <Button size="lg" disabled={!arquivo || !aceito || lendo} onClick={enviar}>
            {lendo && <LoaderCircle className="animate-spin" aria-hidden="true" />}
            {lendo ? "Lendo…" : "Ler minha fatura"}
          </Button>
          <Button asChild variant="link" className="justify-center text-[13px]">
            <Link href="/fatura/digitar">Não tenho a conta agora, digitar os dados</Link>
          </Button>
        </>
      }
    >
      <h1 className="text-[28px] leading-[1.1] font-medium">Envie a sua fatura</h1>
      {seletor}
      <Label
        htmlFor="arquivo-fatura"
        className={cn(
          "flex min-h-[190px] cursor-pointer flex-col items-center justify-center gap-2.5 rounded-xl border-[1.5px] border-dashed border-primary bg-card p-6 text-center text-[15px] leading-snug font-semibold has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring",
          arquivo && "border-2"
        )}
      >
        <Camera className="size-8" aria-hidden="true" />
        {arquivo ? (
          <span className="break-all">
            {arquivo.name}
            <span className="block text-xs font-normal text-muted-foreground">Toque de novo para trocar</span>
          </span>
        ) : (
          <span>
            Toque para tirar uma foto
            <br />
            ou escolher um PDF
          </span>
        )}
      </Label>
      <p className="text-[13px] leading-normal text-muted-foreground">Use uma fatura dos últimos 3 meses. Se tiver mais de uma página, envie a que mostra os valores.</p>
      <div className="flex items-start gap-3 rounded-xl border bg-card p-3">
        <Checkbox id="consentimento-ia" className="mt-0.5" checked={aceito} onCheckedChange={(v) => setAceito(v === true)} />
        <Label htmlFor="consentimento-ia" className="text-sm leading-snug font-normal">
          Aceito que uma IA leia a fatura só para simular e comparar. Posso revogar quando quiser.
        </Label>
      </div>
      <Accordion type="single" collapsible>
        <AccordionItem value="usado" className="border-b-0">
          <AccordionTrigger className="min-h-11 items-center py-0 text-[13px] font-semibold text-primary underline hover:underline [&>svg]:hidden">Ver o que será usado</AccordionTrigger>
          <AccordionContent className="text-[13px] leading-normal text-muted-foreground">
            Lemos titular, distribuidora, consumo, valores da conta e benefícios. O arquivo é processado e descartado; guardamos só os dados extraídos e um código de verificação (hash) para auditoria.
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </SiteShell>
  );
}
