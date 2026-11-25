# Copiloto de Migração · Mercado Livre de Energia BT

Hackathon ETEG 2026. Onboarding + simulação honesta + painel do varejista para a abertura do mercado livre na baixa tensão (25/11/2027). Referência de produto: Octopus Energy / Kraken, adaptada à ETEG (só a fatia de onboarding e atendimento, sem faturamento nem medição).

> **Dados 100% sintéticos.** Nenhum dado real de cliente. Economia é sempre estimativa em faixa, nunca garantia.

## Como rodar

```bash
npm install
cp .env.example .env.local   # opcional: sem chave, o agente roda offline (custo zero)
npm run dev                  # http://localhost:3000
npm test                     # testes do simulador, guardrails e RAG
```

Stack: Next.js 16 (App Router, Cache Components) · Tailwind CSS 4 · shadcn/ui (Radix) · Axios · Zod · Vitest.
Para novos componentes shadcn: `npx shadcn@latest add dialog` (o `components.json` já está configurado).

## Telas

| Rota | O que mostra |
|---|---|
| `/onboarding` | Fatura → dados extraídos → simulação honesta com recibo → ciência de riscos → pedido de migração |
| `/atendimento` | Agente com RAG + fonte, escalonamento para humano e bloqueio de prompt injection |
| `/painel` | Casos por etapa, risco de desistência, **aprovação humana** da migração, observabilidade da IA |

## Regra de ouro (testada)

O desconto incide **só sobre a energia (TE)**. Na padaria sintética, energia = 32,4% da conta, então 25% na energia = **8,1% na conta** (`tests/simulador.test.ts`). O modelo de IA nunca calcula: `src/lib/simulador.ts` calcula, a IA explica.

## Arquitetura

```
regras/v2026-11.yaml        Regras versionadas com fonte (prazos, abertura por classe, benefícios, ciência)
data/sintetico/*.json       Faturas, ofertas e casos fictícios (com casos de borda)
conhecimento/faq-*.md       Base do RAG (cada "## pergunta" é um chunk)
prompts/agente-sistema.md   System prompt do agente ({{variáveis}} preenchidas pelo código)
src/lib/simulador.ts        Cálculo determinístico + recibo auditável (hash do input + versão das regras)
src/lib/guardrails.ts       Anti-injection (camada 1) e gatilhos de escalonamento
src/lib/agente.ts           Agente: modo LLM (Anthropic) ou offline (RAG + templates)
src/lib/store.ts            Estado em memória + evidências e observabilidade em logs/*.jsonl
src/lib/api.ts              Cliente Axios usado por todas as telas
src/app/api/*               Rotas: faturas, faturas/extrair, simulacao, regras, agente, casos, casos/[id]/aprovar, observabilidade
```

## Casos de borda da base sintética

| Fatura | Caso | O que o produto faz |
|---|---|---|
| fat-001 Padaria | Caso feliz | 25% na energia → 8,1% na conta, faixa e recibo |
| fat-002 Metalúrgica | Indústria | Compara 3 ofertas |
| fat-003 Sítio irrigante | Perde desconto de irrigação + só migra em 2028 | Alerta, desconta o benefício e diz que **não compensa** |
| fat-004 Mercadinho | Consumo baixo | **Não compensa** (abaixo do mínimo do produto) |
| fat-005 Oficina | **Prompt injection** no texto da fatura | Bloqueia, registra evidência, simulação não muda |
| fat-006 Ateliê MEI | Tem TSEE + residencial | Alerta TSEE, 2028, não compensa |

## Técnicas do catálogo (preencher com o que rodar ao vivo)

1. **Interpretar documentos com saída tipada:** `FaturaSchema` (zod) em `src/lib/types.ts`. Hoje `/api/faturas/extrair` devolve a fatura pré-extraída (plano de falha). **TODO:** upload de PDF/foto + modelo de visão validado pelo mesmo schema.
2. **Encontrar/analisar informação:** RAG sobre a FAQ regulatória com citação de fonte + simulador comparando 3 ofertas.
3. **Executar ações com humano no circuito:** ciência registrada com hash, caso aberto em `aguardando_aprovacao`, só um operador aprova.

## Critérios de qualidade (evidências)

| Critério | Implementação | Evidência |
|---|---|---|
| Segurança | 3 camadas: regex de injeção → documento sanitizado antes do modelo → saída validada por zod e números só do simulador | `tests/`, fat-005, `logs/evidencias.jsonl` (`injecao_bloqueada`) |
| Observabilidade | Latência, tokens, custo e escalonamento por chamada | `/api/observabilidade`, painel, `logs/observabilidade.jsonl` |
| Controle humano | Ciência obrigatória (7 itens com fonte) + aprovação do operador | `POST /api/casos` (422 sem ciência), `POST /api/casos/[id]/aprovar` |
| Custo | Modo offline com custo zero; custo do LLM calculado só com preços do `.env` | `.env.example` |

## O que é mock

Extração de fatura (base pré-extraída), ofertas e casos (fictícios), estado em memória (reinicia com o servidor), sem integração com CCEE, distribuidora ou assinatura digital.
