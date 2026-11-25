import { connection } from "next/server";
import { createHash } from "node:crypto";
import { z } from "zod";
import { registrarEvidencia, store } from "@/lib/store";
import { VarejistaSchema, type Varejista } from "@/lib/varejista";

export async function GET() {
  await connection(); // estado em memória: nunca pré-renderizar
  return Response.json({ varejista: store.varejista ?? null });
}

/** Cria ou atualiza o cadastro da empresa. A declaração de veracidade fica registrada com hash, como a ciência do cliente. */
export async function PUT(req: Request) {
  const parsed = VarejistaSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return Response.json(
      { erro: "Revise os campos destacados", campos: z.flattenError(parsed.error).fieldErrors },
      { status: 400 }
    );
  }

  const { declaracao, ...dados } = parsed.data;
  const anterior = store.varejista ?? null;
  const agora = new Date().toISOString();
  // O hash amarra a declaração aceita aos dados exatos e ao momento do aceite.
  const hash = createHash("sha256").update(JSON.stringify({ ...dados, declaracao, aceita_em: agora })).digest("hex");
  const varejista: Varejista = {
    ...dados,
    cadastrado_em: anterior?.cadastrado_em ?? agora,
    atualizado_em: agora,
    declaracao: { aceita_em: agora, hash },
  };
  store.varejista = varejista;
  // Só dados da empresa na evidência (nada de nome/e-mail de pessoas nos logs).
  registrarEvidencia({
    tipo: "cadastro_varejista",
    ref: varejista.cnpj,
    dados: { acao: anterior ? "atualizacao" : "cadastro", situacao_ccee: varejista.situacao_ccee, hash },
  });
  return Response.json(varejista, { status: anterior ? 200 : 201 });
}
