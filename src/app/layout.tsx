import type { Metadata } from "next";
import { Inter } from "next/font/google"; // Importação da fonte
import "./globals.css";
import { cn } from "@/lib/utils"; // Importação do utilitário de classes

// Configuração da fonte Inter
const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: "Portal de Vendas | Uniodonto Goiânia",
  description: "Escolha o melhor plano odontológico para você e sua família.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body className={cn(
        "min-h-screen bg-background font-sans antialiased", 
        inter.variable
      )}>
        <main className="relative flex min-h-screen flex-col">
           {children}
        </main>
      </body>
    </html>
  );
}