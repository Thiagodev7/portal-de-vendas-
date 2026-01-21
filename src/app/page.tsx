import { SelectionHeader } from "@/components/layout/selection-header";
import { PlansSection } from "@/features/catalog/components/plans-section";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col bg-white">
      
      <main className="flex-1">
        {/* 1. Header de Boas Vindas e Transição */}
        <SelectionHeader />
        
        {/* 2. Vitrine de Planos (Foco Total) */}
        <PlansSection />
        
        {/* 3. Rodapé Minimalista (Focado em Suporte) */}
        <section className="py-12 border-t border-gray-100 bg-gray-50">
            <div className="container mx-auto text-center">
                <p className="text-gray-500 mb-4">Teve algum problema na escolha?</p>
                <div className="flex justify-center gap-4">
                     <button className="flex items-center gap-2 px-6 py-3 bg-white border border-gray-200 rounded-full shadow-sm hover:shadow-md transition-all text-gray-700 font-bold">
                        <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse"/>
                        Falar no WhatsApp
                     </button>
                     <button className="px-6 py-3 text-brand-wine-DEFAULT font-bold hover:underline">
                        0800 123 4567
                     </button>
                </div>
            </div>
        </section>
      </main>
      
      {/* Footer Legal (Copyright) */}
      <footer className="py-6 bg-white border-t border-gray-100">
        <div className="container mx-auto px-4 text-center text-xs text-gray-400">
          Uniodonto Goiânia - CRO-GO EP-123 - Todos os direitos reservados.
        </div>
      </footer>
    </div>
  );
}