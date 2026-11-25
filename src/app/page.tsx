import Link from "next/link";
import { ArrowRight, Building2, House } from "lucide-react";

// MVP do hackathon: a home só pergunta quem é a pessoa e leva ao onboarding certo.
// Os próximos fluxos de cada perfil ainda vão ser definidos; por ora cada botão abre a tela que já existe.
const PERFIS = [
  {
    href: "/painel/empresa",
    icon: Building2,
    titulo: "Varejista",
    texto: "Cadastre sua comercializadora e acompanhe os clientes que querem migrar.",
  },
  {
    href: "/onboarding",
    icon: House,
    titulo: "Consumidor final",
    texto: "Envie sua conta de luz e veja quanto economiza antes de migrar.",
  },
];

export default function Home() {
  return (
    <section className="flex min-h-[60vh] flex-col items-center justify-center gap-8 py-6 text-center">
      <div className="space-y-2">
        <p className="text-sm font-medium text-primary">Mercado livre de energia na baixa tensão</p>
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Como você quer começar?</h1>
      </div>

      <div className="grid w-full max-w-3xl gap-4 sm:grid-cols-2">
        {PERFIS.map(({ href, icon: Icon, titulo, texto }) => (
          <Link
            key={href}
            href={href}
            className="group flex flex-col items-center gap-3 rounded-xl border bg-card p-6 text-card-foreground shadow-sm transition-all outline-none hover:border-primary hover:shadow-md focus-visible:ring-[3px] focus-visible:ring-ring/50 sm:p-8"
          >
            <span className="flex size-14 items-center justify-center rounded-full bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
              <Icon className="size-7" />
            </span>
            <span className="text-xl font-semibold">{titulo}</span>
            <span className="text-sm text-muted-foreground">{texto}</span>
            <span className="mt-1 inline-flex items-center gap-1 text-sm font-medium text-primary">
              Começar <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}
