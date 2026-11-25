/** Cliente único do provedor de LLM (Gemini). Agente e extração de fatura passam por aqui. */
import { GoogleGenAI } from "@google/genai";
import { z } from "zod";

export const MODELO = process.env.GEMINI_MODEL ?? "gemini-2.5-flash";
export const temChave = () => !!process.env.GEMINI_API_KEY;

/** JSON Schema aceito pelo Gemini a partir de um schema zod. */
export function jsonSchema(schema: z.ZodType): unknown {
  const { $schema: _s, ...resto } = z.toJSONSchema(schema) as Record<string, unknown>;
  void _s;
  return resto;
}

export type Parte = { text: string } | { inlineData: { mimeType: string; data: string } };
export type Turno = { role: "user" | "model"; parts: Parte[] };

/** Chama o Gemini com saída JSON validada por schema (o chamador faz o parse com zod). */
export async function gerarJson(opts: { system: string; turnos: Turno[]; schema: z.ZodType; maxTokens: number }) {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY, apiVersion: "v1beta" }); // lê a chave só aqui
  const res = await ai.models.generateContent({
    model: MODELO,
    contents: opts.turnos,
    config: {
      systemInstruction: opts.system,
      responseMimeType: "application/json",
      responseJsonSchema: jsonSchema(opts.schema),
      maxOutputTokens: opts.maxTokens,
      temperature: 0,
    },
  });
  if (!res.text) throw new Error("Gemini não devolveu conteúdo (bloqueio de segurança ou resposta vazia)");
  return {
    json: JSON.parse(res.text) as unknown,
    tokens_entrada: res.usageMetadata?.promptTokenCount ?? 0,
    tokens_saida: res.usageMetadata?.candidatesTokenCount ?? 0,
  };
}
