"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";

export default function Providers({ children }: { children: React.ReactNode }) {
  // Garantir que o QueryClient seja criado apenas uma vez por sessão do navegador
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        // Em SaaS, dados stale-while-revalidate são ótimos.
        // Evita refetch agressivo ao mudar o foco da janela.
        staleTime: 60 * 1000, 
      },
    },
  }));

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}