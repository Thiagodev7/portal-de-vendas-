"use client";

import { Check, X, Info, ShieldCheck, Sparkles, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { IPlan } from "../types";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { useCartStore } from "@/features/cart/store/cart-store";

interface PlanCardProps {
  plan: IPlan;
  isAnnual: boolean;
}

export function PlanCard({ plan, isAnnual }: PlanCardProps) {
  const router = useRouter();
  const setPlan = useCartStore((state) => state.setPlan);
  const isHighlight = plan.highlight;
  
  // Preço Mensal (Base) e Preço com Desconto
  const monthlyPrice = plan.price;
  const annualPriceMonthlyEquivalent = plan.price * 0.9;
  
  const displayPrice = isAnnual ? annualPriceMonthlyEquivalent : monthlyPrice;

  const handleSelectPlan = () => {
    setPlan(plan, isAnnual ? 'yearly' : 'monthly');
    router.push('/checkout');
  };

  return (
    <div className="relative w-full group perspective-1000 h-full pt-8">
      <motion.div
        whileHover={{ y: -8, scale: 1.01 }}
        transition={{ type: "spring", stiffness: 300, damping: 20 }}
        className={cn(
          "relative flex flex-col p-6 rounded-[2rem] bg-white transition-all duration-300 h-full border w-full max-w-sm mx-auto",
          // Sombra suave e borda elegante
          isHighlight 
            ? "border-brand-wine shadow-2xl shadow-brand-wine/15 ring-4 ring-brand-wine/5 z-10" 
            : "border-gray-100 shadow-lg hover:shadow-xl hover:border-brand-wine/30"
        )}
      >
        {/* RIBBON FLUTUANTE (Volta do design premium) */}
        {isHighlight && (
          <div className="absolute -top-4 inset-x-0 flex justify-center z-20">
             <div className="bg-gradient-to-r from-brand-wine to-brand-wine-light text-white px-5 py-1.5 rounded-full shadow-lg shadow-brand-wine/40 flex items-center gap-2 text-xs font-bold uppercase tracking-wider animate-in fade-in slide-in-from-top-2 duration-500">
               <Sparkles className="w-3 h-3 fill-current animate-pulse" />
               Recomendado
             </div>
          </div>
        )}

        {/* CABEÇALHO */}
        <div className="mb-4 mt-2">
            <div className="flex justify-between items-start gap-2">
                <h3 className={cn("text-lg font-bold leading-tight", isHighlight ? "text-brand-wine" : "text-gray-900")}>
                    {plan.name}
                </h3>
                {plan.copay && (
                    <div className="group/tooltip relative shrink-0">
                        <Info className="w-5 h-5 text-blue-300 cursor-help hover:text-blue-500 transition-colors" />
                        {/* Tooltip simples */}
                        <div className="absolute right-0 top-6 w-40 p-2 bg-gray-800 text-white text-[10px] rounded opacity-0 group-hover/tooltip:opacity-100 transition-opacity pointer-events-none z-50">
                            Plano com taxas por uso.
                        </div>
                    </div>
                )}
            </div>
            <p className="text-xs text-gray-500 mt-2 min-h-[40px] leading-relaxed">
                {plan.description}
            </p>
        </div>

        {/* ÁREA DE PREÇO (Limpa e Direta) */}
        <div className={cn(
            "mb-6 p-5 rounded-2xl transition-colors border flex flex-col items-center justify-center relative overflow-hidden group-hover:bg-gray-50/50",
            isHighlight ? "bg-brand-wine/5 border-brand-wine/10" : "bg-white border-gray-100"
        )}>
            {/* Preço Antigo (Ancoragem sutil) */}
            {isAnnual && (
                <div className="absolute top-2 right-3">
                    <span className="text-xs text-gray-400 line-through decoration-red-300 decoration-1">
                        R$ {Math.floor(monthlyPrice)}
                    </span>
                </div>
            )}

            <div className="flex items-end justify-center gap-1 text-gray-900 z-10">
                <span className="text-lg font-medium text-gray-400 mb-2">R$</span>
                <span className={cn("text-5xl font-extrabold tracking-tighter", isHighlight ? "text-brand-wine" : "text-gray-900")}>
                    {Math.floor(displayPrice)}
                </span>
                <div className="flex flex-col text-left mb-2">
                    <span className="text-lg font-bold">,{displayPrice.toFixed(2).split('.')[1]}</span>
                    <span className="text-[9px] text-gray-400 font-bold uppercase tracking-wide">{isAnnual ? '/mês (anual)' : '/mês'}</span>
                </div>
            </div>
            
            {/* Badges de Aviso */}
            <div className="flex gap-2 mt-2">
                {isAnnual && (
                    <span className="text-[10px] bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-bold">
                        Economia Anual
                    </span>
                )}
                {plan.observation && !isAnnual && (
                    <span className="text-[10px] bg-orange-50 text-orange-600 border border-orange-100 px-2 py-0.5 rounded-full font-bold flex items-center gap-1">
                        + Taxas
                    </span>
                )}
            </div>
        </div>

        {/* LISTA DE BENEFÍCIOS (Clean & Minimalista) */}
        <div className="flex-1 mb-8">
            <ul className="space-y-0"> {/* Removemos space-y para usar border */}
                {plan.features.map((feature, idx) => ( 
                    <li key={idx} className="flex items-start gap-3 py-2.5 border-b border-gray-50 border-dashed last:border-0 hover:bg-gray-50/50 transition-colors px-1 rounded-md">
                        <div className={cn(
                            "mt-0.5 rounded-full p-0.5 shrink-0",
                            feature.included 
                                ? "text-green-500" // Apenas o ícone colorido, sem fundo pesado
                                : "text-gray-300"
                        )}>
                            {feature.included ? <Check className="w-3.5 h-3.5 stroke-[3]" /> : <X className="w-3.5 h-3.5" />}
                        </div>
                        <span className={cn(
                            "text-sm leading-tight",
                            feature.included ? "text-gray-600 font-medium" : "text-gray-300 line-through decoration-gray-200"
                        )}>
                            {feature.text}
                        </span>
                    </li>
                ))}
            </ul>
        </div>

        {/* CTA (Botão) */}
        <div className="mt-auto">
            <Button 
                onClick={handleSelectPlan}
                className={cn(
                    "w-full h-12 rounded-xl text-sm font-bold shadow-md transition-all duration-300 hover:scale-[1.02]",
                    isHighlight 
                    ? "bg-brand-wine hover:bg-brand-wine-medium text-white shadow-brand-wine/25" 
                    : "bg-white border-2 border-gray-200 text-gray-600 hover:border-brand-wine hover:text-brand-wine hover:bg-gray-50"
                )}
            >
                {plan.ctaText}
            </Button>
            
            {isHighlight && (
                <div className="mt-3 flex justify-center items-center gap-1.5 text-[10px] text-gray-400 font-medium opacity-80">
                    <ShieldCheck className="w-3 h-3" />
                    <span>Garantia de Satisfação</span>
                </div>
            )}
        </div>
      </motion.div>
    </div>
  );
}