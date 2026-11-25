/** Montagem da fatura a partir da leitura/digitação: números em pt-BR e valores PADRÃO EXPLÍCITOS para o que o consumidor não informou. */
import { CAMPOS, definirCaminho, lerCaminho, validarFaturaCompleta, type CampoDef, type FaturaParcial } from "@/lib/fatura-campos";

/** Os 3 dados que o design pede ao consumidor (S3b/S3c). */
export const CAMPOS_ESSENCIAIS = ["distribuidora", "total_rs", "consumo_kwh"] as const;

export const ROTULO: Record<string, string> = {
  distribuidora: "Distribuidora",
  total_rs: "Valor da conta do mês (R$)",
  consumo_kwh: "Consumo médio (kWh por mês)",
};
export const PLACEHOLDER: Record<string, string> = { total_rs: "Ex.: 5.221,00", consumo_kwh: "Ex.: 4.850" };

/** Aceita "5.221,00", "R$ 5.221,00", "4.850", "4850,5", "5221.50". Devolve undefined se não for número. */
export function numeroPtBr(texto: string): number | undefined {
  let s = texto.replace(/R\$|kwh|\s/gi, "");
  if (s === "") return undefined;
  if (s.includes(",")) s = s.replace(/\./g, "").replace(",", ".");
  else if (/^\d{1,3}(\.\d{3})+$/.test(s)) s = s.replace(/\./g, "");
  const n = Number(s);
  return Number.isFinite(n) ? n : undefined;
}

/** Converte o texto de um campo para o tipo do schema. */
export function converterCampo(c: CampoDef, v: string): unknown {
  if (c.tipo === "numero") return numeroPtBr(v);
  if (c.tipo === "uf") return v.trim().toUpperCase();
  return v.trim();
}

export function textoInicial(c: CampoDef, v: unknown): string {
  if (v === undefined || v === null) return "";
  if (c.tipo === "numero" && typeof v === "number") return v.toLocaleString("pt-BR", { maximumFractionDigits: 2 });
  return String(v);
}

/** Campos que NÃO pedimos ao consumidor mesmo se a leitura não os trouxe: recebem padrão explícito (ver `completarComPadroes`). */
const COM_PADRAO = (caminho: string) => caminho === "titular" || caminho === "segmento" || caminho === "historico_12m_kwh" || caminho.startsWith("componentes.");

/** Campos que a conferência precisa mostrar como entrada: os essenciais + outros obrigatórios que a leitura não trouxe. */
export function camposParaPreencher(ausentes: string[]): CampoDef[] {
  const essenciais = CAMPOS_ESSENCIAIS.map((k) => CAMPOS.find((c) => c.caminho === k)!);
  const outros = CAMPOS.filter((c) => !(CAMPOS_ESSENCIAIS as readonly string[]).includes(c.caminho) && ausentes.includes(c.caminho) && !COM_PADRAO(c.caminho));
  return [...essenciais, ...outros];
}

/**
 * Divisão PADRÃO da conta, usada só quando a conta não foi lida (S3c) ou faltou algum componente:
 * energia 32%, distribuição 28%, tributos 28%, bandeira 4%, iluminação pública 8% (os 12% restantes do design = encargos/transmissão).
 * É uma estimativa (a faixa de economia sai mais larga); por isso o caso fica com `origem: "digitado"`.
 */
const DIVISAO_PADRAO = { energia_te_rs: 0.32, distribuicao_tusd_rs: 0.28, bandeira_rs: 0.04, cip_rs: 0.08 } as const;

const UF_POR_DISTRIBUIDORA: [RegExp, string][] = [
  [/baian/i, "BA"], [/cearen/i, "CE"], [/gaúch|gaucha/i, "RS"], [/mineir/i, "MG"], [/paranaens/i, "PR"], [/paulist/i, "SP"],
];

export type Montagem = { fatura: FaturaParcial; assumido: string[]; derivouComponentes: boolean };

/**
 * Completa o que o consumidor não informou com valores padrão EXPLÍCITOS (nada é "lido" do nada) e lista cada premissa em `assumido`.
 * - titular → "Titular não informado"; segmento → "Não informado"
 * - histórico de 12 meses → 12 × o consumo informado
 * - componentes da conta → divisão padrão sobre o total (DIVISAO_PADRAO); desconto de benefício → 0
 * - `semConta` (S3c): também classe "comercial", subgrupo B3, tensão 220 V, mês atual (`mesAtual`, AAAA-MM, vem do cliente: `new Date()` não pode rodar no prerender) e UF pela distribuidora (SP se desconhecida)
 */
export function completarComPadroes(base: FaturaParcial, semConta = false, mesAtual = ""): Montagem {
  const f = structuredClone(base) as Record<string, unknown>;
  const assumido: string[] = [];
  const faltou = (c: string) => {
    const v = lerCaminho(f, c);
    return v === undefined || v === null || v === "" || (typeof v === "number" && Number.isNaN(v));
  };
  const usar = (caminho: string, valor: unknown, texto: string) => {
    definirCaminho(f, caminho, valor);
    assumido.push(texto);
  };

  if (faltou("titular")) usar("titular", "Titular não informado", "titular não informado");
  if (faltou("segmento")) usar("segmento", "Não informado", "segmento não informado");
  if (semConta) {
    if (faltou("classe")) usar("classe", "comercial", "classe comercial");
    if (faltou("subgrupo")) usar("subgrupo", "B3", "subgrupo B3");
    if (faltou("tensao_v")) usar("tensao_v", 220, "tensão de 220 V");
    if (faltou("mes_referencia") && mesAtual) usar("mes_referencia", mesAtual, "mês de referência = mês atual");
    if (faltou("uf")) {
      const uf = UF_POR_DISTRIBUIDORA.find(([re]) => re.test(String(f.distribuidora ?? "")))?.[1] ?? "SP";
      usar("uf", uf, `UF ${uf}`);
    }
  }
  const consumo = f.consumo_kwh;
  if (faltou("historico_12m_kwh") && typeof consumo === "number") {
    usar("historico_12m_kwh", Array<number>(12).fill(consumo), "histórico de 12 meses igual ao consumo informado");
  }

  const total = f.total_rs;
  const chaves = ["energia_te_rs", "distribuicao_tusd_rs", "bandeira_rs", "cip_rs", "tributos_rs"];
  const derivar = typeof total === "number" && chaves.some((k) => faltou(`componentes.${k}`));
  if (derivar) {
    const r2 = (n: number) => Math.round(n * 100) / 100;
    const partes = Object.fromEntries(Object.entries(DIVISAO_PADRAO).map(([k, p]) => [k, r2(total * p)])) as Record<string, number>;
    const tributos = r2(total - Object.values(partes).reduce((a, b) => a + b, 0));
    for (const [k, v] of Object.entries({ ...partes, tributos_rs: tributos })) definirCaminho(f, `componentes.${k}`, v);
    assumido.push("componentes da conta divididos por proporção padrão (energia 32%)");
  }
  if (faltou("componentes.desconto_beneficio_rs")) definirCaminho(f, "componentes.desconto_beneficio_rs", 0);

  return { fatura: f as FaturaParcial, assumido, derivouComponentes: derivar };
}

export { validarFaturaCompleta };
