import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// O proxy chama connection() do Next (só existe dentro de uma requisição); nos testes é um no-op.
vi.mock("next/server", () => ({ connection: async () => {} }));
// Quem está logado vem do cookie do Supabase; nos testes, cada caso define o usuário.
const usuarioDaRequisicao = vi.hoisted(() => vi.fn(async (): Promise<{ id: string; email: string; perfil: "varejista" | "consumidor" } | null> => null));
vi.mock("@/lib/supabase/servidor", () => ({ usuarioDaRequisicao, supabaseAdmin: () => { throw new Error("sem banco nos testes"); } }));
import { GET, POST } from "@/app/api/[...caminho]/route";
import { demoResponder } from "@/lib/demo-api";
import fx from "@/lib/demo-api/fixtures.json";

const ctx = (...caminho: string[]) => ({ params: Promise.resolve({ caminho }) }) as never;
const req = (metodo: string, caminho: string, body?: unknown) =>
  new Request(`http://localhost/api/${caminho}`, {
    method: metodo,
    headers: { "content-type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });

/** Upload da fatura como o front envia: multipart com o campo `arquivo`. */
const upload = () => {
  const form = new FormData();
  form.append("arquivo", new File([new Uint8Array([0x89, 0x50, 0x4e, 0x47, 1, 2, 3])], "fatura.png", { type: "image/png" }));
  return new Request("http://localhost/api/faturas/extrair", { method: "POST", body: form });
};
const LEITURA = { origem: "arquivo", fatura: { uf: "SP" }, ausentes: ["segmento"], confianca: 0.9, alerta_injecao: false, padroes_injecao: [] };

describe("proxy /api → n8n (leitura da fatura)", () => {
  beforeEach(() => {
    vi.stubEnv("N8N_BASE_URL", "https://n8n.exemplo.test/webhook/");
    vi.stubEnv("N8N_TOKEN", "segredo");
  });
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("repassa o upload (multipart) ao webhook faturas/extrair, com o token, e devolve a leitura como veio", async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify(LEITURA), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    const r = await POST(upload(), ctx("faturas", "extrair"));
    expect(r.status).toBe(200);
    expect(await r.json()).toEqual(LEITURA);
    const [url, init] = fetchMock.mock.calls[0] as unknown as [URL, RequestInit];
    expect(String(url)).toBe("https://n8n.exemplo.test/webhook/faturas/extrair");
    expect(init.method).toBe("POST");
    const h = init.headers as Headers;
    expect(h.get("authorization")).toBe("Bearer segredo");
    expect(h.get("content-type")).toMatch(/^multipart\/form-data; boundary=/); // preserva o boundary
  });

  it("sem N8N_TOKEN não manda Authorization (webhook público)", async () => {
    vi.stubEnv("N8N_TOKEN", "");
    const fetchMock = vi.fn(async () => new Response(JSON.stringify(LEITURA), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    await POST(upload(), ctx("faturas", "extrair"));
    expect((fetchMock.mock.calls[0] as unknown as [URL, RequestInit])[1].headers as Headers).not.toSatisfy((h: Headers) => h.has("authorization"));
  });

  it("o resto continua em demonstração mesmo com o n8n configurado (ele ainda não tem essas rotas)", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    expect((await GET(req("GET", "regras"), ctx("regras"))).status).toBe(200);
    expect((await POST(req("POST", "simulacao", { faturaId: "fat-001" }), ctx("simulacao"))).status).toBe(200);
    // o modo JSON { faturaId } (fatura de exemplo) também fica na demonstração: o webhook só lê arquivo
    expect((await POST(req("POST", "faturas/extrair", { faturaId: "fat-001" }), ctx("faturas", "extrair"))).status).toBe(200);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("só atende caminhos conhecidos (não vira redirecionador aberto)", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    expect((await GET(req("GET", "admin/credenciais"), ctx("admin", "credenciais"))).status).toBe(404);
    expect((await POST(req("POST", "regras", {}), ctx("regras"))).status).toBe(404); // método errado
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("devolve sem mexer os erros de quem enviou o arquivo: mostrar leitura mockada esconderia o problema real", async () => {
    for (const [status, erro] of [[400, "Envie o arquivo no campo 'arquivo'"], [413, "Arquivo acima de 5 MB"], [415, "Formato não suportado. Envie JPG, PNG ou PDF."], [422, "Este PDF tem senha e não consigo abri-lo."]] as const) {
      vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ erro }), { status })));
      const r = await POST(upload(), ctx("faturas", "extrair"));
      expect(r.status).toBe(status);
      const corpo = await r.json();
      expect(corpo).toEqual({ erro });
      expect(corpo).not.toHaveProperty("fallback");
    }
  });

  describe("fallback: quando o n8n falha, devolve a leitura MOCKADA, avisa e registra com console.log", () => {
    const logs: string[] = [];
    beforeEach(() => {
      logs.length = 0;
      vi.spyOn(console, "log").mockImplementation((...a: unknown[]) => void logs.push(a.map(String).join(" ")));
    });
    afterEach(() => vi.restoreAllMocks());

    const confereFallback = async (r: Response, motivo: RegExp) => {
      expect(r.status).toBe(200);
      const c = (await r.json()) as { origem: string; fatura: { titular: string; total_rs: number }; ausentes: string[]; fallback: { ativo: boolean; motivo: string } };
      expect(c.origem).toBe("arquivo");
      expect(c.fatura).toMatchObject({ titular: "Padaria Pão Dourado (fictícia)", total_rs: 2400 }); // o dado mockado
      expect(c.ausentes).toEqual(["segmento", "historico_12m_kwh"]);
      expect(c.fallback.ativo).toBe(true);
      expect(c.fallback.motivo).toMatch(motivo);
      const log = logs.find((l) => l.includes("[FALLBACK leitura da fatura]"));
      expect(log).toBeDefined(); // o console.log claro pedido
      expect(log).toMatch(motivo);
    };

    it("n8n responde erro de servidor, 401/403/404 (token recusado, webhook inativo) ou 504", async () => {
      for (const status of [500, 502, 503, 504, 401, 403, 404]) {
        logs.length = 0;
        vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ erro: "x" }), { status })));
        await confereFallback(await POST(upload(), ctx("faturas", "extrair")), new RegExp(`HTTP ${status}`));
      }
    });

    it("resposta que não é JSON (página HTML do servidor na frente do n8n)", async () => {
      vi.stubGlobal("fetch", vi.fn(async () => new Response("<html><title>Not Found</title></html>", { status: 502 })));
      await confereFallback(await POST(upload(), ctx("faturas", "extrair")), /HTTP 502.*não é JSON/);
    });

    it("n8n fora do ar ou sem resposta (rede, timeout)", async () => {
      vi.stubGlobal("fetch", vi.fn(async () => { throw new Error("ECONNREFUSED"); }));
      await confereFallback(await POST(upload(), ctx("faturas", "extrair")), /sem resposta do n8n: ECONNREFUSED/);
    });

    it("200 do n8n, mas fora do formato do contrato", async () => {
      vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ ok: true }), { status: 200 })));
      await confereFallback(await POST(upload(), ctx("faturas", "extrair")), /fora do formato do contrato/);
    });

    it("quando o n8n responde bem, NÃO há fallback e os dados dele passam como vieram", async () => {
      vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify(LEITURA), { status: 200 })));
      const r = await POST(upload(), ctx("faturas", "extrair"));
      const c = await r.json();
      expect(c).toEqual(LEITURA);
      expect(c).not.toHaveProperty("fallback");
      expect(logs.some((l) => l.includes("[FALLBACK"))).toBe(false);
      expect(logs.some((l) => l.includes("dados vindos do n8n"))).toBe(true);
    });
  });
});

