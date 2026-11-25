import { z } from "zod";
import { buscarFatura } from "@/lib/dados";
import { detectarInjecao } from "@/lib/guardrails";
import { detectarTipo, pdfProtegido, hashArquivo, lerFaturaDeArquivo, paraParcial, TAMANHO_MAX_BYTES } from "@/lib/extracao";
import { MODELO, temChave } from "@/lib/gemini";
import { registrarEvidencia, registrarObservabilidade } from "@/lib/store";

export const maxDuration = 60;

const Body = z.object({ faturaId: z.string() });

/**
 * Extração da fatura com saída tipada.
 *  - multipart/form-data com `arquivo` (JPG/PNG/PDF): lê com modelo de visão; devolve campos lidos,
 *    lista de ausentes e confiança geral. Sem GEMINI_API_KEY ⇒ 503. O arquivo não é guardado.
 *  - JSON { faturaId }: devolve a fatura pré-extraída da base sintética (demo / plano de falha offline).
 */
export async function POST(req: Request) {
  if (req.headers.get("content-type")?.includes("multipart/form-data")) return extrairDeArquivo(req);

  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Response.json({ erro: "faturaId obrigatório" }, { status: 400 });

  const fatura = buscarFatura(parsed.data.faturaId);
  if (!fatura) return Response.json({ erro: "Fatura não encontrada" }, { status: 404 });

  const inj = detectarInjecao(fatura.observacoes);
  registrarEvidencia({ tipo: "extracao", ref: fatura.id, dados: { origem: "base_sintetica", alerta_injecao: inj.suspeito } });
  if (inj.suspeito) registrarEvidencia({ tipo: "injecao_bloqueada", ref: fatura.id, dados: { padroes: inj.padroes } });

  return Response.json({
    origem: "base_sintetica",
    fatura: { ...fatura, observacoes: inj.trecho_sanitizado },
    alerta_injecao: inj.suspeito,
    padroes_injecao: inj.padroes,
  });
}

async function extrairDeArquivo(req: Request) {
  if (!temChave()) {
    return Response.json({ erro: "A leitura de arquivo exige GEMINI_API_KEY. Use uma fatura de exemplo ou configure a chave." }, { status: 503 });
  }

  const form = await req.formData().catch(() => null);
  const arquivo = form?.get("arquivo");
  if (!(arquivo instanceof File)) return Response.json({ erro: "Envie o arquivo no campo 'arquivo'" }, { status: 400 });
  if (arquivo.size === 0) return Response.json({ erro: "Arquivo vazio" }, { status: 400 });
  if (arquivo.size > TAMANHO_MAX_BYTES) return Response.json({ erro: "Arquivo acima de 5 MB" }, { status: 413 });

  const dados = Buffer.from(await arquivo.arrayBuffer());
  const tipo = detectarTipo(dados);
  if (!tipo) return Response.json({ erro: "Formato não suportado. Envie JPG, PNG ou PDF." }, { status: 415 });

  if (tipo === "application/pdf" && pdfProtegido(dados)) {
    return Response.json(
      { erro: "Este PDF tem senha e não consigo abri-lo. Tire uma foto da fatura ou envie uma versão sem senha." },
      { status: 422 }
    );
  }

  const t0 = Date.now();
  let r;
  try {
    r = await lerFaturaDeArquivo(dados, tipo);
  } catch (e) {
    console.error("[extrair] falha na leitura:", e);
    return Response.json({ erro: "Não consegui ler a fatura agora. Tente de novo ou use outra foto." }, { status: 502 });
  }

  const { fatura, ausentes } = paraParcial(r.leitura);
  const inj = detectarInjecao(fatura.observacoes);
  const hash = hashArquivo(dados);
  registrarEvidencia({
    tipo: "extracao",
    ref: hash,
    dados: { origem: "arquivo", tipo_arquivo: tipo, confianca: r.leitura.confianca, ausentes, alerta_injecao: inj.suspeito, campos_lidos: { ...fatura, observacoes: undefined } },
  });
  if (inj.suspeito) registrarEvidencia({ tipo: "injecao_bloqueada", ref: hash, dados: { padroes: inj.padroes } });
  const pin = Number(process.env.PRECO_INPUT_USD_POR_MTOK);
  const pout = Number(process.env.PRECO_OUTPUT_USD_POR_MTOK);
  registrarObservabilidade({
    rota: "faturas/extrair",
    modo: "llm",
    modelo: MODELO,
    latencia_ms: Date.now() - t0,
    tokens_entrada: r.tokens_entrada,
    tokens_saida: r.tokens_saida,
    custo_usd: pin && pout ? (r.tokens_entrada * pin + r.tokens_saida * pout) / 1_000_000 : null,
    escalou: false,
    alerta_injecao: inj.suspeito,
  });

  return Response.json({
    origem: "arquivo",
    fatura: { ...fatura, ...(fatura.observacoes ? { observacoes: inj.trecho_sanitizado } : {}) },
    ausentes,
    confianca: r.leitura.confianca,
    alerta_injecao: inj.suspeito,
    padroes_injecao: inj.padroes,
  });
}
