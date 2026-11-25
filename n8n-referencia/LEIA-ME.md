# Referência para o n8n

Código do serviço de API como ele rodava dentro do Next, **preservado só para portar para o n8n**. Não é compilado,
testado nem lintado pelo app (`tsconfig`, `eslint` e `vitest` o ignoram). Contrato: `../docs/n8n-contrato.md`.

- `api-routes/`: as 10 rotas originais (`/faturas`, `/faturas/extrair`, `/faturas/confirmar`, `/simulacao`, `/regras`, `/agente`, `/casos`, `/casos/[id]/aprovar`, `/observabilidade`, `/varejista`).
- `lib/`: `simulador.ts` (cálculo), `regras.ts`, `guardrails.ts` (anti-injeção), `rag.ts`, `agente.ts`, `extracao.ts` (leitura de fatura por IA), `gemini.ts`, `store.ts`, `dados.ts`.
- `regras/`, `prompts/`, `conhecimento/`: regras versionadas (YAML), prompt do agente, FAQ regulatória.
- `data/sintetico/`: faturas, ofertas e casos sintéticos.
- `tests/`: testes do simulador e da rota de varejista (rodam se copiados de volta para `tests/`).
- Variáveis que o serviço usava: `GEMINI_API_KEY`, `GEMINI_MODEL`, `VERSAO_REGRAS`, `PRECO_INPUT_USD_POR_MTOK`, `PRECO_OUTPUT_USD_POR_MTOK`.
