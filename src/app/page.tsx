import Link from "next/link";
import { ArrowRight, LayoutDashboard, MessageSquare, Receipt } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const TELAS = [
  {
    href: "/onboarding",
    icon: Receipt,
    titulo: "Onboarding + simulação honesta",
    texto: "Lê a fatura, mostra a economia real sobre a parcela de energia, colhe a ciência de riscos e abre o caso.",
  },
  {
    href: "/atendimento",
    icon: MessageSquare,
    titulo: "Atendimento com IA",
    texto: "Responde com fonte, escala para uma pessoa quando não sabe e bloqueia instruções escondidas em documentos.",
  },
  {
    href: "/painel",
    icon: LayoutDashboard,
    titulo: "Painel do varejista",
    texto: "Casos por etapa, clientes em risco, aprovação humana da migração e observabilidade da IA.",
  },
];

export default function Home() {
  return (
    <div className="space-y-10">
      <section className="space-y-4 pt-6">
        <p className="text-sm font-medium text-primary">Abertura do mercado livre na baixa tensão · 25/11/2027</p>
        <h1 className="max-w-3xl text-4xl font-bold tracking-tight">
          Migrar 4 milhões de pequenos negócios com honestidade e em escala.
        </h1>
        <p className="max-w-2xl text-lg text-muted-foreground">
          Só cerca de 1/3 da conta é energia. Um desconto de 25% na energia vira cerca de 8,1% na conta. A gente mostra
          isso antes de o cliente assinar.
        </p>
        <Button asChild size="lg">
          <Link href="/onboarding">
            Começar demo <ArrowRight />
          </Link>
        </Button>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        {TELAS.map(({ href, icon: Icon, titulo, texto }) => (
          <Link key={href} href={href} className="group">
            <Card className="h-full transition-shadow group-hover:shadow-md">
              <CardHeader>
                <Icon className="mb-2 size-6 text-primary" />
                <CardTitle>{titulo}</CardTitle>
                <CardDescription>{texto}</CardDescription>
              </CardHeader>
              <CardContent className="text-sm font-medium text-primary">
                Abrir <ArrowRight className="inline size-4 transition-transform group-hover:translate-x-1" />
              </CardContent>
            </Card>
          </Link>
        ))}
      </section>
    </div>
  );
}
