import Link from "next/link";
import { BadgeCheck, Check } from "lucide-react";
import { QrExemplo } from "@/components/site/qr-exemplo";
import { Logo, Simbolo } from "@/components/trevolt/logo";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const PONTOS_MOBILE = [
  "A rede e a distribuidora continuam as mesmas.",
  "A economia é calculada sobre a conta inteira. Só a energia, cerca de um terço, é negociável.",
  "Nenhuma economia é garantida.",
];
const PONTOS_DESKTOP = [
  "A rede e a distribuidora continuam as mesmas. Muda quem vende a energia.",
  "A economia é calculada sobre a conta inteira. Só a energia, cerca de um terço dela, é negociável.",
  "Nenhuma economia é garantida. Você vê a faixa, as premissas e a conta feita.",
];

const PASSOS = [
  { n: 1, titulo: "Envie a fatura", texto: "Foto ou PDF. A IA lê e você confere os dados." },
  { n: 2, titulo: "Veja a conta decomposta", texto: "Energia, distribuição, encargos e transmissão separados." },
  { n: 3, titulo: "Decida com recibo", texto: "Ofertas ordenadas pela economia líquida, igual para todas." },
];

function Pontos({ itens }: { itens: string[] }) {
  return (
    <ul className="flex flex-col gap-2.5 md:gap-3">
      {itens.map((t) => (
        <li key={t} className="flex items-start gap-2.5 text-sm leading-snug md:gap-3 md:text-base">
          <span className="mt-px flex size-[22px] flex-none items-center justify-center rounded-full bg-accent md:size-6">
            <Check className="size-3.5 text-primary" strokeWidth={2.5} aria-hidden="true" />
          </span>
          <span>{t}</span>
        </li>
      ))}
    </ul>
  );
}

