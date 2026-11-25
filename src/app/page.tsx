import { ArrowRight, Building2, House } from "lucide-react";
import { escolherPerfil } from "@/app/actions";
import { PERFIS, type Perfil } from "@/lib/perfil";

// MVP do hackathon: a home só pergunta quem é a pessoa. O botão grava o perfil (cookie) e abre a primeira
// tela dele; sem essa escolha, o proxy manda qualquer outra tela de volta para cá.
// Os próximos fluxos de cada perfil ainda vão ser definidos; por ora cada um abre a tela que já existe.
const OPCOES: { perfil: Perfil; icon: React.ElementType; texto: string }[] = [
  {
    perfil: "varejista",
    icon: Building2,
    texto: "Cadastre sua comercializadora e acompanhe os clientes que querem migrar.",
  },
  {
    perfil: "consumidor",
    icon: House,
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

      <form action={escolherPerfil} className="grid w-full max-w-3xl gap-4 sm:grid-cols-2">
        {OPCOES.map(({ perfil, icon: Icon, texto }) => (
          <button
            key={perfil}
            type="submit"
            name="perfil"
            value={perfil}
            className="group flex cursor-pointer flex-col items-center gap-3 rounded-xl border bg-card p-6 text-card-foreground shadow-sm transition-all outline-none hover:border-primary hover:shadow-md focus-visible:ring-[3px] focus-visible:ring-ring/50 sm:p-8"
          >
            <span className="flex size-14 items-center justify-center rounded-full bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
              <Icon className="size-7" />
            </span>
            <span className="text-xl font-semibold">{PERFIS[perfil].titulo}</span>
            <span className="text-sm text-muted-foreground">{texto}</span>
            <span className="mt-1 inline-flex items-center gap-1 text-sm font-medium text-primary">
              Começar <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
            </span>
          </button>
        ))}
      </form>
    </section>
  );
}
