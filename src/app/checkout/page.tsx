"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useCartStore } from "@/features/cart/store/cart-store";
import { Check, ShieldCheck, Lock } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

// --- IMPORTAÇÃO DOS PASSOS DO WIZARD ---
import { AddressStep } from "@/features/checkout/components/steps/address-step";
import { PersonalDataStep } from "@/features/checkout/components/steps/personal-data-step";
import { PaymentStep } from "@/features/checkout/components/steps/payment-step";

// --- MOTOR DE CÁLCULO FINANCEIRO ---
import { calculateCheckout } from "@/features/checkout/services/pricing-engine";

// Definição das Etapas
const STEPS = [
  { id: 1, name: "Cobertura" },
  { id: 2, name: "Identificação" },
  { id: 3, name: "Pagamento" },
];

export default function CheckoutPage() {
  const router = useRouter();
  
  // Acessa o Estado Global
  const { selectedPlan, billingCycle, dependentsCount } = useCartStore();
  
  const [currentStep, setCurrentStep] = useState(1);

  // Proteção: Se não tiver plano, volta para a vitrine
  useEffect(() => {
    if (!selectedPlan) {
      router.push("/#planos");
    }
  }, [selectedPlan, router]);

  // Evita renderizar tela vazia enquanto redireciona
  if (!selectedPlan) return null;

  // --- CÁLCULO FINANCEIRO EM TEMPO REAL ---
  // Usa o ID do plano e a contagem de dependentes (atualizada pelo PersonalDataStep)
  const financials = calculateCheckout(selectedPlan.id, dependentsCount, billingCycle);

  return (
    <div className="min-h-screen bg-gray-50/50 font-sans">
      
      {/* HEADER DE CHECKOUT (Focado e Seguro) */}
      <header className="bg-white border-b border-gray-100 sticky top-0 z-50">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
             <div className="h-8 w-8 bg-brand-wine rounded-lg flex items-center justify-center text-white font-bold text-lg">U</div>
             <span className="font-bold text-gray-900 hidden sm:inline-block">Checkout Seguro</span>
          </div>
          <div className="flex items-center gap-2 text-xs font-medium text-green-700 bg-green-50 px-3 py-1.5 rounded-full border border-green-100">
            <Lock className="w-3 h-3" />
            Ambiente Criptografado
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 lg:py-12">
        <div className="grid lg:grid-cols-12 gap-8 lg:gap-12 max-w-6xl mx-auto">
          
          {/* --- COLUNA DA ESQUERDA: WIZARD --- */}
          <div className="lg:col-span-7 xl:col-span-8">
            
            {/* Barra de Progresso (Stepper Visual) */}
            <nav aria-label="Progress" className="mb-8">
              <ol role="list" className="flex items-center w-full">
                {STEPS.map((step, stepIdx) => {
                  const isActive = step.id === currentStep;
                  const isCompleted = step.id < currentStep;

                  return (
                    <li key={step.name} className={cn(stepIdx !== STEPS.length - 1 ? "flex-1" : "", "relative")}>
                      <div className="flex items-center gap-3">
                         {/* Indicador (Bolinha) */}
                         <div className={cn(
                            "w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300 border-2",
                            isActive ? "border-brand-wine bg-brand-wine text-white" : 
                            isCompleted ? "border-brand-wine bg-white text-brand-wine" : "border-gray-200 bg-white text-gray-400"
                         )}>
                            {isCompleted ? <Check className="w-4 h-4" /> : step.id}
                         </div>
                         
                         {/* Texto do Passo */}
                         <span className={cn(
                            "text-sm font-medium hidden sm:block",
                            isActive ? "text-brand-wine font-bold" : isCompleted ? "text-brand-wine" : "text-gray-400"
                         )}>
                            {step.name}
                         </span>

                         {/* Linha Conectora */}
                         {stepIdx !== STEPS.length - 1 && (
                            <div className={cn(
                                "flex-1 h-0.5 mx-4 transition-colors duration-300",
                                isCompleted ? "bg-brand-wine" : "bg-gray-200"
                            )} />
                         )}
                      </div>
                    </li>
                  );
                })}
              </ol>
            </nav>

            {/* Área de Conteúdo dos Passos */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 md:p-8 min-h-[400px]">
              <motion.div
                key={currentStep}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
              >
                {/* PASSO 1: COBERTURA (Validação de CEP) */}
                {currentStep === 1 && (
                    <AddressStep 
                        onNext={() => setCurrentStep(2)} 
                        onBack={() => router.push("/#planos")} 
                    />
                )}

                {/* PASSO 2: DADOS PESSOAIS (Titular + Dependentes) */}
                {currentStep === 2 && (
                    <PersonalDataStep 
                        onNext={() => setCurrentStep(3)} 
                        onBack={() => setCurrentStep(1)} 
                    />
                )}

                {/* PASSO 3: PAGAMENTO (Resp. Financeiro + Forma de Pagamento) */}
                {currentStep === 3 && (
                    <PaymentStep 
                        onBack={() => setCurrentStep(2)} 
                    />
                )}
              </motion.div>
            </div>
          </div>

          {/* --- COLUNA DA DIREITA: RESUMO DO PEDIDO (STICKY) --- */}
          <div className="lg:col-span-5 xl:col-span-4">
            <div className="sticky top-24 space-y-6">
                
                {/* Card Resumo Calculado */}
                <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
                    <div className="bg-brand-wine/5 p-6 border-b border-brand-wine/10">
                        <h2 className="font-bold text-gray-900 text-lg mb-1">Resumo do Pedido</h2>
                        <p className="text-xs text-gray-500">Valores atualizados para você.</p>
                    </div>
                    
                    <div className="p-6 space-y-4">
                        {/* Item Selecionado */}
                        <div className="flex gap-4 items-start pb-4 border-b border-dashed border-gray-200">
                            <div className="h-12 w-12 rounded-lg bg-brand-wine/10 flex items-center justify-center shrink-0">
                                <ShieldCheck className="w-6 h-6 text-brand-wine" />
                            </div>
                            <div>
                                <h3 className="font-bold text-gray-900 text-sm">{selectedPlan.name}</h3>
                                <div className="flex items-center gap-2 mt-1">
                                    <span className="text-xs font-medium bg-gray-100 px-2 py-0.5 rounded text-gray-600">
                                        {financials.peopleCount} Beneficiário(s)
                                    </span>
                                    {billingCycle === 'yearly' && (
                                        <span className="text-[10px] font-bold bg-green-100 text-green-700 px-1.5 py-0.5 rounded">
                                            -10% OFF
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Detalhamento Financeiro */}
                        <div className="space-y-3 text-sm text-gray-600">
                            
                            {/* Mensalidade Unitária (Mostra desconto de volume se tiver) */}
                            <div className="flex justify-between">
                                <span>Mensalidade por pessoa</span>
                                <span className="font-medium">R$ {financials.baseFee.toFixed(2)}</span>
                            </div>

                            {/* Adesão */}
                            <div className="flex justify-between">
                                <span>Taxa de Adesão ({financials.peopleCount}x)</span>
                                <span className="font-medium">R$ {(financials.enrollmentFee * financials.peopleCount).toFixed(2)}</span>
                            </div>

                            {/* Pro-Rata (Lógica Específica para Mensal) */}
                            {billingCycle === 'monthly' && (
                                <div className="flex justify-between text-brand-wine bg-brand-wine/5 p-2 rounded-lg -mx-2">
                                    <span className="font-medium">Proporcional este mês (Pro-rata)</span>
                                    <span className="font-bold">R$ {financials.proRataAmount.toFixed(2)}</span>
                                </div>
                            )}

                            {/* Desconto Anual */}
                            {billingCycle === 'yearly' && (
                                <div className="flex justify-between text-green-600 bg-green-50 p-2 rounded-lg text-xs">
                                    <span>Desconto Anual Aplicado</span>
                                    <span className="font-bold">10%</span>
                                </div>
                            )}
                        </div>

                        {/* Totalizador */}
                        <div className="border-t border-gray-100 pt-4 mt-2">
                            <div className="flex justify-between items-end">
                                <div>
                                    <span className="text-gray-900 font-bold block">Total a pagar agora</span>
                                    <span className="text-[10px] text-gray-400">
                                        {billingCycle === 'yearly' ? 'Contrato anual + adesão' : 'Adesão + dias restantes'}
                                    </span>
                                </div>
                                <div className="text-right">
                                    <span className="text-3xl font-extrabold text-brand-wine tracking-tight">
                                        R$ {financials.totalDueNow.toFixed(2)}
                                    </span>
                                </div>
                            </div>
                            
                            {/* Previsão de Próximas Faturas (Só para Mensal) */}
                            {billingCycle === 'monthly' && (
                                <div className="mt-3 pt-3 border-t border-gray-50 text-right">
                                    <span className="text-xs text-gray-500">
                                        Próximas mensalidades: <strong>R$ {financials.monthlyTotal.toFixed(2)}</strong>
                                    </span>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="bg-gray-50 p-3 text-[10px] text-gray-400 text-center border-t border-gray-100">
                        Ao continuar, você concorda com os Termos da Uniodonto Goiânia.
                    </div>
                </div>

                {/* Badge de Segurança */}
                <div className="bg-blue-50 rounded-xl p-4 flex gap-3 items-start border border-blue-100">
                    <div className="bg-white p-1.5 rounded-full shrink-0 shadow-sm mt-0.5">
                        <Check className="w-3 h-3 text-blue-600" />
                    </div>
                    <div>
                        <p className="text-xs font-bold text-blue-900">Compra 100% Segura</p>
                        <p className="text-[10px] text-blue-700/80 mt-0.5 leading-snug">
                            Seus dados são protegidos por criptografia de ponta a ponta e processados em ambiente seguro.
                        </p>
                    </div>
                </div>

            </div>
          </div>

        </div>
      </main>
    </div>
  );
}