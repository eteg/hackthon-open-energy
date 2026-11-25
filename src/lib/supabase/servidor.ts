import "server-only";
/**
 * Supabase no servidor. Duas portas, com papéis diferentes:
 * - `supabaseAdmin()`: chave secreta, ignora o RLS. Única forma de ler e gravar as tabelas (o navegador não acessa).
 * - `usuarioDaRequisicao()`: quem está logado, pelo cookie de sessão, com o JWT verificado (getClaims).
 */
import { createServerClient } from "@supabase/ssr";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import type { Perfil } from "@/lib/sessao-tipos";
import { supabaseChavePublicavel, supabaseUrl } from "./config";

const g = globalThis as unknown as { __trevoltSupabaseAdmin?: SupabaseClient };

export function supabaseAdmin(): SupabaseClient {
  const url = supabaseUrl();
  const chave = process.env.SUPABASE_SECRET_KEY;
  if (!url || !chave) throw new Error("Supabase não configurado: defina NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SECRET_KEY");
  g.__trevoltSupabaseAdmin ??= createClient(url, chave, { auth: { persistSession: false, autoRefreshToken: false } });
  return g.__trevoltSupabaseAdmin;
}

export type UsuarioRequisicao = { id: string; email: string | null; perfil: Perfil };

/** Usuário logado nesta requisição, ou `null`. O perfil vem do app_metadata (só a chave secreta altera). */
export async function usuarioDaRequisicao(): Promise<UsuarioRequisicao | null> {
  const url = supabaseUrl();
  const chave = supabaseChavePublicavel();
  if (!url || !chave) return null;
  const jar = await cookies();
  const sb = createServerClient(url, chave, {
    cookies: {
      getAll: () => jar.getAll(),
      // Ao renovar o token, o Supabase regrava os cookies; numa Route Handler isso é permitido.
      setAll: (lista) => {
        try {
          lista.forEach(({ name, value, options }) => jar.set(name, value, options));
        } catch {
          /* contexto sem escrita de cookie: a renovação fica para o navegador */
        }
      },
    },
  });
  const { data, error } = await sb.auth.getClaims();
  if (error || !data?.claims?.sub) return null;
  const c = data.claims;
  return { id: c.sub, email: c.email ?? null, perfil: c.app_metadata?.perfil === "varejista" ? "varejista" : "consumidor" };
}
