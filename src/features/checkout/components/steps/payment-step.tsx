"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useMutation } from "@tanstack/react-query"; // Power-up!
import { Button } from "@/components/ui/button";
import { CreditCard, Wallet, User, CheckCircle2, AlertCircle, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { getUserInfo } from "@/features/checkout/actions/get-user-info";
import { useCartStore } from "@/features/cart/store/cart-store";
import { Skeleton } from "@/components/ui/skeleton"; // Importando o Skeleton

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
  const { payer, setPayer } = useCartStore();
  const [isHolderPayer, setIsHolderPayer] = useState(payer.isHolder);

  const { register, handleSubmit, setValue, getValues, formState: { errors, isSubmitting } } = useForm<PayerForm>({
    resolver: zodResolver(payerSchema),
    defaultValues: {
        fullName: payer.fullName || "",
        cpf: payer.cpf || "",
        email: payer.email || "",
        phone: payer.phone || ""
    }
  });

  // --- REACT QUERY MUTATION ---
  // Gerencia o estado da busca de CPF de forma declarativa
  const cpfMutation = useMutation({
    mutationFn: async (cpf: string) => {
      const cleanCpf = cpf.replace(/\D/g, "");
      if (cleanCpf.length !== 11) throw new Error("CPF Incompleto");
      return await getUserInfo(cleanCpf);
    },
    onSuccess: (result) => {
      if (result.success && result.data) {
        setValue("fullName", result.data.name);
        // Opcional: focar no próximo campo
      }
    }
  });

  const handleCpfBlur = () => {
    const cpf = getValues("cpf");
    if (cpf?.replace(/\D/g, "").length === 11) {
      cpfMutation.mutate(cpf);
    }
  };

  const onSubmit = async (data: PayerForm) => {
    if (isHolderPayer) {
        setPayer({ isHolder: true });
    } else {
        setPayer({ isHolder: false, ...data });
    }
    // Simulação de ida ao Gateway
    await new Promise(resolve => setTimeout(resolve, 1500));
    alert("Redirecionando para ambiente seguro de pagamento...");
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
      
      {/* Cabeçalho */}
      <div className="flex items-center gap-3 mb-2">
          <div className="bg-brand-wine/10 p-2 rounded-full">
              <Wallet className="w-6 h-6 text-brand-wine" />
          </div>
          <div>
              <h2 className="text-xl font-bold text-gray-900">Responsável Financeiro</h2>
              <p className="text-sm text-gray-500">Quem fará o pagamento das mensalidades?</p>
          </div>
      </div>

      {/* Toggle: Sou o Titular vs Outra Pessoa */}
      <div 
           className="group p-4 rounded-xl border border-gray-200 bg-gray-50 hover:bg-gray-100 hover:border-gray-300 transition-all cursor-pointer flex items-center justify-between"
           onClick={() => setIsHolderPayer(!isHolderPayer)}
      >
          <div className="flex flex-col">
              <span className="text-sm font-bold text-gray-900">O titular é o responsável financeiro?</span>
              <span className="text-xs text-gray-500">Se desmarcar, pediremos os dados do pagador.</span>
          </div>
          
          <div className={cn(
              "w-12 h-6 rounded-full p-1 transition-colors duration-300 flex items-center",
              isHolderPayer ? "bg-brand-wine" : "bg-gray-300"
          )}>
              <div className={cn(
                  "w-4 h-4 bg-white rounded-full shadow-sm transition-transform duration-300",
                  isHolderPayer ? "translate-x-6" : "translate-x-0"
              )} />
          </div>
      </div>

      {/* Formulário do Pagador com SKELETON LOADING */}
      {!isHolderPayer && (
          <div className="p-6 border border-gray-200 rounded-2xl bg-white shadow-sm animate-in slide-in-from-top-2 fade-in">
              <div className="flex items-center gap-2 mb-6 text-brand-wine pb-4 border-b border-gray-100">
                  <User className="w-4 h-4" />
                  <span className="text-sm font-bold uppercase tracking-wide">Dados do Pagador</span>
              </div>

              <div className="space-y-5">
                  {/* CPF Pagador */}
                  <div className="space-y-1.5">
                      <label className="text-sm font-medium text-gray-700 flex justify-between">
                        CPF do Pagador
                        {cpfMutation.isPending && <span className="text-xs text-brand-wine animate-pulse">Buscando cadastro...</span>}
                      </label>
                      <div className="relative group">
                          <input 
                              {...register("cpf")}
                              onBlur={handleCpfBlur}
                              className={cn(
                                  "w-full p-3 pl-10 rounded-lg border outline-none transition-all",
                                  errors.cpf ? "border-red-300 focus:ring-red-200" : "border-gray-300 focus:ring-2 focus:ring-brand-wine/10 focus:border-brand-wine"
                              )}
                              placeholder="000.000.000-00"
                              maxLength={14}
                          />
                          <Search className="absolute left-3 top-3.5 w-4 h-4 text-gray-400 group-focus-within:text-brand-wine transition-colors" />
                      </div>
                      
                      {/* Feedback Visual do React Query */}
                      {cpfMutation.data?.success && (
                          <div className="text-xs flex items-center gap-1.5 mt-1 font-medium text-green-600 bg-green-50 p-2 rounded-md">
                              <CheckCircle2 className="w-3.5 h-3.5"/>
                              Cadastro encontrado: {cpfMutation.data.data?.name}
                          </div>
                      )}
                      {cpfMutation.data?.success === false && (
                          <div className="text-xs flex items-center gap-1.5 mt-1 font-medium text-orange-600 bg-orange-50 p-2 rounded-md">
                              <AlertCircle className="w-3.5 h-3.5"/>
                              {cpfMutation.data.message || "CPF não encontrado. Preencha manualmente."}
                          </div>
                      )}
                      {errors.cpf && <span className="text-xs text-red-500 font-medium">{errors.cpf.message}</span>}
                  </div>

                  {/* Nome Completo (Com Skeleton enquanto carrega) */}
                  <div className="space-y-1.5">
                      <label className="text-sm font-medium text-gray-700">Nome Completo</label>
                      {cpfMutation.isPending ? (
                        <Skeleton className="h-12 w-full rounded-lg" />
                      ) : (
                        <input 
                            {...register("fullName")}
                            className="w-full p-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-brand-wine/10 focus:border-brand-wine outline-none transition-all"
                        />
                      )}
                      {errors.fullName && <span className="text-xs text-red-500">{errors.fullName.message}</span>}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Email */}
                      <div className="space-y-1.5">
                          <label className="text-sm font-medium text-gray-700">E-mail Financeiro</label>
                          <input 
                              {...register("email")}
                              className="w-full p-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-brand-wine/10 focus:border-brand-wine outline-none transition-all"
                              placeholder="para envio da nota"
                          />
                          {errors.email && <span className="text-xs text-red-500">{errors.email.message}</span>}
                      </div>

                      {/* Telefone */}
                      <div className="space-y-1.5">
                          <label className="text-sm font-medium text-gray-700">Celular</label>
                          <input 
                              {...register("phone")}
                              className="w-full p-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-brand-wine/10 focus:border-brand-wine outline-none transition-all"
                          />
                          {errors.phone && <span className="text-xs text-red-500">{errors.phone.message}</span>}
                      </div>
                  </div>
              </div>
          </div>
      )}

      {/* Métodos de Pagamento (Visual Melhorado) */}
      <div className="space-y-4 pt-4">
          <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wide flex items-center gap-2">
            Forma de Pagamento
            <span className="text-[10px] font-normal text-gray-500 normal-case bg-gray-100 px-2 py-0.5 rounded-full">Ambiente Seguro</span>
          </h3>
          
          <div className="grid grid-cols-2 gap-4">
              <button 
                type="button"
                className="group relative flex flex-col items-center justify-center p-5 border-2 border-brand-wine bg-brand-wine/5 rounded-2xl transition-all shadow-sm ring-1 ring-brand-wine/20"
              >
                  <div className="absolute top-3 right-3">
                    <div className="h-4 w-4 bg-brand-wine rounded-full border-[3px] border-white shadow-sm" />
                  </div>
                  <CreditCard className="w-8 h-8 text-brand-wine mb-3 group-hover:scale-110 transition-transform" />
                  <span className="text-sm font-bold text-brand-wine">Cartão de Crédito</span>
                  <span className="text-[10px] text-brand-wine/70 mt-1">Aprovação imediata</span>
              </button>
              
              <button 
                type="button"
                disabled
                className="flex flex-col items-center justify-center p-5 border border-dashed border-gray-300 rounded-2xl opacity-50 cursor-not-allowed bg-gray-50"
              >
                  <span className="text-3xl mb-2 grayscale">📄</span>
                  <span className="text-sm font-medium text-gray-500">Boleto Bancário</span>
                  <span className="text-[10px] text-gray-400 mt-1">Indisponível no momento</span>
              </button>
          </div>
      </div>

      {/* Botões Finais */}
      <div className="pt-8 flex gap-4 border-t border-gray-100">
          <Button 
              type="button" 
              variant="outline"
              onClick={onBack}
              className="w-1/3 h-14 text-base rounded-xl border-gray-200 text-gray-600 hover:bg-gray-50"
          >
              Voltar
          </Button>
          
          <Button 
              onClick={isHolderPayer ? () => onSubmit({} as any) : handleSubmit(onSubmit)}
              disabled={isSubmitting}
              className="w-2/3 h-14 text-base bg-green-600 hover:bg-green-700 text-white font-bold rounded-xl shadow-xl shadow-green-600/20 hover:shadow-green-600/30 transition-all flex items-center justify-center gap-2"
          >
              {isSubmitting ? (
                <>Processando <span className="animate-pulse">...</span></>
              ) : (
                <>Finalizar Contratação <CheckCircle2 className="w-5 h-5 ml-1" /></>
              )}
          </Button>
      </div>

    </div>
  );
}