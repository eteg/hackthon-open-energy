/** Campos de uma fatura lida de arquivo: definição, detecção de ausentes e montagem final. Sem dependências de servidor (usado também no front). */
import { FaturaSchema, type Fatura } from "./types";

export type FaturaParcial = Partial<Omit<Fatura, "id" | "componentes">> & { componentes?: Partial<Fatura["componentes"]> };

export type CampoDef = {
  caminho: string;
  rotulo: string;
  tipo: "texto" | "numero" | "classe" | "subgrupo" | "mes" | "historico" | "uf";
};

/** Campos obrigatórios para simular. `id` é gerado no servidor; `beneficios` e `observacoes` têm tratamento próprio. */
export const CAMPOS: CampoDef[] = [
  { caminho: "titular", rotulo: "Titular", tipo: "texto" },
  { caminho: "segmento", rotulo: "Segmento (ex.: Padaria)", tipo: "texto" },
  { caminho: "classe", rotulo: "Classe", tipo: "classe" },
  { caminho: "subgrupo", rotulo: "Subgrupo", tipo: "subgrupo" },
  { caminho: "tensao_v", rotulo: "Tensão (V)", tipo: "numero" },
  { caminho: "distribuidora", rotulo: "Distribuidora", tipo: "texto" },
  { caminho: "uf", rotulo: "UF", tipo: "uf" },
  { caminho: "mes_referencia", rotulo: "Mês de referência", tipo: "mes" },
  { caminho: "consumo_kwh", rotulo: "Consumo (kWh)", tipo: "numero" },
  { caminho: "historico_12m_kwh", rotulo: "Histórico de 12 meses (kWh, separados por vírgula)", tipo: "historico" },
  { caminho: "componentes.energia_te_rs", rotulo: "Energia TE (R$)", tipo: "numero" },
  { caminho: "componentes.distribuicao_tusd_rs", rotulo: "Distribuição TUSD (R$)", tipo: "numero" },
  { caminho: "componentes.bandeira_rs", rotulo: "Bandeira (R$)", tipo: "numero" },
  { caminho: "componentes.cip_rs", rotulo: "Iluminação pública (R$)", tipo: "numero" },
  { caminho: "componentes.tributos_rs", rotulo: "Tributos (R$)", tipo: "numero" },
  { caminho: "componentes.desconto_beneficio_rs", rotulo: "Desconto de benefício (R$)", tipo: "numero" },
  { caminho: "total_rs", rotulo: "Total da fatura (R$)", tipo: "numero" },
];

export function lerCaminho(obj: unknown, caminho: string): unknown {
  return caminho.split(".").reduce<unknown>((o, k) => (o && typeof o === "object" ? (o as Record<string, unknown>)[k] : undefined), obj);
}

export function definirCaminho(obj: Record<string, unknown>, caminho: string, valor: unknown) {
  const partes = caminho.split(".");
  let o = obj;
  for (const p of partes.slice(0, -1)) o = (o[p] ??= {}) as Record<string, unknown>;
  o[partes[partes.length - 1]] = valor;
}

const vazio = (v: unknown) => v === undefined || v === null || v === "" || (typeof v === "number" && Number.isNaN(v));

/** Caminhos dos campos que a leitura não trouxe. */
export function camposAusentes(f: FaturaParcial): string[] {
  return CAMPOS.filter((c) => {
    const v = lerCaminho(f, c.caminho);
    if (c.tipo === "historico") return !Array.isArray(v) || v.length !== 12 || v.some(vazio);
    return vazio(v);
  }).map((c) => c.caminho);
}

/** Monta e valida a fatura completa (sem id: quem gera é o servidor). */
export function validarFaturaCompleta(f: unknown) {
  return FaturaSchema.omit({ id: true }).safeParse({ beneficios: [], ...(f as object) });
}
