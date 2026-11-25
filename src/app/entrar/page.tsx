import type { Metadata } from "next";
import { EntrarConsumidor } from "@/components/conta/entrar-consumidor";

export const metadata: Metadata = { title: "Entrar · Trevolt" };

export default function EntrarPage() {
  return <EntrarConsumidor />;
}
