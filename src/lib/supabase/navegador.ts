"use client";
/** Cliente do Supabase no navegador: só para o login. A sessão fica em cookies, que a rota /api lê para saber quem chama. */
import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { loginSupabaseConfigurado, supabaseChavePublicavel, supabaseUrl } from "./config";

let cliente: SupabaseClient | null = null;

/** `null` quando o Supabase não está configurado (sem NEXT_PUBLIC_SUPABASE_URL / _PUBLISHABLE_KEY). */
export function clienteNavegador(): SupabaseClient | null {
  if (!loginSupabaseConfigurado()) return null;
  cliente ??= createBrowserClient(supabaseUrl(), supabaseChavePublicavel());
  return cliente;
}
