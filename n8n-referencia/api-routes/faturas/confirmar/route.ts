import { randomUUID } from "node:crypto";
import { validarFaturaCompleta } from "@/lib/fatura-campos";
import { detectarInjecao } from "@/lib/guardrails";
import { registrarEvidencia, store } from "@/lib/store";

/**
 * Registra a fatura lida de arquivo depois que o cliente conferiu e completou os campos.
 * O id é gerado aqui (nunca vem do cliente). A partir daí, simulação e caso funcionam como na base sintética.
 */
export async function POST(req: Request) {
  const corpo = (await req.json().catch(() => null)) as { fatura?: unknown } | null;
  const parsed = validarFaturaCompleta(corpo?.fatura);
  if (!parsed.success) {
    return Response.json({ erro: "Fatura incompleta ou inválida", campos: parsed.error.flatten().fieldErrors }, { status: 422 });
  }
  const inj = detectarInjecao(parsed.data.observacoes);
  const fatura = { ...parsed.data, id: `up-${randomUUID().slice(0, 8)}`, observacoes: inj.trecho_sanitizado || undefined };
  (store.faturasExtraidas ??= []).push(fatura);
  registrarEvidencia({ tipo: "fatura_confirmada", ref: fatura.id, dados: { alerta_injecao: inj.suspeito } });
  return Response.json(fatura, { status: 201 });
}
