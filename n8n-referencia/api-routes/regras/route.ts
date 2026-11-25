import { connection } from "next/server";
import { carregarRegras } from "@/lib/regras";
import { nomeVarejista } from "@/lib/store";

export async function GET() {
  await connection(); // o nome vem do cadastro em memória: nunca pré-renderizar
  const r = carregarRegras();
  return Response.json({
    versao: r.versao,
    base_conferida_em: r.base_conferida_em,
    nome_varejista: nomeVarejista(r.nome_varejista),
    ciencia_obrigatoria: r.ciencia_obrigatoria,
    premissas: r.premissas_produto.textos,
    pendencias_aneel: r.pendencias_aneel,
  });
}
