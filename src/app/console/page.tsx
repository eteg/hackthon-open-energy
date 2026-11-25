import type { Metadata } from "next";
import { ConsoleMestre } from "@/components/console/mestre";

export const metadata: Metadata = { title: "Console do fornecedor" };

export default function ConsolePage() {
  return <ConsoleMestre />;
}
