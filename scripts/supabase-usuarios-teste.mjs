/**
 * Cria (ou atualiza) os usuários de teste no Supabase Auth: `npm run supabase:usuarios`.
 * Lê NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SECRET_KEY do .env.local. Idempotente: rodar de novo só reaplica senha,
 * nome e perfil. O perfil vai no app_metadata (só a chave secreta altera), que é o que o app usa para permissão.
 * São contas de DEMONSTRAÇÃO, com senha pública no README: nunca use estes e-mails para algo real.
 */
import { createClient } from "@supabase/supabase-js";

const USUARIOS = [
  { email: "varejista@gmail.com", senha: "Teste123", nome: "Marina Alves", perfil: "varejista" },
  { email: "consumidor@gmail.com", senha: "Teste123", nome: "Pessoa de Teste", perfil: "consumidor" },
];

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const chave = process.env.SUPABASE_SECRET_KEY;
if (!url || !chave) {
  console.error("Defina NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SECRET_KEY no .env.local.");
  process.exit(1);
}

const sb = createClient(url, chave, { auth: { persistSession: false, autoRefreshToken: false } });
const { data, error } = await sb.auth.admin.listUsers({ perPage: 1000 });
if (error) throw error;

for (const u of USUARIOS) {
  const atributos = { password: u.senha, email_confirm: true, user_metadata: { nome: u.nome }, app_metadata: { perfil: u.perfil } };
  const existente = data.users.find((x) => x.email === u.email);
  const r = existente
    ? await sb.auth.admin.updateUserById(existente.id, atributos)
    : await sb.auth.admin.createUser({ email: u.email, ...atributos });
  if (r.error) throw r.error;
  console.log(`${existente ? "atualizado" : "criado"}: ${u.email} (${u.perfil})`);
}
