import { z } from "zod";
import { responder } from "@/lib/agente";

const Body = z.object({
  mensagens: z
    .array(z.object({ papel: z.enum(["cliente", "agente"]), texto: z.string().max(4000) }))
    .min(1)
    .max(30),
  faturaId: z.string().nullish(),
});

export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json());
  if (!parsed.success) return Response.json({ erro: "Mensagens inválidas" }, { status: 400 });
  return Response.json(await responder(parsed.data.mensagens, parsed.data.faturaId));
}
