import type { Metadata } from "next";
import { AnaliseVarejista } from "@/components/varejista/analise";

export const metadata: Metadata = { title: "Análise do cadastro · Trevolt para fornecedores" };

export default function Page() {
  return <AnaliseVarejista />;
}
