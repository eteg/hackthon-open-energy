import { z } from "zod";
import { ofertas } from "@/lib/dados";
import { carregarRegras } from "@/lib/regras";
import { simular } from "@/lib/simulador";
import { obterFatura, registrarEvidencia } from "@/lib/store";

const Body = z.object({ faturaId: z.string(), ofertaIds: z.array(z.string()).optional() });

/** Simulação determinística: o código calcula; a IA só explica. */
export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json());
  if (!parsed.success) return Response.json({ erro: "faturaId obrigatório" }, { status: 400 });

  const fatura = obterFatura(parsed.data.faturaId);
  if (!fatura) return Response.json({ erro: "Fatura não encontrada" }, { status: 404 });

  const lista = parsed.data.ofertaIds ? ofertas.filter((o) => parsed.data.ofertaIds!.includes(o.id)) : ofertas;
  const sim = simular(fatura, lista, carregarRegras());
  registrarEvidencia({
    tipo: "simulacao",
    ref: sim.recibo_id,
    dados: { fatura_id: fatura.id, versao_regras: sim.versao_regras, veredito: sim.veredito, melhor_oferta_id: sim.melhor_oferta_id },
  });
  return Response.json(sim);
}
