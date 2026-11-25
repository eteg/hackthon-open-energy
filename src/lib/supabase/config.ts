/**
 * Variáveis do Supabase. A URL e a chave publicável vão para o navegador (login); a chave secreta fica só no
 * servidor (rota /api), que é quem lê e grava as tabelas. Sem elas, o app segue em modo demonstração em memória.
 * Lidas a cada chamada (e com o nome literal, que o Next embute no bundle do navegador) para os testes poderem trocar o env.
 */
export const supabaseUrl = () => process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
export const supabaseChavePublicavel = () => process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "";

/** Login disponível (navegador e servidor). */
export const loginSupabaseConfigurado = () => Boolean(supabaseUrl() && supabaseChavePublicavel());

/** Dados no Supabase: só no servidor, que tem a chave secreta. */
export const dadosSupabaseConfigurados = () => loginSupabaseConfigurado() && Boolean(process.env.SUPABASE_SECRET_KEY);
