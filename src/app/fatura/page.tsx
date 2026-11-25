import type { Metadata } from "next";
import { EnviarFatura } from "@/components/site/enviar-fatura";

export const metadata: Metadata = { title: "Envie a sua fatura · Trevolt" };

export default function Page() {
  return <EnviarFatura />;
}