describe("modo demonstração (sem N8N_BASE_URL)", () => {
  it("responde pelo proxy com os dados fixos", async () => {
    vi.stubEnv("N8N_BASE_URL", "");
    const r = await GET(req("GET", "regras"), ctx("regras"));
    expect(r.status).toBe(200);
    expect((await r.json()).versao).toBe(fx.regras.versao);
    vi.unstubAllEnvs();
  });

  it("sem N8N_BASE_URL a leitura por arquivo é mockada e diz isso (fallback com o motivo)", async () => {
    vi.stubEnv("N8N_BASE_URL", "");
    const r = await POST(upload(), ctx("faturas", "extrair"));
    const c = (await r.json()) as { fatura: { total_rs: number }; fallback: { ativo: boolean; motivo: string } };
    expect(c.fatura.total_rs).toBe(2400);
    expect(c.fallback).toMatchObject({ ativo: true, motivo: expect.stringMatching(/N8N_BASE_URL não configurado/) });
    vi.unstubAllEnvs();
  });

  it("percorre o fluxo: confirmar fatura → simular → pedir migração → aprovar", async () => {
    const fatura = { ...fx.extracoes["fat-001"].fatura } as Record<string, unknown>;
    delete fatura.id;
    const c = await demoResponder({ metodo: "POST", caminho: "faturas/confirmar", json: { fatura } });
    expect(c.status).toBe(201);
    const id = (c.body as { id: string }).id;
    expect(id).toMatch(/^up-/);

    const s = await demoResponder({ metodo: "POST", caminho: "simulacao", json: { faturaId: id } });
    const sim = s.body as { fatura_id: string; melhor_oferta_id: string };
    expect(sim.fatura_id).toBe(id);

    const cienciaIds = fx.regras.ciencia_obrigatoria.map((i: { id: string }) => i.id);
    const sem = await demoResponder({ metodo: "POST", caminho: "casos", json: { faturaId: id, ofertaId: sim.melhor_oferta_id, cienciaIds: [] } });
    expect(sem.status).toBe(422);

    const caso = await demoResponder({ metodo: "POST", caminho: "casos", json: { faturaId: id, ofertaId: sim.melhor_oferta_id, cienciaIds } });
    expect(caso.status).toBe(201);
    const casoId = (caso.body as { id: string }).id;

    const ap = await demoResponder({ metodo: "POST", caminho: `casos/${casoId}/aprovar`, json: { operador: "Marina" } });
    expect((ap.body as { etapa: string }).etapa).toBe("documentacao");
    const de_novo = await demoResponder({ metodo: "POST", caminho: `casos/${casoId}/aprovar`, json: { operador: "Marina" } });
    expect(de_novo.status).toBe(409);
  });

  it("dá ao consumidor um link de acompanhamento imprevisível que mostra a etapa REAL e nada além", async () => {
    const fatura = { ...fx.extracoes["fat-001"].fatura } as Record<string, unknown>;
    delete fatura.id;
    const id = ((await demoResponder({ metodo: "POST", caminho: "faturas/confirmar", json: { fatura } })).body as { id: string }).id;
    const sim = (await demoResponder({ metodo: "POST", caminho: "simulacao", json: { faturaId: id } })).body as { melhor_oferta_id: string };
    const cienciaIds = fx.regras.ciencia_obrigatoria.map((i: { id: string }) => i.id);
    const criado = (await demoResponder({ metodo: "POST", caminho: "casos", json: { faturaId: id, ofertaId: sim.melhor_oferta_id, cienciaIds } })).body as { id: string; acompanhamento_id: string };

    // identificador longo e aleatório, diferente do id do console
    expect(criado.acompanhamento_id).toMatch(/^[\w-]{22}$/);
    expect(criado.acompanhamento_id).not.toBe(criado.id);

    const antes = await demoResponder({ metodo: "GET", caminho: `casos/${criado.acompanhamento_id}` });
    expect(antes.status).toBe(200);
    expect(antes.body).toMatchObject({ etapa: "aguardando_aprovacao", aprovado_em: null });
    // visão pública: sem ciência, hash, cliente nem economia
    expect(Object.keys(antes.body as object).sort()).toEqual(["aprovado_em", "criado_em", "etapa", "numero", "oferta_id"]);

    // o segredo do link NÃO vaza pela lista do console (aberta a quem chamar a API) nem pela aprovação
    const lista = (await demoResponder({ metodo: "GET", caminho: "casos" })).body as { casos: Record<string, unknown>[] };
    expect(lista.casos.some((c) => "acompanhamento_id" in c)).toBe(false);
    expect(JSON.stringify(lista)).not.toContain(criado.acompanhamento_id);

    // o que o fornecedor faz no console aparece para o consumidor
    const aprovado = await demoResponder({ metodo: "POST", caminho: `casos/${criado.id}/aprovar`, json: { operador: "Marina" } });
    expect(JSON.stringify(aprovado.body)).not.toContain(criado.acompanhamento_id);
    const depois = await demoResponder({ metodo: "GET", caminho: `casos/${criado.acompanhamento_id}` });
    expect(depois.body).toMatchObject({ etapa: "documentacao" });
    expect((depois.body as { aprovado_em: string }).aprovado_em).toBeTruthy();

    // o id sequencial do console e identificadores inventados não abrem nada
    expect((await demoResponder({ metodo: "GET", caminho: `casos/${criado.id}` })).status).toBe(404);
    expect((await demoResponder({ metodo: "GET", caminho: "casos/aaaaaaaaaaaaaaaaaaaaaa" })).status).toBe(404);
  });

  it("recusa fatura incompleta e fatura inexistente", async () => {
    expect((await demoResponder({ metodo: "POST", caminho: "faturas/confirmar", json: { fatura: { titular: "X" } } })).status).toBe(422);
    expect((await demoResponder({ metodo: "POST", caminho: "simulacao", json: { faturaId: "nao-existe" } })).status).toBe(404);
  });
});

