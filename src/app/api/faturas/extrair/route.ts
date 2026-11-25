import { z } from "zod";
import { buscarFatura } from "@/lib/dados";
import { detectarInjecao } from "@/lib/guardrails";
import { registrarEvidencia } from "@/lib/store";

const Body = z.object({ faturaId: z.string() });

/**
 * Extração da fatura com saída tipada (FaturaSchema).
 * Hoje: devolve a fatura pré-extraída da base sintética (modo offline / plano de falha).
 * TODO(Tech): aceitar upload (PDF/foto) e chamar modelo de visão com saída validada por FaturaSchema.
 */
export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json());
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
