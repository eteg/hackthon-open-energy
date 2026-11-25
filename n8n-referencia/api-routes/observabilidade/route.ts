import { connection } from "next/server";
import { store } from "@/lib/store";

export async function GET() {
  await connection();
  const regs = store.observabilidade;
  const n = regs.length;
  const soma = (f: (r: (typeof regs)[number]) => number) => regs.reduce((s, r) => s + f(r), 0);
  const custos = regs.map((r) => r.custo_usd).filter((c): c is number => c !== null);
  return Response.json({
    chamadas: n,
    latencia_media_ms: n ? Math.round(soma((r) => r.latencia_ms) / n) : 0,
    tokens_entrada: soma((r) => r.tokens_entrada),
    tokens_saida: soma((r) => r.tokens_saida),
    custo_total_usd: custos.length === n ? Math.round(custos.reduce((a, b) => a + b, 0) * 1e6) / 1e6 : null,
    taxa_escalonamento: n ? Math.round((regs.filter((r) => r.escalou).length / n) * 1000) / 10 : 0,
    injecoes_bloqueadas: store.evidencias.filter((e) => e.tipo === "injecao_bloqueada").length,
    ultimas: regs.slice(-20).reverse(),
  });
}
