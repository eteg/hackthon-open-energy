import { connection } from "next/server";
import { demoResponder } from "@/lib/demo-api";
import { repositorioMemoria } from "@/lib/demo-api/repositorio";
import { repositorioSupabase } from "@/lib/demo-api/repositorio-supabase";
import { dadosSupabaseConfigurados, loginSupabaseConfigurado } from "@/lib/supabase/config";
import { usuarioDaRequisicao, type UsuarioRequisicao } from "@/lib/supabase/servidor";

/**
 * Único endpoint do app. O contrato é o de `src/lib/api.ts` (veja docs/n8n-contrato.md); a URL e o token do n8n
 * ficam só no servidor.
 * - Rotas que o n8n já atende (`NO_N8N`: hoje, a leitura da fatura por arquivo) vão para ele quando N8N_BASE_URL
 *   está definido.
 * - O resto responde em modo demonstração (respostas fixas de `src/lib/demo-api`), com o estado guardado no
 *   Supabase quando ele está configurado (senão, em memória). É assim mesmo com N8N_BASE_URL definido, enquanto
 *   o n8n não tiver essas rotas: repassá-las daria 404.
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
/** Rotas já implementadas no n8n. Acrescente aqui quando o n8n ganhar outra. */
const NO_N8N = (metodo: string, caminho: string, multipart: boolean) => metodo === "POST" && caminho === "faturas/extrair" && multipart; // o modo JSON { faturaId } (fatura de exemplo) segue na demonstração
const TIMEOUT_MS = 60_000; // leitura de fatura por IA pode demorar

/**
 * Erros causados por quem enviou o arquivo: passam como vieram. Mostrar a leitura mockada nesses casos esconderia
 * o problema real (ex.: PDF com senha, arquivo grande demais, formato inválido).
 */
const ERRO_DO_ENVIO = [400, 413, 415, 422];

/**
 * FALLBACK da leitura da fatura: o n8n falhou, então devolve a leitura MOCKADA (marcada com `fallback` e o motivo)
 * e registra no log do servidor. O front também registra no console do navegador e avisa na tela.
 */
async function leituraMockada(motivo: string): Promise<Response> {
  console.log(`[FALLBACK leitura da fatura] n8n falhou (${motivo}). Devolvendo a leitura MOCKADA (Padaria Pão Dourado, R$ 2.400): não é a fatura enviada.`);
  const r = await demoResponder({ metodo: "POST", caminho: "faturas/extrair", arquivo: true, motivoFallback: motivo });
  return Response.json(r.body, { status: r.status });
}

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
  const multipart = req.headers.get("content-type")?.includes("multipart/form-data") ?? false;
  if (!base || !NO_N8N(req.method, caminho, multipart)) {
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

  // Leitura da fatura no n8n (a única rota em NO_N8N). Qualquer falha dele cai no fallback mockado, com log.
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
    let json: unknown;
    try {
      json = JSON.parse(texto);
    } catch {
      // Ex.: página HTML do servidor na frente do n8n, que troca o corpo de um 502.
      if (ERRO_DO_ENVIO.includes(res.status)) return Response.json({ erro: "Não consegui ler a fatura agora. Tente de novo." }, { status: res.status });
      return leituraMockada(`n8n respondeu HTTP ${res.status} com corpo que não é JSON`);
    }
    if (res.ok) {
      const leitura = json as { fatura?: unknown; ausentes?: unknown };
      if (leitura && typeof leitura.fatura === "object" && Array.isArray(leitura.ausentes)) {
        console.log(`[leitura da fatura] dados vindos do n8n (HTTP ${res.status}).`);
        return Response.json(json, { status: res.status });
      }
      return leituraMockada("resposta do n8n fora do formato do contrato (sem `fatura` e `ausentes`)");
    }
    if (ERRO_DO_ENVIO.includes(res.status)) return Response.json(json, { status: res.status });
    return leituraMockada(`n8n respondeu HTTP ${res.status}`);
  } catch (e) {
    return leituraMockada(`sem resposta do n8n: ${e instanceof Error ? e.message : String(e)}`);
  }
}

export { tratar as GET, tratar as POST, tratar as PUT };
