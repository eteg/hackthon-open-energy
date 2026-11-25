/** Cliente HTTP do front (Axios). Toda chamada passa por aqui e vai ao proxy /api, que repassa ao serviço n8n. */
import axios, { AxiosError } from "axios";
import type { FaturaParcial } from "./fatura-campos";
import type { Caso, CasoPublico, Etapa, Fatura, ItemCiencia, Simulacao } from "./types";


export const http = axios.create({
  baseURL: "/api", // proxy do Next: repassa ao n8n (URL e token só no servidor)
  timeout: 20_000,
  headers: { "Content-Type": "application/json" },
});

/** Erro de API com mensagem legível, o status HTTP (0 = sem resposta) e, quando a validação falha, os erros de cada campo. */
export class ErroApi extends Error {
  constructor(
    mensagem: string,
    public campos: Record<string, string[] | undefined> = {},
    public status = 0
  ) {
    super(mensagem);
  }
}

// Normaliza erros: a UI sempre recebe ErroApi com mensagem legível em português.
http.interceptors.response.use(
  (r) => r,
  (e: AxiosError<{ erro?: string; campos?: Record<string, string[] | undefined> }>) => {
    const msg = e.response?.data?.erro ?? (e.code === "ECONNABORTED" ? "Tempo esgotado. Tente de novo." : e.message);
    return Promise.reject(new ErroApi(msg, e.response?.data?.campos, e.response?.status ?? 0));
  }
);

export type FaturaResumo = Pick<Fatura, "id" | "titular" | "segmento" | "classe" | "uf" | "total_rs" | "consumo_kwh" | "beneficios">;
export type Extracao = { origem: string; fatura: Fatura; alerta_injecao: boolean; padroes_injecao: string[] };
export type ExtracaoArquivo = {
  origem: "arquivo";
  fatura: FaturaParcial;
  ausentes: string[];
  confianca: number;
  alerta_injecao: boolean;
  padroes_injecao: string[];
  /** Presente só quando a leitura é MOCKADA (n8n falhou ou não configurado): não é a fatura enviada. */
  fallback?: { ativo: true; motivo: string };
};
export type RegrasPublicas = {
  versao: string;
  base_conferida_em: string;
  nome_varejista: string;
  ciencia_obrigatoria: ItemCiencia[];
  premissas: string[];
  pendencias_aneel: string[];
};
export type Painel = {
  casos: Caso[];
  kpis: {
    total: number;
    por_etapa: Record<Etapa, number>;
    risco_alto: number;
    aguardando_aprovacao: number;
    economia_liquida_mensal_total_rs: number;
  };
};

export const api = {
  listarFaturas: () => http.get<FaturaResumo[]>("/faturas").then((r) => r.data),
  extrairFatura: (faturaId: string) => http.post<Extracao>("/faturas/extrair", { faturaId }).then((r) => r.data),
  extrairDeArquivo: (arquivo: File) => {
    const form = new FormData();
    form.append("arquivo", arquivo);
    return http
      .post<ExtracaoArquivo>("/faturas/extrair", form, { headers: { "Content-Type": "multipart/form-data" }, timeout: 60_000 })
      .then((r) => {
        if (r.data.fallback?.ativo) {
          console.log(`[leitura da fatura] FALLBACK: o n8n falhou, exibindo dado MOCKADO (não é a sua fatura). Motivo: ${r.data.fallback.motivo}`, r.data);
        } else {
          console.log("[leitura da fatura] dados vindos do n8n:", r.data);
        }
        return r.data;
      });
  },
  confirmarFatura: (fatura: FaturaParcial) => http.post<Fatura>("/faturas/confirmar", { fatura }).then((r) => r.data),
  simular: (faturaId: string) => http.post<Simulacao>("/simulacao", { faturaId }).then((r) => r.data),
  regras: () => http.get<RegrasPublicas>("/regras").then((r) => r.data),
  painel: () => http.get<Painel>("/casos").then((r) => r.data),
  /** Consulta pública do andamento pelo link (`acompanhamento_id` devolvido ao criar o caso). */
  acompanharCaso: (acompanhamentoId: string) => http.get<CasoPublico>(`/casos/${acompanhamentoId}`).then((r) => r.data),
  solicitarMigracao: (faturaId: string, ofertaId: string, cienciaIds: string[]) =>
    http.post<Caso>("/casos", { faturaId, ofertaId, cienciaIds }).then((r) => r.data),
  aprovarCaso: (casoId: string, operador: string) =>
    http.post<Caso>(`/casos/${casoId}/aprovar`, { operador }).then((r) => r.data),
};
