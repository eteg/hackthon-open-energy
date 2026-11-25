import type { Metadata } from "next";
import "@fontsource-variable/inter";
import "@fontsource-variable/bricolage-grotesque";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

// Fontes locais (fontsource): a demo não depende de internet para carregar fontes.
export const metadata: Metadata = {
  title: "Trevolt · Energia do jeito combinado",
  description: "Compare ofertas de energia pela conta inteira. Uma plataforma ETEG. Demonstração com dados sintéticos.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="pt-BR" className="h-full bg-background antialiased">
      <body className="min-h-full flex flex-col">
        {children}
        <Toaster />
      </body>
    </html>
  );
}
