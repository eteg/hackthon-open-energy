# Trevolt · Energia do jeito combinado

Hackathon ETEG 2026. Front do MVP de contratação de energia no mercado livre de baixa tensão (abertura em 25/11/2027): envio da fatura, simulação honesta, ciência de riscos, aceite, acompanhamento, console do fornecedor e portal do fornecedor. Uma plataforma ETEG.

> **Dados 100% sintéticos.** Nenhum dado real de cliente. Economia é sempre estimativa em faixa, nunca garantia.

## Como rodar

```bash
npm install
cp .env.example .env.local   # opcional: sem N8N_BASE_URL o app roda em modo demonstração
npm run dev                  # http://localhost:3000
npm test
```

Stack: Next.js 16 (App Router, Cache Components) · Tailwind CSS 4 · shadcn/ui (Radix) · Axios · Zod · Vitest. Marca: tokens do guia Trevolt em `src/app/globals.css`, Bricolage Grotesque e Inter (locais, via fontsource).

## API: serviço n8n

Este repositório é **só o front**. A API é um serviço n8n, em desenvolvimento em paralelo.

- O navegador chama `/api/<caminho>`; o proxy `src/app/api/[...caminho]/route.ts` repassa para `${N8N_BASE_URL}/<caminho>` (com `N8N_TOKEN`, se houver). URL e token ficam só no servidor, e só os caminhos do contrato são repassados.
- **Contrato**: [`docs/n8n-contrato.md`](docs/n8n-contrato.md). Cliente do front: `src/lib/api.ts`. Tipos: `src/lib/types.ts`.
- **Sem `N8N_BASE_URL` = modo demonstração**: o proxy responde com dados fixos (`src/lib/demo-api`). Nada é calculado: uma fatura enviada por arquivo simula com os números da fatura de exemplo.
- A lógica que existia nas rotas (simulador, regras, RAG, guardrails anti-injeção, agente, leitura de fatura por IA) está preservada em [`n8n-referencia/`](n8n-referencia/LEIA-ME.md) só para portar para o n8n. Não é compilada.

## Supabase: login e dados

O Supabase cuida do **login** (Supabase Auth, e-mail e senha) e guarda o **estado do modo demonstração**: faturas confirmadas, casos, cadastro do varejista e a trilha de evidências (ciência de riscos com hash, aprovação humana, cadastro). As variáveis ficam no `.env.local` (veja `.env.example`).

- **Quem acessa as tabelas**: só o servidor (rota `/api`), com a chave secreta. Todas as tabelas têm RLS ligado e nenhuma policy, então a chave publicável do navegador serve só para o login.
- **Perfil**: vem do `app_metadata.perfil` do usuário (`varejista` ou `consumidor`), que só a chave secreta altera. Com o login configurado, `GET /casos`, `POST /casos/{id}/aprovar` e `GET /observabilidade` exigem sessão de fornecedor (401 sem login, 403 para consumidor), também quando a chamada segue para o n8n.
- **Schema**: `supabase/migrations/`. Casos de exemplo: `supabase/seed.sql` (gerado das fixtures). O mesmo banco também tem o schema da plataforma n8n (`..._plataforma_n8n.sql`, cópia do `schema.sql` do pacote `eteg-n8n-supabase`: tabelas no singular, como `caso`, `fatura`, `evento`, com máquina de estados e log com cadeia de hashes). As tabelas no plural (`casos`, `faturas`, `varejista`, `evidencias`) são as do modo demonstração deste front. Para aplicar num projeto: `npx supabase login`, `npx supabase link --project-ref <ref>` e `npx supabase db push --include-seed`.
- **Sem as variáveis**: o app continua em modo demonstração, com os dados em memória (somem ao reiniciar) e sem login.

Código: `src/lib/supabase/` (clientes do navegador e do servidor), `src/lib/sessao.ts` (hook `useSessao`), `src/lib/demo-api/repositorio*.ts` (estado em memória ou no Supabase).

## Telas

| Grupo | Rotas |
| --- | --- |
| Site do consumidor (mobile first) | `/fatura` (entrada vinda da LP), `/fatura/conferir`, `/fatura/digitar`, `/conta`, `/ofertas`, `/ofertas/[id]`, `/ciencia`, `/aceite`, `/caso/[id]`, `/assistente` |
| Console do fornecedor | `/console`, `/console/casos/[id]`, `/console/permissoes` |
| Portal do fornecedor | `/varejista/entrar`, `/varejista/cadastro`, `/varejista/analise` |

A home é a landing page [trevolt.vercel.app](https://trevolt.vercel.app/) (`src/lib/links.ts`): a raiz `/` do app redireciona para ela, todo logo e seta de início levam para ela (o console e o portal do fornecedor, para a página de fornecedores da LP) e a pessoa entra no app pelo botão da LP, que abre `/fatura`.

O consumidor contrata sem conta e sem códigos de verificação: o caso fica guardado no navegador. Telas sem API (aceite, CCV e CCEE, permissões, credencial, convites) usam estado simulado e mostram a faixa "Demonstração".

## Usuários de teste

Contas do Supabase Auth criadas (ou atualizadas) por `npm run supabase:usuarios` (`scripts/supabase-usuarios-teste.mjs`). São contas de demonstração com senha pública: não use estes e-mails para nada real.

| Perfil | E-mail | Senha | Onde entra |
| --- | --- | --- | --- |
| Fornecedor | `varejista@gmail.com` | `Teste123` | `/varejista/entrar` → `/console` (as rotas `/console/**` exigem esse login) |
| Consumidor | `consumidor@gmail.com` | `Teste123` | `/entrar` (opcional: dá para contratar sem entrar) |

## Estrutura

```
src/app/api/[...caminho]/   Proxy para o n8n (e modo demonstração)
src/lib/api.ts              Cliente Axios usado por todas as telas
src/lib/types.ts            Schemas (zod) e tipos do contrato
src/lib/demo-api/           Respostas fixas do modo demonstração (estado em memória ou no Supabase)
src/lib/supabase/           Clientes do Supabase: navegador (login) e servidor (chave secreta, sessão)
src/lib/sessao.ts           Login (hook useSessao) pelo Supabase Auth
src/lib/demo/store.ts       Estado simulado do caso do consumidor (localStorage)
src/components/trevolt/     Peças da marca (logo, selo, fio, casca do site e do console)
src/components/ui/          shadcn/ui
docs/n8n-contrato.md        Contrato da API para quem faz o n8n
supabase/                   Config, migrations e seed do banco
scripts/                    Utilitários (usuários de teste no Supabase)
n8n-referencia/             Lógica de servidor anterior, só para portar
```
