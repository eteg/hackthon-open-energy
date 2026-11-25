import type { Metadata } from "next";
import { Permissoes } from "@/components/console/permissoes";

export const metadata: Metadata = { title: "Permissões · Console do fornecedor" };

export default function PermissoesPage() {
  return <Permissoes />;
}
