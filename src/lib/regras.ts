import { readFileSync } from "node:fs";
import path from "node:path";
import YAML from "yaml";
import type { Regras } from "./types";

export const VERSAO_REGRAS_ATUAL = process.env.VERSAO_REGRAS ?? "v2026-11";

const cache = new Map<string, Regras>();

/** Lê regras/<versao>.yaml. Regra fora do código: mudou a norma, muda o arquivo. */
export function carregarRegras(versao = VERSAO_REGRAS_ATUAL): Regras {
  const hit = cache.get(versao);
  if (hit) return hit;
  const arquivo = path.join(process.cwd(), "regras", `${versao}.yaml`);
  const regras = YAML.parse(readFileSync(arquivo, "utf8")) as Regras;
  cache.set(versao, regras);
  return regras;
}
