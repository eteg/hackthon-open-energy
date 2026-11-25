/**
 * Camada 1 anti-prompt-injection (heurística, barata e determinística).
 * Camada 2: o system prompt trata documento/mensagem como DADO.
 * Camada 3: a saída do modelo é validada por schema (zod) e números só vêm do simulador.
 */
const PADROES: { id: string; re: RegExp }[] = [
  { id: "ignorar_instrucoes", re: /\b(ignore|ignorar|desconsidere|esque[cç]a)\b.{0,40}\b(instru[cç][oõ]es|regras|prompt|anteriores)\b/i },
  { id: "ignore_previous_en", re: /\b(ignore|disregard)\b.{0,30}\b(previous|prior|above)\b.{0,20}\b(instructions|rules)\b/i },
  { id: "revelar_prompt", re: /\b(revele|mostre|imprima|reveal|print)\b.{0,30}\b(prompt|instru[cç][oõ]es do sistema|system prompt)\b/i },
  { id: "mudar_papel", re: /\b(voc[eê] agora [eé]|a partir de agora voc[eê]|act as|you are now)\b/i },
  { id: "aprovar_desconto", re: /\b(aprove|aprovar|conceda|approve)\b.{0,40}\b(desconto|cr[eé]dito|migra[cç][aã]o|discount)\b/i },
  { id: "mensagem_sistema", re: /\b(mensagem ao sistema|system message|\[system\]|<\/?system>)/i },
];

export type ResultadoInjecao = { suspeito: boolean; padroes: string[]; trecho_sanitizado: string };

export function detectarInjecao(texto: string | undefined | null): ResultadoInjecao {
  if (!texto) return { suspeito: false, padroes: [], trecho_sanitizado: "" };
  const padroes = PADROES.filter((p) => p.re.test(texto)).map((p) => p.id);
  return {
    suspeito: padroes.length > 0,
    padroes,
    trecho_sanitizado: padroes.length > 0 ? "[conteúdo bloqueado: possível instrução embutida no documento]" : texto,
  };
}

const PEDE_HUMANO = /\b(falar com (uma )?(pessoa|humano|atendente|algu[eé]m)|atendente humano|quero um humano)\b/i;
const FORA_DO_ESCOPO_SENSIVEL = /\b(process(o|ar)|advogad|jur[ií]dic|rescis|suspens|cr[eé]dito|cobran[cç]a judicial|indeniza)/i;

export const pedeHumano = (t: string) => PEDE_HUMANO.test(t);
export const temaSensivel = (t: string) => FORA_DO_ESCOPO_SENSIVEL.test(t);
