import type { Metadata } from "next";
import { CadastroVarejista } from "@/components/varejista/cadastro";

export const metadata: Metadata = { title: "Cadastro de varejista · Trevolt para fornecedores" };

export default function Page() {
  return <CadastroVarejista />;
}
