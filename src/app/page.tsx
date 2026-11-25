import { redirect } from "next/navigation";
import { URL_LP } from "@/lib/links";

/** A home é a landing page (src/lib/links.ts); quem abre a raiz do app vai para ela. A entrada no app é /fatura. */
export default function Home() {
  redirect(URL_LP);
}
