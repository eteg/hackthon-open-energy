/**
 * A home do produto é a landing page (site estático na Vercel), não uma tela deste app.
 * A pessoa entra no app pela LP ("Simular agora no app" → /fatura) e todo "voltar para o início" leva de volta para ela.
 */
export const URL_LP = "https://trevolt.vercel.app/";
/** Página da LP para fornecedores: o "início" do console e do portal do fornecedor. */
export const URL_LP_FORNECEDORES = "https://trevolt.vercel.app/fornecedores.html";

/** Endereço fora do app (outro domínio): navega com o navegador, não com o roteador do Next. */
export const ehExterno = (href: string) => /^https?:\/\//.test(href);
