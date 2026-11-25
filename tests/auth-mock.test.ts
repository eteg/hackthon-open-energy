import { describe, expect, it } from "vitest";
import { USUARIOS_MOCK, autenticar } from "@/lib/auth-mock";

describe("usuário de teste (mock)", () => {
  it("entra com o fornecedor combinado e devolve o perfil, sem a senha", () => {
    expect(autenticar("varejista@gmail.com", "Teste123")).toEqual({ email: "varejista@gmail.com", nome: "Marina Alves", perfil: "varejista" });
    expect(autenticar("varejista@gmail.com", "Teste123")).not.toHaveProperty("senha");
  });

  it("ignora maiúsculas e espaços no e-mail, mas a senha é exata", () => {
    expect(autenticar("  Varejista@Gmail.com ", "Teste123")?.perfil).toBe("varejista");
    expect(autenticar("varejista@gmail.com", "teste123")).toBeNull();
    expect(autenticar("varejista@gmail.com", "Teste123 ")).toBeNull();
  });

  it("recusa senha errada, usuário desconhecido (inclusive o consumidor, que não tem login) e campos vazios", () => {
    expect(autenticar("varejista@gmail.com", "errada")).toBeNull();
    expect(autenticar("consumidor@gmail.com", "Teste123")).toBeNull();
    expect(autenticar("", "")).toBeNull();
  });

  it("tem um único usuário", () => {
    expect(USUARIOS_MOCK).toHaveLength(1);
  });
});
