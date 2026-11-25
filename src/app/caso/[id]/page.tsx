import { Suspense } from "react";
import { Acompanhamento } from "@/components/caso/acompanhamento";

export default function CasoPage(props: PageProps<"/caso/[id]">) {
  // `params` é dado de requisição: lido dentro de <Suspense> para a rota poder ser pré-renderizada (Cache Components).
  return (
    <Suspense fallback={null}>
      <Conteudo params={props.params} />
    </Suspense>
  );
}

async function Conteudo({ params }: Pick<PageProps<"/caso/[id]">, "params">) {
  const { id } = await params;
  return <Acompanhamento id={id} />;
}
