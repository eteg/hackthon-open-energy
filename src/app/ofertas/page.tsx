import type { Metadata } from "next";
import { OfertasLista } from "@/components/site/ofertas-lista";

export const metadata: Metadata = { title: "Ofertas para você · Trevolt" };

export default function Page() {
  return <OfertasLista />;
}
