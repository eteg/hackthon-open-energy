import { connection } from "next/server";
import { createHash } from "node:crypto";
import { z } from "zod";
import { buscarFatura, ofertas } from "@/lib/dados";
import { carregarRegras } from "@/lib/regras";
import { simular } from "@/lib/simulador";
import { registrarEvidencia, store } from "@/lib/store";
import { ETAPAS, type Caso } from "@/lib/types";

export async function GET() {
  await connection(); // estado em memória: nunca pré-renderizar
  const casos = [...store.casos].sort((a, b) => b.criado_em.localeCompare(a.criado_em));
  const porEtapa = Object.fromEntries(ETAPAS.map((e) => [e, casos.filter((c) => c.etapa === e).length]));
  return Response.json({
    casos,
    kpis: {
      total: casos.length,
      por_etapa: porEtapa,
      risco_alto: casos.filter((c) => c.risco_desistencia === "alto").length,
      aguardando_aprovacao: porEtapa.aguardando_aprovacao,
      economia_liquida_mensal_total_rs: Math.round(casos.reduce((s, c) => s + c.economia_liquida_mensal_rs, 0) * 100) / 100,
    },
  });
}

const Body = z.object({ faturaId: z.string(), ofertaId: z.string(), cienciaIds: z.array(z.string()) });

/** Cliente solicita migração após dar ciência. Vira caso "aguardando_aprovacao": quem confirma é uma pessoa. */
export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json());
  if (!parsed.success) return Response.json({ erro: "Dados inválidos" }, { status: 400 });
  const { faturaId, ofertaId, cienciaIds } = parsed.data;

  const regras = carregarRegras();
  const faltando = regras.ciencia_obrigatoria.filter((c) => !cienciaIds.includes(c.id)).map((c) => c.id);
  if (faltando.length) return Response.json({ erro: "Ciência incompleta", faltando }, { status: 422 });

  const fatura = buscarFatura(faturaId);
  if (!fatura) return Response.json({ erro: "Fatura não encontrada" }, { status: 404 });
  const sim = simular(fatura, ofertas, regras);
  const oferta = sim.ofertas.find((o) => o.oferta_id === ofertaId);
  if (!oferta) return Response.json({ erro: "Oferta não encontrada" }, { status: 404 });

  const agora = new Date().toISOString();
  const hash = createHash("sha256").update(JSON.stringify({ faturaId, ofertaId, cienciaIds, agora, versao: regras.versao })).digest("hex");
  const caso: Caso = {
    id: `caso-${String(store.casos.length + 1).padStart(3, "0")}`,
    cliente: fatura.titular,
    segmento: fatura.segmento,
    uf: fatura.uf,
    etapa: "aguardando_aprovacao",
    criado_em: agora.slice(0, 10),
    economia_liquida_mensal_rs: oferta.economia_liquida_mensal_rs.base,
    oferta_id: ofertaId,
    risco_desistencia: "baixo",
    motivo_risco: null,
    proxima_acao: "Operador revisar e aprovar a migração",
    alerta_beneficio: fatura.beneficios.length > 0,
    ciencia: { itens: cienciaIds, registrada_em: agora, hash },
    recibo_id: sim.recibo_id,
  };
  store.casos.push(caso);
  registrarEvidencia({ tipo: "ciencia", ref: caso.id, dados: { fatura_id: faturaId, oferta_id: ofertaId, itens: cienciaIds, hash, recibo_id: sim.recibo_id } });
  return Response.json(caso, { status: 201 });
}
