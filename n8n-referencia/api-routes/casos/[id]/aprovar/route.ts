import { z } from "zod";
import { registrarEvidencia, store } from "@/lib/store";

const Body = z.object({ operador: z.string().min(2) });

/** HITL: só uma pessoa (operador) move o caso de "aguardando_aprovacao" para "documentacao". */
export async function POST(req: Request, ctx: RouteContext<"/api/casos/[id]/aprovar">) {
  const { id } = await ctx.params;
  const parsed = Body.safeParse(await req.json());
  if (!parsed.success) return Response.json({ erro: "Informe o operador" }, { status: 400 });

  const caso = store.casos.find((c) => c.id === id);
  if (!caso) return Response.json({ erro: "Caso não encontrado" }, { status: 404 });
  if (caso.etapa !== "aguardando_aprovacao") {
    return Response.json({ erro: `Caso está em "${caso.etapa}", não em aguardando_aprovacao` }, { status: 409 });
  }
  caso.etapa = "documentacao";
  caso.proxima_acao = "Coletar procuração e documentos da unidade";
  caso.aprovado_por = { operador: parsed.data.operador, em: new Date().toISOString() };
  registrarEvidencia({ tipo: "aprovacao_humana", ref: caso.id, dados: caso.aprovado_por });
  return Response.json(caso);
}
