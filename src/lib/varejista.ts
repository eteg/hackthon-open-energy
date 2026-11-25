/**
 * Cadastro da comercializadora varejista que opera o Copiloto.
 * O mesmo schema valida o formulário (feedback imediato) e a rota PUT /api/varejista (validação final).
 * Sem dependências de Node: roda no navegador e no servidor.
 */
import { z } from "zod";

export const UFS = [
  "AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA", "MT", "MS", "MG", "PA",
  "PB", "PR", "PE", "PI", "RJ", "RN", "RS", "RO", "RR", "SC", "SP", "SE", "TO",
] as const;
export type UF = (typeof UFS)[number];

export const SITUACOES_CCEE = {
  habilitado: "Habilitado como varejista",
  em_habilitacao: "Habilitação em andamento",
} as const;

// ---------- Normalização e máscaras ----------
export const soDigitos = (v: string) => v.replace(/\D/g, "");
/** CNPJ sem pontuação, em maiúsculas. Desde jul/2026 a Receita emite CNPJ alfanumérico (12 posições + 2 DVs numéricos). */
export const limparCnpj = (v: string) => v.toUpperCase().replace(/[^0-9A-Z]/g, "");

function mascara(valor: string, padrao: string) {
  let saida = "";
  let i = 0;
  for (const p of padrao) {
    if (i >= valor.length) break;
    saida += p === "#" ? valor[i++] : p;
  }
  return saida;
}

export const formatarCnpj = (v: string) => mascara(limparCnpj(v).slice(0, 14), "##.###.###/####-##");
export const formatarCep = (v: string) => mascara(soDigitos(v).slice(0, 8), "#####-###");
export function formatarTelefone(v: string) {
  const d = soDigitos(v).slice(0, 11);
  return mascara(d, d.length > 10 ? "(##) #####-####" : "(##) ####-####");
}

/** Dígitos verificadores do CNPJ (numérico ou alfanumérico): valor de cada caractere = código ASCII − 48. */
export function cnpjValido(valor: string): boolean {
  const c = limparCnpj(valor);
  if (!/^[0-9A-Z]{12}[0-9]{2}$/.test(c) || /^(.)\1{13}$/.test(c)) return false;
  const dv = (base: string) => {
    const pesos = base.length === 12 ? [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2] : [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
    const resto = [...base].reduce((s, ch, i) => s + (ch.charCodeAt(0) - 48) * pesos[i], 0) % 11;
    return resto < 2 ? 0 : 11 - resto;
  };
  const d1 = dv(c.slice(0, 12));
  const d2 = dv(c.slice(0, 12) + d1);
  return c.endsWith(`${d1}${d2}`);
}

// ---------- Schema ----------
const texto = (min: number, max: number, rotulo: string) =>
  z.string().trim().min(min, `Informe ${rotulo}`).max(max, `Máximo de ${max} caracteres`);
const opcional = (max: number) => z.string().trim().max(max, `Máximo de ${max} caracteres`).default("");
const MSG_TELEFONE = "Telefone com DDD (10 ou 11 dígitos)";
const telefone = z.string().transform(soDigitos).pipe(z.string().regex(/^[1-9]{2}\d{8,9}$/, MSG_TELEFONE));
const telefoneOpcional = z
  .string()
  .default("")
  .transform(soDigitos)
  .pipe(z.union([z.literal(""), z.string().regex(/^[1-9]{2}\d{8,9}$/, MSG_TELEFONE)]));
const email = z.string().trim().toLowerCase().pipe(z.email("E-mail inválido"));

export const VarejistaSchema = z.object({
  // Identificação
  razao_social: texto(3, 150, "a razão social"),
  nome_fantasia: texto(2, 80, "o nome fantasia"),
  cnpj: z
    .string()
    .transform(limparCnpj)
    .pipe(z.string().min(1, "Informe o CNPJ").refine(cnpjValido, "CNPJ inválido (confira os dígitos)")),
  inscricao_estadual: opcional(20),
  // Habilitação regulatória
  codigo_agente_ccee: z
    .string()
    .trim()
    .min(1, "Informe o código do agente na CCEE")
    .regex(/^\d{1,10}$/, "Só números, até 10 dígitos"),
  situacao_ccee: z.enum(["habilitado", "em_habilitacao"], "Escolha a situação na CCEE"),
  ufs_atuacao: z.array(z.enum(UFS)).min(1, "Escolha ao menos um estado"),
  // Endereço da sede
  cep: z.string().transform(soDigitos).pipe(z.string().length(8, "CEP com 8 dígitos")),
  logradouro: texto(3, 120, "o logradouro"),
  numero: texto(1, 10, "o número"),
  complemento: opcional(60),
  bairro: texto(2, 60, "o bairro"),
  cidade: texto(2, 60, "a cidade"),
  uf: z.enum(UFS, "Escolha a UF"),
  // Atendimento ao consumidor
  sac_telefone: telefone,
  sac_email: email,
  whatsapp: telefoneOpcional,
  site: z.string().trim().default("").pipe(z.union([z.literal(""), z.url("Endereço inválido (use https://…)")])),
  // Responsáveis
  responsavel_nome: texto(3, 100, "o nome do responsável"),
  responsavel_cargo: opcional(60),
  responsavel_email: email,
  responsavel_telefone: telefone,
  encarregado_dados_nome: texto(3, 100, "o nome do encarregado de dados"),
  encarregado_dados_email: email,
  // Declaração
  declaracao: z.literal(true, "Confirme a declaração para salvar"),
});

/** O que o formulário envia (antes da normalização). */
export type VarejistaEntrada = z.input<typeof VarejistaSchema>;
/** O que fica guardado: dados normalizados + quando e com que hash a declaração foi aceita. */
export type Varejista = Omit<z.output<typeof VarejistaSchema>, "declaracao"> & {
  cadastrado_em: string;
  atualizado_em: string;
  declaracao: { aceita_em: string; hash: string };
};
export type CampoVarejista = keyof VarejistaEntrada;
