import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// O proxy chama connection() do Next (só existe dentro de uma requisição); nos testes é um no-op.
vi.mock("next/server", () => ({ connection: async () => {} }));
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

describe("proxy /api → n8n", () => {
  beforeEach(() => {
    vi.stubEnv("N8N_BASE_URL", "https://n8n.exemplo.test/webhook/");
    vi.stubEnv("N8N_TOKEN", "segredo");
  });
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("repassa método, caminho, corpo e token ao n8n, sem expor o token na resposta", async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ ok: true }), { status: 201 }));
    vi.stubGlobal("fetch", fetchMock);
    const r = await POST(req("POST", "simulacao", { faturaId: "fat-001" }), ctx("simulacao"));
    expect(r.status).toBe(201);
    expect(await r.json()).toEqual({ ok: true });
    const [url, init] = fetchMock.mock.calls[0] as unknown as [URL, RequestInit];
    expect(String(url)).toBe("https://n8n.exemplo.test/webhook/simulacao");
    expect(init.method).toBe("POST");
    expect((init.headers as Headers).get("authorization")).toBe("Bearer segredo");
  });

  it("só repassa caminhos conhecidos (não vira redirecionador aberto)", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    expect((await GET(req("GET", "admin/credenciais"), ctx("admin", "credenciais"))).status).toBe(404);
    expect((await POST(req("POST", "regras", {}), ctx("regras"))).status).toBe(404); // método errado
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("devolve { erro } quando o n8n responde algo que não é JSON ou cai", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response("<html>Bad Gateway</html>", { status: 502 })));
    const r1 = await GET(req("GET", "regras"), ctx("regras"));
    expect(r1.status).toBe(502);
    expect(await r1.json()).toHaveProperty("erro");

    vi.stubGlobal("fetch", vi.fn(async () => { throw new Error("ECONNREFUSED"); }));
    const r2 = await GET(req("GET", "regras"), ctx("regras"));
    expect(r2.status).toBe(502);
    expect(await r2.json()).toHaveProperty("erro");
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

  it("recusa fatura incompleta e fatura inexistente", async () => {
    expect((await demoResponder({ metodo: "POST", caminho: "faturas/confirmar", json: { fatura: { titular: "X" } } })).status).toBe(422);
    expect((await demoResponder({ metodo: "POST", caminho: "simulacao", json: { faturaId: "nao-existe" } })).status).toBe(404);
  });
});
