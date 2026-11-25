import type { Metadata } from "next";
import { ContaDecomposta } from "@/components/site/conta-decomposta";

export const metadata: Metadata = { title: "Sua conta em partes · Trevolt" };

export default function Page() {
  return <ContaDecomposta />;
}
