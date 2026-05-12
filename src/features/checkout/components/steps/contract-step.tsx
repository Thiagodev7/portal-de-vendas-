"use client";

import { Button } from "@/components/ui/button";
import { useCartStore } from "@/features/cart/store/cart-store";
import { cn } from "@/lib/utils";
import { ChevronRight, FileText, ScrollText, AlertTriangle } from "lucide-react";
import { useEffect, useRef, useState } from "react";

interface ContractStepProps {
  onNext: () => void;
  onBack: () => void;
}

// ─── Mapeamento: ID do plano → PDF do contrato ───────────────────────────────
const CONTRACT_PDF_MAP: Record<string, string> = {
  quality: "/contratos/UNI_QUALITY.pdf",
  "quality-plus": "/contratos/UNI_QUALITY_PLUS.pdf",
  smart: "/contratos/UNI_SMART.pdf",
  kids: "/contratos/UNI_KIDS.pdf",
};

// ─── Componente ───────────────────────────────────────────────────────────────
export function ContractStep({ onNext, onBack }: ContractStepProps) {
  const { selectedPlan } = useCartStore();
  const [hasScrolled, setHasScrolled] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const [pdfLoaded, setPdfLoaded] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const contractPdfUrl = selectedPlan ? CONTRACT_PDF_MAP[selectedPlan.id] : null;

  const handleScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    // Considera "lido" quando estiver a ≤ 50px do final
    if (el.scrollTop + el.clientHeight >= el.scrollHeight - 50) {
      setHasScrolled(true);
    }
  };

  // Se o contrato for curto o suficiente para caber sem scroll, libera direto
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    if (el.scrollHeight <= el.clientHeight + 50) {
      setHasScrolled(true);
    }
  }, []);

  // Quando o PDF carrega dentro do iframe, consideramos "lido" após 10 segundos (10000ms)
  // de visualização (o usuário precisa ter tempo de ler o contrato completo)
  useEffect(() => {
    if (!pdfLoaded) return;
    const timer = setTimeout(() => {
      setHasScrolled(true);
    }, 10000); // 10 segundos
    return () => clearTimeout(timer);
  }, [pdfLoaded]);

  const canAccept = hasScrolled;
  const canProceed = accepted;

  // Se não houver PDF para o plano, mostra aviso
  if (!contractPdfUrl) {
    return (
      <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="bg-amber-100 p-2 rounded-full">
            <AlertTriangle className="w-6 h-6 text-amber-600" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900">Contrato Indisponível</h2>
            <p className="text-sm text-gray-500">
              O contrato para o plano <strong>{selectedPlan?.name}</strong> ainda não está disponível.
            </p>
          </div>
        </div>

        {/* Botões */}
        <div className="pt-2 flex gap-4">
          <Button
            type="button"
            variant="outline"
            onClick={onBack}
            className="w-1/3 h-12 rounded-xl border-gray-200 text-gray-600 hover:bg-gray-50"
          >
            Voltar
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">

      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="bg-brand-wine/10 p-2 rounded-full">
          <FileText className="w-6 h-6 text-brand-wine" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-gray-900">Contrato de Adesão</h2>
          <p className="text-sm text-gray-500">
            Leia o contrato do plano <strong>{selectedPlan?.name}</strong> antes de finalizar sua contratação.
          </p>
        </div>
      </div>

      {/* Visualizador do PDF do Contrato */}
      <div className="relative">
        <div
          ref={scrollRef}
          onScroll={handleScroll}
          className="relative rounded-xl border border-gray-200 bg-gray-50 overflow-hidden"
          style={{ height: "500px" }}
        >
          <iframe
            src={`${contractPdfUrl}#toolbar=1&navpanes=0`}
            className="w-full h-full border-0"
            title={`Contrato - ${selectedPlan?.name}`}
            onLoad={() => setPdfLoaded(true)}
          />

          {/* Loading overlay enquanto o PDF carrega */}
          {!pdfLoaded && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-50">
              <div className="animate-spin rounded-full h-8 w-8 border-2 border-brand-wine border-t-transparent mb-3" />
              <p className="text-sm text-gray-500">Carregando contrato...</p>
            </div>
          )}
        </div>

        {/* Indicador "aguarde para ler" — some quando lido */}
        {!hasScrolled && pdfLoaded && (
          <div className="absolute bottom-3 left-0 right-0 flex justify-center pointer-events-none">
            <div className="flex items-center gap-1.5 bg-brand-wine text-white text-xs font-medium px-3 py-1.5 rounded-full shadow-lg animate-bounce">
              <ScrollText className="w-3.5 h-3.5" />
              Leia o contrato completo para prosseguir
            </div>
          </div>
        )}
      </div>

      {/* Link para abrir em nova aba */}
      <div className="flex justify-end">
        <a
          href={contractPdfUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-brand-wine hover:underline flex items-center gap-1"
        >
          <FileText className="w-3.5 h-3.5" />
          Abrir contrato em nova aba
        </a>
      </div>

      {/* Badge de leitura concluída */}
      {hasScrolled && (
        <div className="flex items-center gap-2 text-xs text-green-700 font-medium bg-green-50 border border-green-100 px-3 py-2 rounded-lg animate-in fade-in duration-300">
          <FileText className="w-4 h-4" />
          Contrato disponibilizado para leitura.
        </div>
      )}

      {/* Checkbox de Aceite */}
      <label
        className={cn(
          "flex items-start gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all select-none",
          !canAccept ? "opacity-40 cursor-not-allowed border-gray-200 bg-gray-50" :
          accepted ? "border-brand-wine bg-brand-wine/5" : "border-gray-200 bg-white hover:border-brand-wine/40"
        )}
      >
        <input
          type="checkbox"
          checked={accepted}
          disabled={!canAccept}
          onChange={(e) => setAccepted(e.target.checked)}
          className="mt-0.5 w-4 h-4 accent-brand-wine shrink-0"
        />
        <span className="text-sm text-gray-800 leading-snug">
          <strong>Li e aceito os termos do Contrato de Prestação de Serviços Odontológicos</strong> da Uniodonto Goiânia,
          declarando que as informações prestadas são verdadeiras e que estou ciente das coberturas, carências e condições do plano selecionado.
        </span>
      </label>

      {!canAccept && (
        <p className="text-xs text-brand-wine text-center -mt-2">
          É necessário cumprir o tempo mínimo de leitura (10 segundos) para habilitar o aceite.
        </p>
      )}

      {/* Botões */}
      <div className="pt-2 flex gap-4">
        <Button
          type="button"
          variant="outline"
          onClick={onBack}
          className="w-1/3 h-12 rounded-xl border-gray-200 text-gray-600 hover:bg-gray-50"
        >
          Voltar
        </Button>
        <Button
          type="button"
          disabled={!canProceed}
          onClick={onNext}
          className="w-2/3 h-12 bg-brand-wine hover:bg-brand-wine-medium text-white font-bold rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Avançar para Documentos
          <ChevronRight className="w-5 h-5" />
        </Button>
      </div>
    </div>
  );
}
