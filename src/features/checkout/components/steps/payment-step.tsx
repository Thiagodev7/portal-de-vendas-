"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner"; // Feedback "delicioso"
import { 
  CreditCard, 
  Wallet, 
  User, 
  CheckCircle2, 
  AlertCircle, 
  Search, 
  Loader2 
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { getUserInfo } from "@/features/checkout/actions/get-user-info";
import { useCartStore } from "@/features/cart/store/cart-store";

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
  const { payer, setPayer } = useCartStore();
  const [isHolderPayer, setIsHolderPayer] = useState(payer.isHolder);

  const { 
    register, 
    handleSubmit, 
    setValue, 
    getValues, 
    formState: { errors, isSubmitting } 
  } = useForm<PayerForm>({
    resolver: zodResolver(payerSchema),
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
        // Preenchimento automático (Optimistic UI)
        setValue("fullName", result.data.name);
        
        toast.success("Cadastro localizado!", {
          description: `Olá, ${result.data.name.split(' ')[0]}. Seus dados foram preenchidos.`
        });
      } else {
        // Caso de uso: CPF válido, mas não existe na base legado (Permitir cadastro novo)
        toast.info("Novo cadastro identificado", {
          description: "Por favor, preencha seus dados manualmente para prosseguir."
        });
      }
    },
    onError: () => {
      toast.error("Erro na consulta", {
        description: "Não foi possível validar o CPF automaticamente. Tente novamente."
      });
    }
  });

  const handleCpfBlur = () => {
    const cpf = getValues("cpf");
    // Dispara a busca apenas se tiver 11 dígitos e não estiver buscando já
    if (cpf?.replace(/\D/g, "").length === 11 && !cpfMutation.isPending) {
      cpfMutation.mutate(cpf);
    }
  };

  const onSubmit = async (data: PayerForm) => {
    try {
      // 1. Atualiza Store Global
      if (isHolderPayer) {
          setPayer({ isHolder: true });
      } else {
          setPayer({ isHolder: false, ...data });
      }
      
      // 2. Simula Processamento de Pagamento com Feedback Visual (UX)
      const paymentPromise = new Promise(resolve => setTimeout(resolve, 2500));
      
      toast.promise(paymentPromise, {
        loading: 'Conectando ao gateway seguro...',
        success: 'Pagamento autorizado! Redirecionando...',
        error: 'Falha ao processar pagamento.'
      });

      await paymentPromise;
      
      // TODO: Aqui entraria o router.push('/sucesso') real
      console.log("Fluxo finalizado com sucesso. Payload:", isHolderPayer ? "Titular" : data);
      
    } catch (error) {
      console.error(error);
      toast.error("Ocorreu um erro inesperado");
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
      
      {/* Cabeçalho da Seção */}
      <div className="flex items-center gap-3 mb-2">
          <div className="bg-brand-wine/10 p-2 rounded-full">
              <Wallet className="w-6 h-6 text-brand-wine" />
          </div>
          <div>
              <h2 className="text-xl font-bold text-gray-900">Responsável Financeiro</h2>
              <p className="text-sm text-gray-500">Quem fará o pagamento das mensalidades?</p>
          </div>
      </div>

      {/* Toggle: Titular vs Outra Pessoa */}
      <div 
           className="group p-4 rounded-xl border border-gray-200 bg-gray-50 hover:bg-gray-100 hover:border-gray-300 transition-all cursor-pointer flex items-center justify-between select-none"
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

      {/* Formulário Condicional (com Animação) */}
      {!isHolderPayer && (
          <div className="p-6 border border-gray-200 rounded-2xl bg-white shadow-sm animate-in slide-in-from-top-2 fade-in duration-300">
              <div className="flex items-center gap-2 mb-6 text-brand-wine pb-4 border-b border-gray-100">
                  <User className="w-4 h-4" />
                  <span className="text-sm font-bold uppercase tracking-wide">Dados do Pagador</span>
              </div>

              <div className="space-y-5">
                  {/* Campo CPF com Feedback Visual Rico */}
                  <div className="space-y-1.5">
                      <label className="text-sm font-medium text-gray-700 flex justify-between items-center">
                        CPF do Pagador
                        {cpfMutation.isPending && (
                            <span className="text-xs text-brand-wine flex items-center gap-1 animate-pulse">
                                <Loader2 className="w-3 h-3 animate-spin" /> Buscando cadastro...
                            </span>
                        )}
                      </label>
                      <div className="relative group">
                          <input 
                              {...register("cpf")}
                              onBlur={handleCpfBlur}
                              disabled={cpfMutation.isPending}
                              className={cn(
                                  "w-full p-3 pl-10 rounded-lg border outline-none transition-all",
                                  errors.cpf 
                                    ? "border-red-300 focus:ring-red-200" 
                                    : "border-gray-300 focus:ring-2 focus:ring-brand-wine/10 focus:border-brand-wine"
                              )}
                              placeholder="000.000.000-00"
                              maxLength={14}
                          />
                          <Search className="absolute left-3 top-3.5 w-4 h-4 text-gray-400 group-focus-within:text-brand-wine transition-colors" />
                      </div>
                      
                      {/* Feedback de Sucesso/Info do React Query */}
                      {cpfMutation.data?.success && (
                          <div className="text-xs flex items-center gap-1.5 mt-1 font-medium text-green-600 bg-green-50 p-2 rounded-md border border-green-100">
                              <CheckCircle2 className="w-3.5 h-3.5"/>
                              Cadastro encontrado: {cpfMutation.data.data?.name}
                          </div>
                      )}
                      {cpfMutation.data?.success === false && (
                          <div className="text-xs flex items-center gap-1.5 mt-1 font-medium text-orange-600 bg-orange-50 p-2 rounded-md border border-orange-100">
                              <AlertCircle className="w-3.5 h-3.5"/>
                              {cpfMutation.data.message || "Preencha os dados manualmente."}
                          </div>
                      )}
                      
                      {errors.cpf && <span className="text-xs text-red-500 font-medium">{errors.cpf.message}</span>}
                  </div>

                  {/* Campo Nome (Skeleton Loading) */}
                  <div className="space-y-1.5">
                      <label className="text-sm font-medium text-gray-700">Nome Completo</label>
                      {cpfMutation.isPending ? (
                        <Skeleton className="h-[50px] w-full rounded-lg" />
                      ) : (
                        <input 
                            {...register("fullName")}
                            className={cn(
                                "w-full p-3 rounded-lg border outline-none transition-all",
                                errors.fullName ? "border-red-300" : "border-gray-300 focus:border-brand-wine focus:ring-2 focus:ring-brand-wine/10"
                            )}
                            placeholder="Nome igual ao documento"
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
                              placeholder="(00) 00000-0000"
                          />
                          {errors.phone && <span className="text-xs text-red-500">{errors.phone.message}</span>}
                      </div>
                  </div>
              </div>
          </div>
      )}

      {/* Seleção de Método de Pagamento */}
      <div className="space-y-4 pt-4">
          <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wide flex items-center gap-2">
            Forma de Pagamento
            <span className="text-[10px] font-normal text-gray-500 normal-case bg-gray-100 px-2 py-0.5 rounded-full border border-gray-200">Ambiente Seguro 🔒</span>
          </h3>
          
          <div className="grid grid-cols-2 gap-4">
              <button 
                type="button"
                className="group relative flex flex-col items-center justify-center p-5 border-2 border-brand-wine bg-brand-wine/5 rounded-2xl transition-all shadow-sm ring-1 ring-brand-wine/20 hover:shadow-md"
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
                className="flex flex-col items-center justify-center p-5 border border-dashed border-gray-300 rounded-2xl opacity-60 cursor-not-allowed bg-gray-50/50 hover:bg-gray-50"
              >
                  <span className="text-3xl mb-2 grayscale opacity-70">📄</span>
                  <span className="text-sm font-medium text-gray-500">Boleto Bancário</span>
                  <span className="text-[10px] text-gray-400 mt-1">Indisponível no momento</span>
              </button>
          </div>
      </div>

      {/* Rodapé com Ações */}
      <div className="pt-8 flex gap-4 border-t border-gray-100">
          <Button 
              type="button" 
              variant="outline"
              onClick={onBack}
              disabled={isSubmitting}
              className="w-1/3 h-14 text-base rounded-xl border-gray-200 text-gray-600 hover:bg-gray-50 hover:text-gray-900"
          >
              Voltar
          </Button>
          
          <Button 
              // Se for titular, submete vazio (pois dados ja existem). Se não, submete form.
              onClick={isHolderPayer ? () => onSubmit({} as any) : handleSubmit(onSubmit)}
              disabled={isSubmitting || (cpfMutation.isPending && !isHolderPayer)}
              className="w-2/3 h-14 text-base bg-green-600 hover:bg-green-700 text-white font-bold rounded-xl shadow-xl shadow-green-600/20 hover:shadow-green-600/30 transition-all flex items-center justify-center gap-2"
          >
              {isSubmitting ? (
                <>
                  Processando 
                  <Loader2 className="w-5 h-5 animate-spin ml-2" />
                </>
              ) : (
                <>
                  Finalizar Contratação 
                  <CheckCircle2 className="w-5 h-5 ml-1" />
                </>
              )}
          </Button>
      </div>

    </div>
  );
}