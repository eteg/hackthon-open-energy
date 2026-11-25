import type { Metadata } from "next";
import { DigitarDados } from "@/components/site/digitar-dados";

export const metadata: Metadata = { title: "Digite os dados da conta · Trevolt" };

export default function Page() {
  return <DigitarDados />;
}
