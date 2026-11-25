import { connection } from "next/server";
import { demoResponder } from "@/lib/demo-api";
import { repositorioMemoria } from "@/lib/demo-api/repositorio";
import { repositorioSupabase } from "@/lib/demo-api/repositorio-supabase";
import { dadosSupabaseConfigurados, loginSupabaseConfigurado } from "@/lib/supabase/config";
import { usuarioDaRequisicao, type UsuarioRequisicao } from "@/lib/supabase/servidor";

/**
 * Único endpoint do app: repassa as chamadas do front ao serviço n8n (N8N_BASE_URL).
 * O contrato é o de `src/lib/api.ts` (veja docs/n8n-contrato.md). A URL e o token ficam só no servidor.
 * Sem N8N_BASE_URL, responde em modo demonstração (respostas fixas de `src/lib/demo-api`), com o estado
 * guardado no Supabase quando ele está configurado (senão, em memória).
 * Só os caminhos da lista abaixo são repassados: o proxy não vira um redirecionador aberto para o n8n.
 * Com o login do Supabase configurado, as rotas do console exigem sessão de fornecedor (perfil varejista).
 */
const PERMITIDOS: [metodo: string, caminho: RegExp][] = [
  ["GET", /^faturas$/],
  ["POST", /^faturas\/extrair$/],
  ["POST", /^faturas\/confirmar$/],
  ["POST", /^simulacao$/],
  ["GET", /^regras$/],
  ["GET", /^casos$/],
  ["POST", /^casos$/],
  ["GET", /^casos\/[\w-]{16,64}$/], // acompanhamento pelo link (identificador longo e aleatório)
  ["POST", /^casos\/[\w-]+\/aprovar$/],
];
/** Rotas do console do fornecedor: só com login de varejista (quando o login do Supabase está configurado). */
const DO_FORNECEDOR: [metodo: string, caminho: RegExp][] = [
  ["GET", /^casos$/],
  ["POST", /^casos\/[\w-]+\/aprovar$/],
];
const TIMEOUT_MS = 60_000; // leitura de fatura por IA pode demorar

const casa = (lista: [string, RegExp][], metodo: string, caminho: string) => lista.some(([m, re]) => m === metodo && re.test(caminho));

async function tratar(req: Request, ctx: RouteContext<"/api/[...caminho]">) {
  await connection(); // dado de requisição e estado em memória: nunca pré-renderizar
  const { caminho: partes } = await ctx.params;
  const caminho = partes.join("/");
  if (!casa(PERMITIDOS, req.method, caminho)) {
    return Response.json({ erro: "Rota não encontrada" }, { status: 404 });
  }

  // Sessão: só é lida nas rotas do console (evita uma ida ao Supabase em toda chamada). O consumidor não tem login.
  let usuario: UsuarioRequisicao | null = null;
  if (loginSupabaseConfigurado() && casa(DO_FORNECEDOR, req.method, caminho)) {
    usuario = await usuarioDaRequisicao();
    if (!usuario) return Response.json({ erro: "Entre como fornecedor para continuar." }, { status: 401 });
    if (usuario.perfil !== "varejista") return Response.json({ erro: "Esta área é só para fornecedores." }, { status: 403 });
  }

  const base = process.env.N8N_BASE_URL?.replace(/\/+$/, "");
  if (!base) {
    const multipart = req.headers.get("content-type")?.includes("multipart/form-data") ?? false;
    const json = multipart || req.method === "GET" ? undefined : await req.json().catch(() => undefined);
    try {
      const repo = dadosSupabaseConfigurados() ? repositorioSupabase() : repositorioMemoria();
      const r = await demoResponder({ metodo: req.method, caminho, json, arquivo: multipart, usuarioId: usuario?.id ?? null }, repo);
      return Response.json(r.body, { status: r.status });
    } catch (e) {
      console.error("[api demo] falha ao responder:", e instanceof Error ? e.message : e);
      return Response.json({ erro: "Não consegui salvar ou ler os dados agora. Tente de novo." }, { status: 502 });
    }
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
