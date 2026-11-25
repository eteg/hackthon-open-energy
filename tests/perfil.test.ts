import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { getRedirectUrl, unstable_doesMiddlewareMatch } from "next/experimental/testing/server";

// A Server Action usa cookies() e redirect(), que só existem dentro de uma requisição do Next.
const { definirCookie } = vi.hoisted(() => ({ definirCookie: vi.fn() }));
vi.mock("next/headers", () => ({ cookies: async () => ({ set: definirCookie }) }));
vi.mock("next/navigation", () => ({
  redirect: (url: string) => {
    throw new Error(`REDIRECT ${url}`);
  },
}));
import { escolherPerfil } from "@/app/actions";
import { COOKIE_PERFIL, ehPerfil } from "@/lib/perfil";
import { config, proxy } from "@/proxy";

const pedir = (caminho: string, perfil?: string) =>
  new NextRequest(`http://localhost:3000${caminho}`, {
    headers: perfil === undefined ? {} : { cookie: `${COOKIE_PERFIL}=${perfil}` },
  });

const comPerfil = (perfil: string) => {
  const dados = new FormData();
  dados.set("perfil", perfil);
  return dados;
};

describe("perfis", () => {
  it("aceita só os perfis do MVP", () => {
    expect(ehPerfil("varejista")).toBe(true);
    expect(ehPerfil("consumidor")).toBe(true);
    expect(ehPerfil("admin")).toBe(false);
    expect(ehPerfil("toString")).toBe(false);
    expect(ehPerfil(undefined)).toBe(false);
  });
});

describe("proxy: telas só depois de escolher o perfil", () => {
  it.each(["/onboarding", "/atendimento", "/painel", "/painel/empresa"])("%s sem perfil volta para a home", (caminho) => {
    expect(getRedirectUrl(proxy(pedir(caminho)))).toBe("http://localhost:3000/");
  });

  it("com perfil escolhido, a tela abre (qualquer perfil, por enquanto)", () => {
    expect(getRedirectUrl(proxy(pedir("/painel", "consumidor")))).toBeNull();
    expect(getRedirectUrl(proxy(pedir("/onboarding", "varejista")))).toBeNull();
  });

  it("cookie com valor desconhecido conta como sem perfil", () => {
    expect(getRedirectUrl(proxy(pedir("/painel", "admin")))).toBe("http://localhost:3000/");
  });

  it("não roda na home, nas rotas de API nem em arquivos estáticos", () => {
    const roda = (url: string) => unstable_doesMiddlewareMatch({ config, url });
    expect(roda("/")).toBe(false);
    expect(roda("/api/casos")).toBe(false);
    expect(roda("/api/varejista")).toBe(false);
    expect(roda("/_next/static/chunks/app.js")).toBe(false);
    expect(roda("/favicon.ico")).toBe(false);
    expect(roda("/next.svg")).toBe(false);
    expect(roda("/onboarding")).toBe(true);
    expect(roda("/painel/empresa")).toBe(true);
  });
});

describe("escolherPerfil (botões da home)", () => {
  beforeEach(() => definirCookie.mockClear());

  it("varejista: grava o perfil e abre o cadastro da empresa", async () => {
    await expect(escolherPerfil(comPerfil("varejista"))).rejects.toThrow("REDIRECT /painel/empresa");
    expect(definirCookie).toHaveBeenCalledWith(COOKIE_PERFIL, "varejista", expect.objectContaining({ httpOnly: true, path: "/" }));
  });

  it("consumidor final: grava o perfil e abre o onboarding", async () => {
    await expect(escolherPerfil(comPerfil("consumidor"))).rejects.toThrow("REDIRECT /onboarding");
    expect(definirCookie).toHaveBeenCalledWith(COOKIE_PERFIL, "consumidor", expect.anything());
  });

  it("perfil inválido não grava nada e volta para a home", async () => {
    await expect(escolherPerfil(comPerfil("admin"))).rejects.toThrow(/^REDIRECT \/$/);
    expect(definirCookie).not.toHaveBeenCalled();
  });
});
