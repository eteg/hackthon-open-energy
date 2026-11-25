import { describe, expect, it } from "vitest";
import { USUARIOS_MOCK, autenticar } from "@/lib/auth-mock";

describe("usuários de teste (mock)", () => {
  it("entra com os dois usuários combinados e devolve o perfil certo, sem a senha", () => {
    expect(autenticar("varejista@gmail.com", "Teste123")).toEqual({ email: "varejista@gmail.com", nome: "Marina Alves", perfil: "varejista" });
    expect(autenticar("consumidor@gmail.com", "Teste123")).toEqual({ email: "consumidor@gmail.com", nome: "Pessoa de Teste", perfil: "consumidor" });
    expect(autenticar("consumidor@gmail.com", "Teste123")).not.toHaveProperty("senha");
  });

  it("ignora maiúsculas e espaços no e-mail, mas a senha é exata", () => {
    expect(autenticar("  Varejista@Gmail.com ", "Teste123")?.perfil).toBe("varejista");
    expect(autenticar("varejista@gmail.com", "teste123")).toBeNull();
    expect(autenticar("varejista@gmail.com", "Teste123 ")).toBeNull();
  });

  it("recusa senha errada, usuário desconhecido e campos vazios", () => {
    expect(autenticar("varejista@gmail.com", "errada")).toBeNull();
    expect(autenticar("alguem@gmail.com", "Teste123")).toBeNull();
    expect(autenticar("", "")).toBeNull();
  });

  it("tem exatamente um usuário de cada perfil", () => {
    expect(USUARIOS_MOCK.map((u) => u.perfil).sort()).toEqual(["consumidor", "varejista"]);
  });
});
