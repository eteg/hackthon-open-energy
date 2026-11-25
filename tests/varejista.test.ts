import { describe, expect, it } from "vitest";

import {
  VarejistaSchema,
  cnpjValido,
  formatarCep,
  formatarCnpj,
  formatarTelefone,
  type VarejistaEntrada,
} from "@/lib/varejista";

// Empresa fictícia; o CNPJ é o exemplo clássico de dígitos válidos, não uma empresa real.
const valido: VarejistaEntrada = {
  razao_social: "Energia Exemplo Comercializadora Varejista Ltda. (fictícia)",
  nome_fantasia: "Energia Exemplo",
  cnpj: "11.222.333/0001-81",
  inscricao_estadual: "",
  codigo_agente_ccee: "123456",
  situacao_ccee: "habilitado",
  ufs_atuacao: ["SP", "MG"],
  cep: "01310-100",
  logradouro: "Avenida Exemplo",
  numero: "1000",
  complemento: "",
  bairro: "Centro",
  cidade: "São Paulo",
  uf: "SP",
  sac_telefone: "(11) 4000-0000",
  sac_email: "Atendimento@Exemplo.test",
  whatsapp: "",
  site: "",
  responsavel_nome: "Pessoa Responsável",
  responsavel_cargo: "",
  responsavel_email: "responsavel@exemplo.test",
  responsavel_telefone: "(11) 98888-7777",
  encarregado_dados_nome: "Pessoa Encarregada",
  encarregado_dados_email: "dpo@exemplo.test",
  declaracao: true,
};

describe("CNPJ", () => {
  it("valida dígitos de CNPJ numérico, com ou sem máscara", () => {
    expect(cnpjValido("11.222.333/0001-81")).toBe(true);
    expect(cnpjValido("11222333000181")).toBe(true);
    expect(cnpjValido("11.222.333/0001-82")).toBe(false);
  });
  it("valida CNPJ alfanumérico (Receita, a partir de jul/2026), inclusive em minúsculas", () => {
    expect(cnpjValido("12.ABC.345/01DE-35")).toBe(true);
    expect(cnpjValido("12abc34501de35")).toBe(true);
    expect(cnpjValido("12.ABC.345/01DE-36")).toBe(false);
  });
  it("recusa sequências repetidas, tamanho errado e letra nos dígitos verificadores", () => {
    expect(cnpjValido("00.000.000/0000-00")).toBe(false);
    expect(cnpjValido("1122233300018")).toBe(false);
    expect(cnpjValido("12ABC34501DE3A")).toBe(false);
  });
});

describe("máscaras", () => {
  it("formata enquanto a pessoa digita", () => {
    expect(formatarCnpj("11222")).toBe("11.222");
    expect(formatarCnpj("12abc34501de35")).toBe("12.ABC.345/01DE-35");
    expect(formatarCep("01310100")).toBe("01310-100");
    expect(formatarTelefone("1140000000")).toBe("(11) 4000-0000");
    expect(formatarTelefone("11988887777")).toBe("(11) 98888-7777");
  });
});

describe("cadastro do varejista (schema)", () => {
  it("aceita o cadastro completo e normaliza CNPJ, telefones, CEP e e-mails", () => {
    const r = VarejistaSchema.parse(valido);
    expect(r.cnpj).toBe("11222333000181");
    expect(r.sac_telefone).toBe("1140000000");
    expect(r.cep).toBe("01310100");
    expect(r.sac_email).toBe("atendimento@exemplo.test");
  });
  it("aponta cada campo com problema", () => {
    const r = VarejistaSchema.safeParse({
      ...valido,
      cnpj: "11.222.333/0001-82",
      ufs_atuacao: [],
      sac_email: "sem-arroba",
      site: "exemplo",
      declaracao: false,
    });
    expect(r.success).toBe(false);
    const campos = r.success ? [] : r.error.issues.map((i) => i.path[0]);
    expect(campos).toEqual(expect.arrayContaining(["cnpj", "ufs_atuacao", "sac_email", "site", "declaracao"]));
  });
});
