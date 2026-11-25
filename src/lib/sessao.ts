"use client";
/**
 * Login pelo Supabase Auth (e-mail e senha). A sessão fica em cookies do navegador, que a rota /api lê.
 * Os usuários de teste são criados por `npm run supabase:usuarios` (veja o README).
 */
import { useCallback, useSyncExternalStore } from "react";
import { clienteNavegador } from "./supabase/navegador";
import { sessaoDoUsuario, type Perfil, type Sessao } from "./sessao-tipos";

export type { Perfil, Sessao } from "./sessao-tipos";

const ouvintes = new Set<() => void>();
let atual: Sessao | null | undefined; // undefined = ainda carregando
let iniciado = false;

function publicar(s: Sessao | null) {
  // Mesma sessão (ex.: token renovado): mantém a referência para não re-renderizar à toa.
  if (atual && s && atual.email === s.email && atual.nome === s.nome && atual.perfil === s.perfil) return;
  atual = s;
  ouvintes.forEach((f) => f());
}

function iniciar() {
  if (iniciado || typeof window === "undefined") return;
  iniciado = true;
  const sb = clienteNavegador();
  if (!sb) {
    publicar(null);
    return;
  }
  // Dispara INITIAL_SESSION logo na inscrição e depois a cada login, logout e renovação de token.
  sb.auth.onAuthStateChange((_evento, sessao) => publicar(sessaoDoUsuario(sessao?.user)));
}

function assinar(f: () => void) {
  iniciar();
  ouvintes.add(f);
  return () => {
    ouvintes.delete(f);
  };
}

/** `sessao`: undefined = ainda carregando (servidor/hidratação), null = sem login, objeto = logado. */
export function useSessao() {
  const sessao = useSyncExternalStore<Sessao | null | undefined>(assinar, () => atual, () => undefined);

  /**
   * Tenta entrar; devolve a sessão ou `null` se e-mail/senha não conferem.
   * Com `perfil`, só aceita esse perfil (ex.: o portal do fornecedor recusa o consumidor e encerra a sessão).
   * Lança `Error` com mensagem legível quando o problema não é a senha (Supabase fora do ar ou não configurado).
   */
  const entrar = useCallback(async (email: string, senha: string, perfil?: Perfil): Promise<Sessao | null> => {
    const sb = clienteNavegador();
    if (!sb) throw new Error("O login não está configurado neste ambiente.");
    const { data, error } = await sb.auth.signInWithPassword({ email: email.trim().toLowerCase(), password: senha });
    if (error) {
      if (error.code === "invalid_credentials" || error.status === 400) return null;
      throw new Error("Não consegui falar com o serviço de login agora. Tente de novo.");
    }
    const s = sessaoDoUsuario(data.user);
    if (!s || (perfil && s.perfil !== perfil)) {
      await sb.auth.signOut();
      return null;
    }
    publicar(s);
    return s;
  }, []);

  const sair = useCallback(async () => {
    await clienteNavegador()?.auth.signOut();
    publicar(null);
  }, []);

  return { sessao, entrar, sair };
}
