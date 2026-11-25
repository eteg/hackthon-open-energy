import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import { Header } from "@/components/app/header";
import "./globals.css";

// Fontes locais (pacote geist): a demo não depende de internet para carregar fontes.
export const metadata: Metadata = {
  title: "Copiloto de Migração · Mercado Livre BT",
  description: "Onboarding, simulação honesta e painel do varejista — Hackathon ETEG 2026 (dados 100% sintéticos)",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    // bg-background no <html>: o body usa bg-muted/30 (translúcido) e, sem fundo opaco embaixo,
    // navegadores em modo escuro mostravam cinza-escuro atrás do conteúdo claro.
    <html lang="pt-BR" className={`${GeistSans.variable} ${GeistMono.variable} h-full bg-background antialiased`}>
      <body className="min-h-full flex flex-col bg-muted/30">
        <Header />
        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">{children}</main>
        <footer className="border-t bg-background py-4 text-center text-xs text-muted-foreground">
          Hackathon ETEG 2026 · Dados 100% sintéticos · Economia é estimativa em faixa, nunca garantia
        </footer>
      </body>
    </html>
  );
}