describe("login do Supabase nas rotas do console", () => {
  beforeEach(() => {
    vi.stubEnv("N8N_BASE_URL", "");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://projeto.supabase.test");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "sb_publishable_teste");
    vi.stubEnv("SUPABASE_SECRET_KEY", ""); // sem chave secreta: dados em memória
    usuarioDaRequisicao.mockReset();
  });
  afterEach(() => vi.unstubAllEnvs());

  it("sem sessão responde 401 e com sessão de consumidor responde 403", async () => {
    usuarioDaRequisicao.mockResolvedValueOnce(null);
    expect((await GET(req("GET", "casos"), ctx("casos"))).status).toBe(401);
    usuarioDaRequisicao.mockResolvedValueOnce({ id: "u1", email: "consumidor@gmail.com", perfil: "consumidor" });
    expect((await POST(req("POST", "casos/caso-001/aprovar", { operador: "X" }), ctx("casos", "caso-001", "aprovar"))).status).toBe(403);
  });

  it("libera o console para o fornecedor", async () => {
    usuarioDaRequisicao.mockResolvedValueOnce({ id: "u2", email: "varejista@gmail.com", perfil: "varejista" });
    const r = await GET(req("GET", "casos"), ctx("casos"));
    expect(r.status).toBe(200);
    expect((await r.json()).casos.length).toBeGreaterThan(0);
  });

  it("as telas do consumidor seguem sem login e não consultam a sessão à toa", async () => {
    expect((await GET(req("GET", "regras"), ctx("regras"))).status).toBe(200);
    expect(usuarioDaRequisicao).not.toHaveBeenCalled();
  });

  it("sem Supabase configurado, o console segue aberto (modo demonstração puro)", async () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "");
    expect((await GET(req("GET", "casos"), ctx("casos"))).status).toBe(200);
    expect(usuarioDaRequisicao).not.toHaveBeenCalled();
  });
});
