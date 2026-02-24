"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import {
  CreditCard,
  Loader2,
  Search,
  User,
  Wallet
} from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import * as z from "zod";

import { Button } from "@/components/ui/button";
import { useCartStore } from "@/features/cart/store/cart-store";
import { getUserInfo } from "@/features/checkout/actions/get-user-info";
import { calculateCheckout } from "@/features/checkout/services/pricing-engine";
import { cn } from "@/lib/utils";

// Schema de Validação (Zod)
const payerSchema = z.object({
  fullName: z.string().min(5, "Nome completo obrigatório"),
  cpf: z.string().min(11, "CPF inválido"),
  email: z.string().email("E-mail inválido"),
  phone: z.string().min(10, "Telefone inválido"),
});

type PayerForm = z.infer<typeof payerSchema>;

interface PaymentStepProps {
  onBack: () => void;
}

export function PaymentStep({ onBack }: PaymentStepProps) {
  const { payer, setPayer, selectedPlan, billingCycle, dependentsCount } = useCartStore();
  const [isHolderPayer, setIsHolderPayer] = useState(payer.isHolder);
  const [paymentMethod, setPaymentMethod] = useState<"credit_card" | "pix" | null>(null);

  const { 
    register, 
    handleSubmit, 
    setValue, 
    getValues, 
    formState: { errors, isSubmitting } 
  } = useForm<PayerForm & { 
    cardName?: string, 
    cardNumber?: string, 
    cardHolder?: string, 
    cardExpiration?: string, 
    cardCvv?: string 
  }>({
    resolver: zodResolver(payerSchema.extend({
        cardName: z.string().optional(),
        cardNumber: z.string().optional(),
        cardHolder: z.string().optional(),
        cardExpiration: z.string().optional(),
        cardCvv: z.string().optional(),
    })),
    defaultValues: {
        fullName: payer.fullName || "",
        cpf: payer.cpf || "",
        email: payer.email || "",
        phone: payer.phone || ""
    }
  });

  // --- REACT QUERY: Busca de CPF Inteligente ---
  const cpfMutation = useMutation({
    mutationFn: async (cpf: string) => {
      const cleanCpf = cpf.replace(/\D/g, "");
      if (cleanCpf.length !== 11) throw new Error("CPF Incompleto");
      return await getUserInfo(cleanCpf);
    },
    onSuccess: (result) => {
      if (result.success && result.data) {
        setValue("fullName", result.data.name);
        toast.success("Cadastro localizado!");
      }
    }
  });

  const handleCpfBlur = () => {
    const cpf = getValues("cpf");
    if (cpf?.replace(/\D/g, "").length === 11 && !cpfMutation.isPending) {
      cpfMutation.mutate(cpf);
    }
  };

  const onSubmit = async (data: any) => {
    if (!paymentMethod) {
        toast.error("Selecione uma forma de pagamento");
        return;
    }

    if (!selectedPlan) {
        toast.error("Nenhum plano selecionado");
        return;
    }

    try {
      // 1. Atualiza Store Global
      if (isHolderPayer) {
          setPayer({ isHolder: true });
      } else {
          setPayer({ isHolder: false, ...data });
      }

      // 2. Prepare Customer Data
      const customerData = isHolderPayer ? {
          // TODO: Pegar dados reais do titular da store ou step anterior
          name: data.fullName || "Titular Teste", 
          cpf: data.cpf || "12345678900",
          email: data.email || "titular@email.com",
          phone: data.phone || "11999999999",
          cep: "74000000" 
      } : {
          name: data.fullName,
          cpf: data.cpf,
          email: data.email,
          phone: data.phone,
          cep: "74000000" 
      };

      // Calculate Value
      // Assume planId is string in IPlan. If not, adjustments needed.
      const pricing = calculateCheckout(selectedPlan.id, dependentsCount, billingCycle);
      const totalValueCents = Math.round(pricing.totalDueNow * 100);

      // 3. Call Backend Action
      if (paymentMethod === "pix") {
          const { processPixPayment } = await import("@/features/checkout/actions/ecommerce-actions");
          const result = await processPixPayment({
              customer: customerData,
              plan: selectedPlan.name,
              value: totalValueCents,
          });
          
          if (result.success) {
              toast.success("Pix gerado com sucesso!");
              console.log("Pix Data:", result.data);
              // TODO: Mostrar QR Code
          } else {
              toast.error("Erro ao gerar Pix", { description: result.error });
          }
      } else if (paymentMethod === "credit_card") {
           const { processCreditCardPayment } = await import("@/features/checkout/actions/ecommerce-actions");
           const [expMonth, expYear] = (data.cardExpiration || "").split("/");
           
           const result = await processCreditCardPayment({
               customer: customerData,
               card: {
                   name: data.cardName || "",
                   number: (data.cardNumber || "").replace(/\D/g, ""),
                   holder: data.cardHolder || data.cardName || "",
                   expirationMonth: expMonth,
                   expirationYear: `20${expYear}`,
                   cvv: data.cardCvv || ""
               },
               value: totalValueCents,
               numMonths: billingCycle === 'yearly' ? 12 : 1
           });
           
           if (result.success) {
               toast.success("Pagamento Aprovado!");
           } else {
               toast.error("Falha no pagamento", { description: result.error });
           }
      }
      
    } catch (error) {
      console.error(error);
      toast.error("Ocorreu um erro inesperado");
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
      
      {/* Cabeçalho */}
      <div className="flex items-center gap-3 mb-2">
          <div className="bg-brand-wine/10 p-2 rounded-full">
              <Wallet className="w-6 h-6 text-brand-wine" />
          </div>
          <div>
              <h2 className="text-xl font-bold text-gray-900">Pagamento</h2>
              <p className="text-sm text-gray-500">Escolha a forma de pagamento e finalize.</p>
          </div>
      </div>

      {/* Toggle: Titular */}
      <div 
           className="group p-4 rounded-xl border border-gray-200 bg-gray-50 hover:bg-gray-100 cursor-pointer flex items-center justify-between"
           onClick={() => setIsHolderPayer(!isHolderPayer)}
      >
          <div className="flex flex-col">
              <span className="text-sm font-bold text-gray-900">O titular é o responsável financeiro?</span>
          </div>
          <div className={cn("w-12 h-6 rounded-full p-1 transition-colors", isHolderPayer ? "bg-brand-wine" : "bg-gray-300")}>
              <div className={cn("w-4 h-4 bg-white rounded-full shadow-sm transition-transform", isHolderPayer ? "translate-x-6" : "translate-x-0")} />
          </div>
      </div>

      {/* Formulário Pagador */}
      {!isHolderPayer && (
          <div className="p-6 border border-gray-200 rounded-2xl bg-white space-y-5">
             <h3 className="text-sm font-bold uppercase text-brand-wine flex gap-2"><User className="w-4 h-4" /> Dados do Pagador</h3>
             
             <div className="space-y-1.5">
                  <label>CPF</label>
                  <div className="relative">
                    <input {...register("cpf")} onBlur={handleCpfBlur} className="w-full p-3 pl-10 border rounded-lg" placeholder="000.000.000-00" maxLength={14} />
                    <Search className="absolute left-3 top-3.5 w-4 h-4 text-gray-400" />
                  </div>
                  {errors.cpf && <span className="text-red-500 text-xs">{errors.cpf.message}</span>}
             </div>
             
             <div className="space-y-1.5">
                 <label>Nome Completo</label>
                 <input {...register("fullName")} className="w-full p-3 border rounded-lg" />
                 {errors.fullName && <span className="text-red-500 text-xs">{errors.fullName.message}</span>}
             </div>
             
             <div className="grid grid-cols-2 gap-4">
                 <div className="space-y-1.5">
                    <label>E-mail</label>
                    <input {...register("email")} className="w-full p-3 border rounded-lg" />
                 </div>
                 <div className="space-y-1.5">
                    <label>Celular</label>
                    <input {...register("phone")} className="w-full p-3 border rounded-lg" />
                 </div>
             </div>
          </div>
      )}

      {/* Método de Pagamento */}
      <div className="space-y-4 pt-4">
          <h3 className="text-sm font-bold text-gray-900 uppercase">Forma de Pagamento</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <button 
                type="button"
                onClick={() => setPaymentMethod("credit_card")}
                className={cn("p-5 border-2 rounded-2xl flex flex-col items-center gap-2 transition-all", 
                    paymentMethod === "credit_card" ? "border-brand-wine bg-brand-wine/5" : "border-gray-200 hover:border-brand-wine/50")}
              >
                  <CreditCard className="w-8 h-8 text-brand-wine" />
                  <span className="font-bold text-brand-wine">Cartão de Crédito</span>
              </button>
              
              <button 
                type="button"
                onClick={() => setPaymentMethod("pix")}
                className={cn("p-5 border-2 rounded-2xl flex flex-col items-center gap-2 transition-all", 
                    paymentMethod === "pix" ? "border-brand-wine bg-brand-wine/5" : "border-gray-200 hover:border-brand-wine/50")}
              >
                  <span className="text-2xl">💠</span>
                  <span className="font-bold text-brand-wine">Pix</span>
              </button>
          </div>
          
          {/* Card Form */}
          {paymentMethod === "credit_card" && (
              <div className="p-6 border border-gray-200 rounded-2xl bg-white space-y-4 animate-in slide-in-from-top-2">
                  <h4 className="font-bold text-gray-900 border-b pb-2">Dados do Cartão</h4>
                  <div className="space-y-1.5">
                      <label>Número do Cartão</label>
                      <input {...register("cardNumber")} className="w-full p-3 border rounded-lg" placeholder="0000 0000 0000 0000" />
                  </div>
                  <div className="space-y-1.5">
                      <label>Nome no Cartão</label>
                      <input {...register("cardName")} className="w-full p-3 border rounded-lg" placeholder="COMO NO CARTAO" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                          <label>Validade (MM/AA)</label>
                          <input {...register("cardExpiration")} className="w-full p-3 border rounded-lg" placeholder="MM/AA" />
                      </div>
                      <div className="space-y-1.5">
                          <label>CVV</label>
                          <input {...register("cardCvv")} className="w-full p-3 border rounded-lg" placeholder="123" maxLength={4} />
                      </div>
                  </div>
              </div>
          )}
      </div>

      {/* Botão Finalizar */}
      <div className="pt-8 flex gap-4">
          <Button type="button" variant="outline" onClick={onBack} disabled={isSubmitting} className="w-1/3 h-14 rounded-xl">Voltar</Button>
          <Button 
              onClick={handleSubmit(onSubmit)}
              disabled={isSubmitting || !paymentMethod}
              className="w-2/3 h-14 bg-green-600 hover:bg-green-700 text-white font-bold rounded-xl"
          >
              {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : "Pagar e Finalizar"}
          </Button>
      </div>
    </div>
  );
}