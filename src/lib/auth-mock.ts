"use client";
/**
 * MOCK de autenticação para testes. Os usuários e as senhas ficam NO CÓDIGO (e portanto visíveis no JavaScript
 * do navegador): servem só para a demonstração e nunca devem apontar para contas reais. A sessão vive no
 * localStorage. Quando o n8n assumir o login, troque `autenticar` por uma chamada a ele e remova USUARIOS_MOCK.
 */
import { useCallback, useSyncExternalStore } from "react";

export type Perfil = "consumidor" | "varejista";
export type Sessao = { email: string; nome: string; perfil: Perfil };

export const USUARIOS_MOCK: (Sessao & { senha: string })[] = [
  { email: "varejista@gmail.com", senha: "Teste123", nome: "Marina Alves", perfil: "varejista" },
  { email: "consumidor@gmail.com", senha: "Teste123", nome: "Pessoa de Teste", perfil: "consumidor" },
];

/** Devolve a sessão se o e-mail (sem diferenciar maiúsculas) e a senha (exata) conferem; senão `null`. */
export function autenticar(email: string, senha: string): Sessao | null {
  const u = USUARIOS_MOCK.find((x) => x.email === email.trim().toLowerCase() && x.senha === senha);
  return u ? { email: u.email, nome: u.nome, perfil: u.perfil } : null;
}

const CHAVE = "trevolt:sessao";
const ouvintes = new Set<() => void>();
let cache: Sessao | null | undefined;

function ler(): Sessao | null {
  if (cache !== undefined) return cache;
  try {
    const bruto = JSON.parse(localStorage.getItem(CHAVE) ?? "null") as Sessao | null;
    // Só aceita uma sessão que corresponda a um usuário conhecido (ignora lixo ou valor adulterado).
    cache = bruto && USUARIOS_MOCK.some((u) => u.email === bruto.email && u.perfil === bruto.perfil) ? bruto : null;
  } catch {
    cache = null;
  }
  return cache;
}
function gravar(s: Sessao | null) {
  cache = s;
  try {
    if (s) localStorage.setItem(CHAVE, JSON.stringify(s));
    else localStorage.removeItem(CHAVE);
  } catch {
    /* modo privado: a sessão vale só nesta aba */
  }
  ouvintes.forEach((f) => f());
}

/** `sessao`: undefined = ainda carregando (servidor/hidratação), null = sem login, objeto = logado. */
export function useSessao() {
  const sessao = useSyncExternalStore<Sessao | null | undefined>(
    (f) => {
      ouvintes.add(f);
      return () => ouvintes.delete(f);
    },
    ler,
    () => undefined
  );
  /**
   * Tenta entrar; devolve a sessão (e a grava) ou `null` se e-mail/senha não conferem.
   * Com `perfil`, só aceita esse perfil (ex.: o portal do fornecedor recusa o consumidor SEM gravar nada).
   */
  const entrar = useCallback((email: string, senha: string, perfil?: Perfil) => {
    const s = autenticar(email, senha);
    if (!s || (perfil && s.perfil !== perfil)) return null;
    gravar(s);
    return s;
  }, []);
  const sair = useCallback(() => gravar(null), []);
  return { sessao, entrar, sair };
}
