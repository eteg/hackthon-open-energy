/**
 * Perfis do MVP. A home grava o perfil escolhido num cookie e o proxy (src/proxy.ts)
 * só libera as outras telas depois dessa escolha.
 * Sem dependências de Node: é importado pelo proxy, pela Server Action e pela home.
 */
export const COOKIE_PERFIL = "perfil";

export const PERFIS = {
  varejista: { titulo: "Varejista", destino: "/painel/empresa" },
  consumidor: { titulo: "Consumidor final", destino: "/onboarding" },
} as const;

export type Perfil = keyof typeof PERFIS;

// Object.hasOwn, e não `in`: "toString" in PERFIS seria true.
export const ehPerfil = (valor: unknown): valor is Perfil => typeof valor === "string" && Object.hasOwn(PERFIS, valor);
