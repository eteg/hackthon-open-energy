import { connection } from "next/server";
import { demoResponder } from "@/lib/demo-api";

/**
 * Único endpoint do app: repassa as chamadas do front ao serviço n8n (N8N_BASE_URL).
 * O contrato é o de `src/lib/api.ts` (veja docs/n8n-contrato.md). A URL e o token ficam só no servidor.
 * Sem N8N_BASE_URL, responde em modo demonstração (respostas fixas de `src/lib/demo-api`).
 * Só os caminhos da lista abaixo são repassados: o proxy não vira um redirecionador aberto para o n8n.
 */
const PERMITIDOS: [metodo: string, caminho: RegExp][] = [
  ["GET", /^faturas$/],
  ["POST", /^faturas\/extrair$/],
  ["POST", /^faturas\/confirmar$/],
  ["POST", /^simulacao$/],
  ["GET", /^regras$/],
  ["POST", /^agente$/],
  ["GET", /^casos$/],
  ["POST", /^casos$/],
  ["POST", /^casos\/[\w-]+\/aprovar$/],
  ["GET", /^observabilidade$/],
  ["GET", /^varejista$/],
  ["PUT", /^varejista$/],
];
const TIMEOUT_MS = 60_000; // leitura de fatura por IA pode demorar

async function tratar(req: Request, ctx: RouteContext<"/api/[...caminho]">) {
  await connection(); // dado de requisição e estado em memória: nunca pré-renderizar
  const { caminho: partes } = await ctx.params;
  const caminho = partes.join("/");
  if (!PERMITIDOS.some(([m, re]) => m === req.method && re.test(caminho))) {
    return Response.json({ erro: "Rota não encontrada" }, { status: 404 });
  }

  const base = process.env.N8N_BASE_URL?.replace(/\/+$/, "");
  if (!base) {
    const multipart = req.headers.get("content-type")?.includes("multipart/form-data") ?? false;
    const json = multipart || req.method === "GET" ? undefined : await req.json().catch(() => undefined);
    const r = await demoResponder({ metodo: req.method, caminho, json, arquivo: multipart });
    return Response.json(r.body, { status: r.status });
  }

  const destino = new URL(`${base}/${caminho}`);
  destino.search = new URL(req.url).search;
  const headers = new Headers();
  const tipo = req.headers.get("content-type");
  if (tipo) headers.set("content-type", tipo); // preserva o boundary do multipart
  headers.set("accept", "application/json");
  if (process.env.N8N_TOKEN) headers.set("authorization", `Bearer ${process.env.N8N_TOKEN}`);

  try {
    const res = await fetch(destino, {
      method: req.method,
      headers,
      body: req.method === "GET" ? undefined : req.body,
      // @ts-expect-error `duplex` é exigido pelo Node para enviar o corpo em stream
      duplex: "half",
      signal: AbortSignal.timeout(TIMEOUT_MS),
      cache: "no-store",
    });
    const texto = await res.text();
    try {
      return Response.json(JSON.parse(texto), { status: res.status });
    } catch {
      // Resposta que não é JSON (erro cru do n8n, página de proxy): o front sempre recebe { erro }.
      return Response.json({ erro: res.ok ? "Resposta inesperada do serviço" : "O serviço está indisponível agora. Tente de novo." }, { status: res.ok ? 502 : res.status });
    }
  } catch (e) {
    console.error("[proxy n8n] falha ao chamar o serviço:", e instanceof Error ? e.message : e);
    return Response.json({ erro: "Não consegui falar com o serviço agora. Tente de novo." }, { status: 502 });
  }
}

export { tratar as GET, tratar as POST, tratar as PUT };
