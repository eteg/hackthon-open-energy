# Trevolt · Energia do jeito combinado

Hackathon ETEG 2026. Front do MVP de contratação de energia no mercado livre de baixa tensão (abertura em 25/11/2027): envio da fatura, simulação honesta, ciência de riscos, aceite, acompanhamento e console do fornecedor com aprovação. Uma plataforma ETEG.

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
- A lógica que existia nas rotas (simulador, regras, RAG, guardrails anti-injeção, agente, leitura de fatura por IA, cadastro do varejista) está preservada em [`n8n-referencia/`](n8n-referencia/LEIA-ME.md) só para portar para o n8n. Não é compilada.

## Telas

| Grupo | Rotas |
| --- | --- |
| Site do consumidor (mobile first) | `/`, `/fatura`, `/fatura/conferir`, `/conta`, `/ofertas`, `/ofertas/[id]`, `/ciencia`, `/aceite`, `/caso/[id]` |
| Console do fornecedor | `/console`, `/console/casos/[id]` (fila e aprovação do ato 1) |
| Login do fornecedor | `/varejista/entrar` |

O consumidor contrata sem conta e sem códigos de verificação: o caso fica guardado no navegador. Depois do aceite ele recebe um **link de acompanhamento** (`/caso/<identificador longo>`), que mostra a etapa real do caso (a que o fornecedor altera no console) e se atualiza sozinho; é por esse link que ele volta, de qualquer aparelho. O aceite em si usa estado simulado.

## Usuário de teste (mock)

Definido no código, em `src/lib/auth-mock.ts`, e validado no navegador (a senha fica visível no JavaScript da página: serve só para a demonstração).

| Perfil | E-mail | Senha | Onde entra |
| --- | --- | --- | --- |
| Fornecedor | `varejista@gmail.com` | `Teste123` | `/varejista/entrar` → `/console` (as rotas `/console/**` exigem esse login) |

## Estrutura

```
src/app/api/[...caminho]/   Proxy para o n8n (e modo demonstração)
src/lib/api.ts              Cliente Axios usado por todas as telas
src/lib/types.ts            Schemas (zod) e tipos do contrato
src/lib/demo-api/           Respostas fixas do modo demonstração
src/lib/demo/store.ts       Estado simulado do caso do consumidor (localStorage)
src/components/trevolt/     Peças da marca (logo, selo, fio, casca do site e do console)
src/components/ui/          shadcn/ui
docs/n8n-contrato.md        Contrato da API para quem faz o n8n
n8n-referencia/             Lógica de servidor anterior, só para portar
```
