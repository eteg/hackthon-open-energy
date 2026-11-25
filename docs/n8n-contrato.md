# Contrato da API (serviço n8n)

O app (Next.js) é só front. Toda a API é um serviço n8n. O navegador chama `/api/<caminho>` no Next; o proxy
(`src/app/api/[...caminho]/route.ts`) repassa para `${N8N_BASE_URL}/<caminho>` com o mesmo método, corpo e
`Content-Type`, e `Authorization: Bearer ${N8N_TOKEN}` se houver token. Sem `N8N_BASE_URL`, o proxy responde em
**modo demonstração** (`src/lib/demo-api`, respostas fixas).

Login: quando o Supabase está configurado, o proxy exige sessão de fornecedor (perfil `varejista`) em `GET /casos`,
`POST /casos/{id}/aprovar` e `GET /observabilidade` e responde 401/403 sem repassar ao n8n. O banco do Supabase
(`supabase/migrations/`) já tem as tabelas `faturas`, `casos`, `varejista` e `evidencias`, que o n8n pode usar.

Regras que o n8n deve seguir:
- Responder **JSON**. Em erro, o corpo é `{ "erro": "mensagem legível em pt-BR" }` (a UI mostra esse texto). Erros de campo: `{ "erro": "...", "campos": { "<campo>": ["mensagem"] } }`.
- Tipos de entrada e saída: `src/lib/types.ts` (zod), `src/lib/varejista.ts` e `src/lib/api.ts`. Os formatos abaixo resumem; o código é a fonte da verdade.
- Timeout do proxy: 60 s (a leitura da fatura por IA é a chamada mais lenta).
- O n8n é dono da lógica. O código que existia no Next está preservado em `n8n-referencia/` só para portar (não é compilado).

| Método e caminho | Entrada | Saída (sucesso) | Erros |
| --- | --- | --- | --- |
| `GET /faturas` | | `FaturaResumo[]` (id, titular, segmento, classe, uf, total_rs, consumo_kwh, beneficios) | |
| `POST /faturas/extrair` (JSON) | `{ faturaId }` | `{ origem:"base_sintetica", fatura, alerta_injecao, padroes_injecao }` | 400, 404 |
| `POST /faturas/extrair` (`multipart/form-data`, campo `arquivo`: JPG, PNG ou PDF, até 5 MB) | arquivo | `{ origem:"arquivo", fatura (parcial), ausentes[], confianca (0–1), alerta_injecao, padroes_injecao }` | 400, 413 (>5 MB), 415 (formato), 422 (PDF com senha), 502 (leitura falhou), 503 (IA indisponível) |
| `POST /faturas/confirmar` | `{ fatura }` completa, sem `id` | `Fatura` com `id` gerado (`up-…`), 201 | 422 com `campos` |
| `POST /simulacao` | `{ faturaId, ofertaIds? }` | `Simulacao` | 400, 404 |
| `GET /regras` | | `RegrasPublicas` (versao, base_conferida_em, nome_varejista, ciencia_obrigatoria[], premissas[], pendencias_aneel[]) | |
| `POST /agente` | `{ mensagens: MensagemChat[], faturaId? }` | `RespostaAgente` | |
| `GET /casos` | | `{ casos: Caso[], kpis }` | |
| `POST /casos` | `{ faturaId, ofertaId, cienciaIds[] }` | `Caso`, 201 | 400, 404, 422 (ciência incompleta, com `faltando[]`) |
| `POST /casos/{id}/aprovar` | `{ operador }` | `Caso` | 400, 404, 409 (etapa errada) |
| `GET /observabilidade` | | `Observabilidade` | |
| `GET /varejista` | | `{ varejista: Varejista \| null }` | |
| `PUT /varejista` | `VarejistaEntrada` | `Varejista` (201 se novo, 200 se atualização) | 400 com `campos` |

Pontos de comportamento que a UI espera (estavam no código antigo, ver `n8n-referencia/`):
- **Simulação**: cálculo determinístico (`n8n-referencia/lib/simulador.ts` + `regras/*.yaml`); o modelo de IA só explica, nunca calcula.
- **Anti-injeção**: texto livre extraído de documentos e mensagens passa pelos guardrails (`n8n-referencia/lib/guardrails.ts`) e vira dado, nunca instrução.
- **Agente**: RAG sobre `conhecimento/faq-regulatoria.md`, prompt em `prompts/agente-sistema.md`, escalonamento para pessoa por baixa confiança, tema sensível ou pedido do cliente.
- **Aprovação** de caso é sempre de uma pessoa (HITL); a ciência de riscos é registrada com hash.
- **Faturas enviadas** (`up-…`) precisam ser encontráveis por `/simulacao`, `/casos` e `/agente` depois de confirmadas.
