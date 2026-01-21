"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { CreditCard, Wallet, User, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { Switch } from "@/components/ui/switch"; // Se não tiver shadcn switch, usaremos input checkbox estilizado
import { cn } from "@/lib/utils";
import { getUserInfo } from "@/features/checkout/actions/get-user-info";
import { useCartStore } from "@/features/cart/store/cart-store";

// Schema para quando for OUTRA pessoa
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
  
  // Estados para busca de CPF do pagador
  const [isLoadingCpf, setIsLoadingCpf] = useState(false);
  const [cpfFeedback, setCpfFeedback] = useState<{ type: 'success' | 'error', msg: string } | null>(null);

  const { register, handleSubmit, setValue, getValues, formState: { errors, isSubmitting } } = useForm<PayerForm>({
    resolver: zodResolver(payerSchema),
    defaultValues: {
        fullName: payer.fullName || "",
        cpf: payer.cpf || "",
        email: payer.email || "",
        phone: payer.phone || ""
    }
  });

  // Busca Automática do CPF do Pagador
  const handleCpfBlur = async () => {
    const cpf = getValues("cpf");
    const cleanCpf = cpf?.replace(/\D/g, "") || "";

    if (cleanCpf.length !== 11) return;

    setIsLoadingCpf(true);
    setCpfFeedback(null);

    const result = await getUserInfo(cleanCpf);

    setIsLoadingCpf(false);

    if (result.success && result.data) {
        setValue("fullName", result.data.name);
        setCpfFeedback({ type: 'success', msg: `Cadastro encontrado: ${result.data.name}` });
    } else {
        setCpfFeedback({ type: 'error', msg: "CPF não encontrado. Preencha manualmente." });
    }
  };

  const onSubmit = async (data: PayerForm) => {
    // 1. Salva na store quem é o pagador
    if (isHolderPayer) {
        setPayer({ isHolder: true });
    } else {
        setPayer({ isHolder: false, ...data });
    }

    // 2. Simula o processamento final (Aqui entraria a integração com Gateway Cielo/Getnet)
    alert("Redirecionando para o Gateway de Pagamento...");
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
      <div className="p-4 rounded-xl border border-gray-200 bg-gray-50 flex items-center justify-between cursor-pointer"
           onClick={() => setIsHolderPayer(!isHolderPayer)}>
          <div className="flex flex-col">
              <span className="text-sm font-bold text-gray-900">O titular é o responsável financeiro?</span>
              <span className="text-xs text-gray-500">Se desmarcar, pediremos os dados do pagador.</span>
          </div>
          
          {/* Switch Visual Simples (CSS puro para não depender de libs extras agora) */}
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

      {/* Formulário do Pagador (Só aparece se NÃO for o titular) */}
      {!isHolderPayer && (
          <div className="p-5 border border-gray-200 rounded-2xl bg-white shadow-sm animate-in slide-in-from-top-2 fade-in">
              <div className="flex items-center gap-2 mb-4 text-brand-wine">
                  <User className="w-4 h-4" />
                  <span className="text-sm font-bold uppercase tracking-wide">Dados do Pagador</span>
              </div>

              <div className="space-y-4">
                  {/* CPF Pagador */}
                  <div className="space-y-1">
                      <label className="text-sm font-medium text-gray-700">CPF do Pagador</label>
                      <div className="relative">
                          <input 
                              {...register("cpf")}
                              onBlur={handleCpfBlur}
                              className={cn(
                                  "w-full p-3 rounded-lg border outline-none transition-all pr-10",
                                  errors.cpf ? "border-red-300 focus:ring-red-200" : "border-gray-300 focus:ring-brand-wine/20"
                              )}
                              placeholder="000.000.000-00"
                              maxLength={14}
                          />
                          {isLoadingCpf && (
                              <div className="absolute right-3 top-3.5">
                                  <Loader2 className="w-5 h-5 animate-spin text-brand-wine" />
                              </div>
                          )}
                      </div>
                      {cpfFeedback && (
                          <div className={cn("text-xs flex items-center gap-1.5 mt-1 font-medium", cpfFeedback.type === 'success' ? "text-green-600" : "text-orange-600")}>
                              {cpfFeedback.type === 'success' ? <CheckCircle2 className="w-3.5 h-3.5"/> : <AlertCircle className="w-3.5 h-3.5"/>}
                              {cpfFeedback.msg}
                          </div>
                      )}
                      {errors.cpf && <span className="text-xs text-red-500">{errors.cpf.message}</span>}
                  </div>

                  {/* Nome Completo */}
                  <div className="space-y-1">
                      <label className="text-sm font-medium text-gray-700">Nome Completo</label>
                      <input 
                          {...register("fullName")}
                          className="w-full p-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-brand-wine/20 outline-none"
                      />
                      {errors.fullName && <span className="text-xs text-red-500">{errors.fullName.message}</span>}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Email */}
                      <div className="space-y-1">
                          <label className="text-sm font-medium text-gray-700">E-mail Financeiro</label>
                          <input 
                              {...register("email")}
                              className="w-full p-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-brand-wine/20 outline-none"
                              placeholder="para envio da nota"
                          />
                          {errors.email && <span className="text-xs text-red-500">{errors.email.message}</span>}
                      </div>

                      {/* Telefone */}
                      <div className="space-y-1">
                          <label className="text-sm font-medium text-gray-700">Celular</label>
                          <input 
                              {...register("phone")}
                              className="w-full p-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-brand-wine/20 outline-none"
                          />
                          {errors.phone && <span className="text-xs text-red-500">{errors.phone.message}</span>}
                      </div>
                  </div>
              </div>
          </div>
      )}

      {/* Métodos de Pagamento (Mock Visual) */}
      <div className="space-y-4 pt-4">
          <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wide">Forma de Pagamento</h3>
          
          <div className="grid grid-cols-2 gap-4">
              <button 
                type="button"
                className="flex flex-col items-center justify-center p-4 border-2 border-brand-wine bg-brand-wine/5 rounded-xl transition-all"
              >
                  <CreditCard className="w-6 h-6 text-brand-wine mb-2" />
                  <span className="text-sm font-bold text-brand-wine">Cartão de Crédito</span>
              </button>
              
              <button 
                type="button"
                className="flex flex-col items-center justify-center p-4 border border-gray-200 hover:border-gray-300 rounded-xl transition-all opacity-60"
              >
                  <span className="text-2xl mb-1">📄</span>
                  <span className="text-sm font-medium text-gray-600">Boleto Bancário</span>
              </button>
          </div>
      </div>

      {/* Botões Finais */}
      <div className="pt-6 flex gap-4 border-t border-gray-100">
          <Button 
              type="button" 
              variant="outline"
              onClick={onBack}
              className="w-1/3 h-12 rounded-xl border-gray-200 text-gray-600 hover:bg-gray-50"
          >
              Voltar
          </Button>
          
          <Button 
              onClick={isHolderPayer ? () => onSubmit({} as any) : handleSubmit(onSubmit)}
              className="w-2/3 h-12 bg-green-600 hover:bg-green-700 text-white font-bold rounded-xl shadow-lg shadow-green-600/20 transition-all flex items-center justify-center gap-2"
          >
              {isSubmitting ? "Processando..." : "Finalizar Contratação"}
              {!isSubmitting && <CheckCircle2 className="w-5 h-5" />}
          </Button>
      </div>

    </div>
  );
}