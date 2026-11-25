/**
 * RAG mínimo e sem custo: cada "## pergunta" da FAQ é um chunk; ranqueia por sobreposição de termos.
 * Trocável por embeddings depois, sem mudar a interface.
 */
import { readFileSync } from "node:fs";
import path from "node:path";

export type Chunk = { pergunta: string; resposta: string; fonte: string };
export type Hit = Chunk & { score: number };

const STOP = new Set(
  "a o e de da do das dos em no na nos nas um uma para por com sem que se eu meu minha voce vc ao os as é ser vou sou tem ter como qual quais quando quem isso esse essa".split(" ")
);

const normalizar = (t: string) =>
  t
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9%\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 2 && !STOP.has(w));

let chunks: Chunk[] | null = null;

export function carregarChunks(): Chunk[] {
  if (chunks) return chunks;
  const md = readFileSync(path.join(process.cwd(), "conhecimento", "faq-regulatoria.md"), "utf8");
  chunks = md
    .split(/\n## /)
    .slice(1)
    .map((bloco) => {
      const [pergunta, ...resto] = bloco.split("\n");
      const corpo = resto.join("\n").trim();
      const fonte = corpo.match(/\*\*Fonte:\*\*\s*(.+)/)?.[1]?.trim() ?? "";
      const resposta = corpo.replace(/\*\*Fonte:\*\*.+/, "").trim();
      return { pergunta: pergunta.trim(), resposta, fonte };
    });
  return chunks;
}

export function buscar(consulta: string, k = 3): Hit[] {
  const q = new Set(normalizar(consulta));
  if (q.size === 0) return [];
  return carregarChunks()
    .map((c) => {
      const termosPergunta = new Set(normalizar(c.pergunta));
      const termosCorpo = new Set(normalizar(c.resposta));
      let s = 0;
      for (const t of q) s += (termosPergunta.has(t) ? 2 : 0) + (termosCorpo.has(t) ? 1 : 0);
      return { ...c, score: s / (q.size * 3) }; // 0..1
    })
    .filter((h) => h.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, k);
}
