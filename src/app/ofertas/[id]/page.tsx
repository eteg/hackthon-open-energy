import { Suspense } from "react";
import type { Metadata } from "next";
import { ReciboOferta } from "@/components/site/recibo-oferta";

export const metadata: Metadata = { title: "Recibo de economia · Trevolt" };

export default function Page(props: PageProps<"/ofertas/[id]">) {
  // `params` é dado de requisição: lido dentro de <Suspense> para a rota poder ser pré-renderizada (Cache Components).
  return (
    <Suspense fallback={null}>
      <Conteudo params={props.params} />
    </Suspense>
  );
}

async function Conteudo({ params }: Pick<PageProps<"/ofertas/[id]">, "params">) {
  const { id } = await params;
  return <ReciboOferta id={id} />;
}
