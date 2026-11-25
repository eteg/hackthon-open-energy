import type { Metadata } from "next";
import { ConferirFatura } from "@/components/site/conferir-fatura";

export const metadata: Metadata = { title: "Confira o que li · Trevolt" };

export default function Page() {
  return <ConferirFatura />;
}
