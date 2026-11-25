/** Base 100% sintética. Proibido usar dados reais de clientes. */
import faturasJson from "../../data/sintetico/faturas.json";
import ofertasJson from "../../data/sintetico/ofertas.json";
import casosJson from "../../data/sintetico/casos.json";
import { FaturaSchema, type Caso, type Fatura, type Oferta } from "./types";

// Valida a base no carregamento: se alguém quebrar o JSON, falha cedo e com mensagem clara.
export const faturas: Fatura[] = faturasJson.map((f) => FaturaSchema.parse(f));
export const ofertas = ofertasJson as Oferta[];
export const casosIniciais = casosJson as Caso[];

export const buscarFatura = (id: string) => faturas.find((f) => f.id === id) ?? null;
