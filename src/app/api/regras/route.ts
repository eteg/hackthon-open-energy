import { carregarRegras } from "@/lib/regras";

export async function GET() {
  const r = carregarRegras();
  return Response.json({
    versao: r.versao,
    base_conferida_em: r.base_conferida_em,
    nome_varejista: r.nome_varejista,
    ciencia_obrigatoria: r.ciencia_obrigatoria,
    premissas: r.premissas_produto.textos,
    pendencias_aneel: r.pendencias_aneel,
  });
}
