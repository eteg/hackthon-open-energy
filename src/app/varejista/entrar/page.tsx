import type { Metadata } from "next";
import { EntrarVarejista } from "@/components/varejista/entrar";

export const metadata: Metadata = { title: "Entrar · Trevolt para fornecedores" };

export default function Page() {
  return <EntrarVarejista />;
}
