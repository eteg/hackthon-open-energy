import { faturas } from "@/lib/dados";

/** Lista resumida das faturas sintéticas disponíveis para a demo. */
export async function GET() {
  return Response.json(
    faturas.map(({ id, titular, segmento, classe, uf, total_rs, consumo_kwh, beneficios }) => ({
      id, titular, segmento, classe, uf, total_rs, consumo_kwh, beneficios,
    }))
  );
}
