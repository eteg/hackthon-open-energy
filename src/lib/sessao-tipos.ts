/** Tipos da sessão e a leitura do usuário do Supabase. Sem dependências de navegador: usado no cliente, no servidor e nos testes. */
import type { User } from "@supabase/supabase-js";

export type Perfil = "consumidor" | "varejista";
export type Sessao = { email: string; nome: string; perfil: Perfil };

/**
 * Sessão do app a partir do usuário do Supabase Auth.
 * O perfil vem SÓ do app_metadata (alterável apenas com a chave secreta); o user_metadata o próprio usuário edita,
 * então nunca decide permissão. Sem perfil definido, é consumidor.
 */
export function sessaoDoUsuario(u: Pick<User, "email" | "app_metadata" | "user_metadata"> | null | undefined): Sessao | null {
  if (!u?.email) return null;
  const perfil: Perfil = u.app_metadata?.perfil === "varejista" ? "varejista" : "consumidor";
  const nomeMeta = u.user_metadata?.nome;
  const nome = typeof nomeMeta === "string" && nomeMeta.trim() ? nomeMeta.trim() : u.email.split("@")[0];
  return { email: u.email, nome, perfil };
}
