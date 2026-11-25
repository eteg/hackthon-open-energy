import type { Metadata } from "next";
import { ConsoleMestre } from "@/components/console/mestre";

export const metadata: Metadata = { title: "Caso · Console do fornecedor" };

export default async function CasoPage({ params }: PageProps<"/console/casos/[id]">) {
  const { id } = await params;
  return <ConsoleMestre id={id} />;
}