/** Landing: celular = S1 (início com botão fixo); desktop = hero com "Enviar minha fatura" + QR, como funciona e recibo de exemplo. */
export default function Home() {
  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <header className="flex h-14 items-center justify-between gap-4 border-b px-4 md:h-auto md:border-b-0 md:px-10 md:py-[18px]">
        <Link href="/" aria-label="Trevolt, página inicial">
          <Logo className="md:[&_span:last-child]:text-[32px] md:[&>svg]:h-8 md:[&>svg]:w-12" />
        </Link>
        <div className="flex items-center gap-4 md:gap-6">
          <nav aria-label="Seções" className="hidden items-center gap-6 text-[15px] font-medium md:flex">
            <a href="#como" className="hover:text-primary">Como funciona</a>
            <a href="#recibo" className="hover:text-primary">Recibo de economia</a>
          </nav>
        </div>
      </header>

      <main className="flex flex-1 flex-col">
        <section className="mx-auto flex w-full max-w-[1200px] flex-1 flex-col gap-4 p-4 md:flex-none md:flex-row md:items-center md:gap-14 md:px-10 md:pt-10 md:pb-6">
          <div className="flex min-w-0 flex-1 flex-col gap-4 md:gap-[22px]">
            <Badge className="self-start">Mercado livre de energia · baixa tensão</Badge>
            <h1 className="text-[34px] leading-[1.06] font-medium md:text-[60px]">Sua conta de luz ganhou concorrência. Você ganhou o poder de escolher.</h1>
            <p className="max-w-[560px] text-[15px] leading-normal text-muted-foreground md:text-[19px]">
              <span className="md:hidden">Envie a foto da sua fatura. Mostramos, sem promessa, quanto da conta inteira pode mudar. Grátis para você.</span>
              <span className="hidden md:inline">
                Envie a foto da sua fatura. Mostramos, sem promessa, quanto da conta inteira pode mudar e o que você deixa de ter ao sair do mercado regulado. Grátis para você.
              </span>
            </p>
            <div className="md:hidden">
              <Pontos itens={PONTOS_MOBILE} />
            </div>
            <div className="hidden md:block">
              <Pontos itens={PONTOS_DESKTOP} />
            </div>
            <div className="hidden font-display text-xl font-semibold text-primary md:block">Energia do jeito combinado.</div>
            <p className="mt-auto text-xs leading-snug text-muted-foreground md:hidden">As regras da ANEEL e da CCEE ainda estão em regulamentação. Demonstração com dados sintéticos.</p>
          </div>

          <div className="hidden w-[380px] min-w-[290px] flex-none flex-col items-center gap-[18px] rounded-xl border bg-card p-7 shadow-[0_18px_40px_rgba(30,34,41,.10)] md:flex">
            <h2 className="self-start text-2xl font-medium">Escaneie para começar</h2>
            <div className="rounded-2xl border bg-card p-3.5">
              <QrExemplo className="size-[180px]" />
            </div>
            <Button asChild size="lg">
              <Link href="/fatura">Enviar minha fatura</Link>
            </Button>
            <p className="text-center text-[13px] leading-snug text-muted-foreground">
              QR de exemplo. Pelo celular ou por aqui, o caminho é o mesmo e a Assistente Trevolt, uma IA, acompanha do começo ao fim.
            </p>
          </div>
        </section>

        <section id="como" className="mx-auto hidden w-full max-w-[1200px] grid-cols-3 gap-5 px-10 py-6 md:grid">
          {PASSOS.map((p) => (
            <div key={p.n} className="rounded-xl border bg-card p-4">
              <div className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">Passo {p.n}</div>
              <h3 className="mt-2 text-[22px] font-medium">{p.titulo}</h3>
              <p className="mt-2 text-[15px] leading-normal text-muted-foreground">{p.texto}</p>
            </div>
          ))}
        </section>

        <section id="recibo" className="mx-auto hidden w-full max-w-[1200px] flex-wrap items-center gap-10 px-10 pt-6 pb-8 md:flex">
          <div className="flex min-w-0 flex-[1_1_380px] flex-col gap-2.5">
            <h2 className="text-4xl leading-[1.1] font-medium">Primeiro o combinado. Depois o realizado.</h2>
            <p className="text-base leading-relaxed text-muted-foreground">
              Todo mês a gente confere se a economia combinada apareceu na sua fatura e avisa 90 dias antes da renovação. O verde só aparece quando a economia é confirmada.
            </p>
          </div>
          <div className="recibo flex max-w-[520px] min-w-[300px] flex-[1_1_380px] flex-col gap-2.5 p-4">
            <div className="text-sm font-semibold text-primary">Recibo de economia · outubro (exemplo)</div>
            <div className="flex items-center justify-between text-lg">
              <span className="text-muted-foreground">Combinado</span>
              <span className="tabular-nums">R$ 330 a R$ 410</span>
            </div>
            <div className="flex items-center justify-between text-lg">
              <span className="text-muted-foreground">Realizado</span>
              <span className="font-semibold tabular-nums">R$ 384</span>
            </div>
            <Badge variant="confirmado" className="self-start px-3.5 py-1.5 text-sm">
              <BadgeCheck aria-hidden="true" /> Dentro do combinado
            </Badge>
            <Simbolo className="self-end opacity-60" />
          </div>
        </section>
      </main>

      <div className="sticky bottom-0 border-t bg-background px-4 py-3 md:hidden">
        <Button asChild size="lg">
          <Link href="/fatura">Enviar minha fatura</Link>
        </Button>
      </div>

      <footer className="mx-auto hidden w-full max-w-[1200px] flex-wrap justify-between gap-3 border-t px-10 pt-5 pb-8 text-[13px] leading-normal text-muted-foreground md:flex">
        <span>As regras da ANEEL e da CCEE ainda estão em regulamentação e podem mudar. Demonstração com dados sintéticos.</span>
        <span>Uma plataforma ETEG</span>
      </footer>
    </div>
  );
}
