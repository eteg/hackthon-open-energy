import { z } from "zod";

// ---------- Fatura (saída tipada da extração; hoje vem da base sintética) ----------
export const BeneficioSchema = z.enum(["TSEE", "irrigacao", "aquicultura"]);
export const ClasseSchema = z.enum(["comercial", "industrial", "residencial", "rural"]);

export const FaturaSchema = z.object({
  id: z.string(),
  titular: z.string(),
  segmento: z.string(),
  classe: ClasseSchema,
  subgrupo: z.enum(["B1", "B2", "B3", "B4"]),
  tensao_v: z.number().positive(),
  distribuidora: z.string(),
  uf: z.string().length(2),
  mes_referencia: z.string(), // AAAA-MM
  consumo_kwh: z.number().nonnegative(),
  historico_12m_kwh: z.array(z.number().nonnegative()).length(12),
  componentes: z.object({
    energia_te_rs: z.number().nonnegative(),
    distribuicao_tusd_rs: z.number().nonnegative(),
    bandeira_rs: z.number().nonnegative(),
    cip_rs: z.number().nonnegative(),
    tributos_rs: z.number().nonnegative(),
    desconto_beneficio_rs: z.number().nonnegative(), // valor do benefício abatido na conta
  }),
  total_rs: z.number().nonnegative(),
  beneficios: z.array(BeneficioSchema),
  observacoes: z.string().optional(), // texto livre extraído do documento — é DADO, nunca instrução
});
export type Fatura = z.infer<typeof FaturaSchema>;
export type Classe = z.infer<typeof ClasseSchema>;
export type Beneficio = z.infer<typeof BeneficioSchema>;

// ---------- Ofertas sintéticas ----------
export type Oferta = {
  id: string;
  varejista: string;
  nome: string;
  prazo_meses: number;
  taxa_mensal_rs: number;
  reajuste: string;
  multa: string;
} & (
  | { tipo: "desconto_percentual"; desconto_energia_pct: number }
  | { tipo: "preco_fixo"; preco_energia_rs_kwh: number }
  | { tipo: "indexado"; desconto_inicial_pct: number; meses_iniciais: number; desconto_apos_pct: number }
);

// ---------- Regras (regras/*.yaml) ----------
export type ItemCiencia = { id: string; texto: string; fonte: string };
export type Regras = {
  versao: string;
  base_conferida_em: string;
  nome_varejista: string;
  abertura_por_classe: Record<Classe, string>;
  fonte_abertura: string;
  grupo_b_tensao_max_v: number;
  antecedencia_migracao_dias: number;
  retorno_acr_aviso_meses: number;
  arrependimento_dias: number;
  beneficios_nao_aplicaveis: Record<Beneficio, string>;
  fonte_beneficios: string;
  premissas_produto: {
    horizonte_meses: number;
    economia_minima_mensal_rs: number;
    limiar_confianca_agente: number;
    cenarios: { pessimista: number; base: number; otimista: number };
    textos: string[];
  };
  pendencias_aneel: string[];
  ciencia_obrigatoria: ItemCiencia[];
};

// ---------- Simulação ----------
export type Faixa = { pessimista: number; base: number; otimista: number };

export type ResultadoOferta = {
  oferta_id: string;
  nome: string;
  varejista: string;
  tipo: Oferta["tipo"];
  prazo_meses: number;
  reajuste: string;
  multa: string;
  taxa_mensal_rs: number;
  desconto_efetivo_energia_pct: number; // base, média no horizonte
  economia_bruta_mensal_rs: Faixa; // antes da taxa e da perda de benefício
  economia_liquida_mensal_rs: Faixa; // − taxa − benefício perdido
  economia_pct_conta_base: number;
  economia_liquida_horizonte_rs: number;
  compensa: boolean;
  motivo_nao_compensa: string | null;
  memoria_calculo: string[];
};

export type Alerta = {
  tipo: "perda_beneficio" | "elegibilidade" | "pendencia_regulatoria" | "injecao";
  severidade: "alta" | "media" | "info";
  mensagem: string;
  fonte?: string;
};

export type Simulacao = {
  recibo_id: string;
  gerado_em: string;
  versao_regras: string;
  fatura_id: string;
  elegibilidade: {
    grupo_b: boolean;
    data_abertura: string;
    prazo_formalizacao: string; // último dia para formalizar e migrar na abertura
    fonte: string;
  };
  parcela_energia_pct: number;
  perda_beneficio_mensal_rs: number;
  ofertas: ResultadoOferta[];
  melhor_oferta_id: string | null;
  veredito: "compensa" | "nao_compensa" | "fora_do_escopo";
  alertas: Alerta[];
  premissas: string[];
};

// ---------- Casos (painel do varejista) ----------
export const ETAPAS = [
  "simulado",
  "ciencia_pendente",
  "aguardando_aprovacao",
  "documentacao",
  "formalizado",
  "escalado_humano",
] as const;
export type Etapa = (typeof ETAPAS)[number];

export type Caso = {
  id: string;
  cliente: string;
  segmento: string;
  uf: string;
  etapa: Etapa;
  criado_em: string;
  economia_liquida_mensal_rs: number;
  oferta_id: string | null;
  risco_desistencia: "baixo" | "medio" | "alto";
  motivo_risco: string | null;
  proxima_acao: string;
  alerta_beneficio: boolean;
  ciencia?: { itens: string[]; registrada_em: string; hash: string };
  aprovado_por?: { operador: string; em: string };
  recibo_id?: string;
};

// ---------- Agente ----------
export const AgenteSaidaSchema = z.object({
  resposta: z.string(),
  fontes: z.array(z.string()),
  confianca: z.number().min(0).max(1),
  escalar_humano: z.boolean(),
  motivo_escalonamento: z.string().nullable(),
  alerta_injecao: z.boolean(),
  proxima_acao: z.enum([
    "explicar_fatura",
    "simular",
    "checklist",
    "coletar_documento",
    "ciencia_riscos",
    "transferir_humano",
    "nenhuma",
  ]),
});
export type AgenteSaida = z.infer<typeof AgenteSaidaSchema>;
export type MensagemChat = { papel: "cliente" | "agente"; texto: string };
