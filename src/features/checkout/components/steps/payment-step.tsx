"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import {
  CalendarDays,
  CheckCircle,
  Copy,
  CreditCard,
  Loader2,
  RefreshCcw,
  Search,
  User,
  Wallet,
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

// ─── Types ────────────────────────────────────────────────────────────────────
type BillingCycle = "monthly" | "yearly";
type PaymentMethod = "credit_card" | "pix" | "recurring" | null;

const formSchema = z.object({
  // Dados do pagador (só quando diferente do titular)
  fullName: z.string().optional(),
  cpf: z.string().optional(),
  email: z.string().optional(),
  phone: z.string().optional(),
  // Cartão
  cardNumber: z.string().optional(),
  cardName: z.string().optional(),
  cardExpiration: z.string().optional(),
  cardCvv: z.string().optional(),
});

type FullForm = z.infer<typeof formSchema>;

interface PaymentStepProps {
  onBack: () => void;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
const PAYMENT_OPTIONS: Record<
  BillingCycle,
  { id: PaymentMethod; label: string; icon: React.ReactNode; badge?: string }[]
> = {
  monthly: [
    { id: "credit_card", label: "Cartão de Crédito", icon: <CreditCard className="w-7 h-7" /> },
    { id: "pix",         label: "Pix",               icon: <span className="text-2xl">💠</span> },
    { id: "recurring",   label: "Débito Recorrente",  icon: <RefreshCcw className="w-7 h-7" /> },
  ],
  yearly: [
    { id: "credit_card", label: "Cartão de Crédito", icon: <CreditCard className="w-7 h-7" />, badge: "até 12x" },
    { id: "pix",         label: "Pix",               icon: <span className="text-2xl">💠</span> },
  ],
};

// ─── Component ───────────────────────────────────────────────────────────────
export function PaymentStep({ onBack }: PaymentStepProps) {
  const { payer, setPayer, selectedPlan, billingCycle: storeCycle, dependentsCount, address, holder } = useCartStore();

  // A seleção de ciclo pode ser sobrescrita pelo usuário neste step
  const [cycle, setCycle] = useState<BillingCycle>(storeCycle as BillingCycle ?? "monthly");
  const [isHolderPayer, setIsHolderPayer] = useState(payer.isHolder);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(null);

  const {
    register,
    handleSubmit,
    setValue,
    getValues,
    formState: { errors, isSubmitting },
  } = useForm<FullForm>({
    resolver: zodResolver(formSchema),
  });
  // ── States Pix ──────────────────────────────────────────────────────────────
  const [pixData, setPixData] = useState<{ qrCode: string; image: string; value: number } | null>(null);
  const [copied, setCopied] = useState(false);

  const handleCopyPix = () => {
    if (pixData?.qrCode) {
      navigator.clipboard.writeText(pixData.qrCode);
      setCopied(true);
      toast.success("Código Copia e Cola copiado!");
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // ── CPF lookup ─────────────────────────────────────────────────────────────
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
    },
  });

  const handleCpfBlur = () => {
    const cpf = getValues("cpf");
    if (cpf?.replace(/\D/g, "").length === 11 && !cpfMutation.isPending) {
      cpfMutation.mutate(cpf);
    }
  };

  // ── Submit ─────────────────────────────────────────────────────────────────
  const onSubmit = async (data: FullForm) => {
    if (!paymentMethod) {
      toast.error("Selecione uma forma de pagamento");
      return;
    }
    if (!selectedPlan) {
      toast.error("Nenhum plano selecionado");
      return;
    }

    // Validate payer fields at runtime only when holder is NOT the payer
    if (!isHolderPayer) {
      if (!data.fullName || data.fullName.trim().length < 5) {
        toast.error("Nome completo inválido");
        return;
      }
      if (!data.cpf || data.cpf.replace(/\D/g, "").length !== 11) {
        toast.error("CPF inválido");
        return;
      }
      if (!data.email || !data.email.includes("@")) {
        toast.error("E-mail inválido");
        return;
      }
      if (!data.phone || data.phone.replace(/\D/g, "").length < 10) {
        toast.error("Telefone inválido");
        return;
      }
    }

    try {
      // Salva pagador na store
      if (isHolderPayer) {
        setPayer({ isHolder: true, cpf: holder?.cpf, phone: holder?.phone, email: holder?.email });
      } else {
        setPayer({ isHolder: false, ...data });
      }

      // Dados do cliente — usa holder do store quando titular = pagador
      const customerData = isHolderPayer
        ? {
            name: holder?.name || "Titular",
            cpf: holder?.cpf || "",
            email: holder?.email || "",
            phone: holder?.phone || "",
            cep: address?.cep || "74000000",
            street: address?.street || "",
            number: address?.number || "1",
            neighborhood: address?.neighborhood || "",
            city: address?.city || "",
            state: address?.uf || "",
          }
        : {
            name: data.fullName || "Titular",
            cpf: data.cpf?.replace(/\D/g, "") || "",
            email: data.email || "",
            phone: data.phone?.replace(/\D/g, "") || "",
            cep: address?.cep || "74000000",
            street: address?.street || "",
            number: address?.number || "1",
            neighborhood: address?.neighborhood || "",
            city: address?.city || "",
            state: address?.uf || "",
          };

      // Valor
      const pricing = calculateCheckout(selectedPlan.id, dependentsCount, cycle);
      const totalValueCents = Math.round(pricing.totalDueNow * 100);

      // Dados do cartão
      const buildCard = () => {
        const [expMonth, expYear] = (data.cardExpiration || "").split("/");
        return {
          name: data.cardName || "",
          number: (data.cardNumber || "").replace(/\D/g, ""),
          holder: data.cardName || "",
          expirationMonth: expMonth,
          expirationYear: `20${expYear}`,
          cvv: data.cardCvv || "",
        };
      };

      // Chama a action correta
      if (paymentMethod === "pix") {
        const { processPixPayment } = await import("@/features/checkout/actions/ecommerce-actions");
        const result = await processPixPayment({
          customer: customerData,
          plan: selectedPlan.name,
          value: totalValueCents,
        });
        if (result.success) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const trans = (result.data as any)?.Charge?.Transactions?.[0];
          const pixCode = trans?.Pix?.qrCode;
          const pixImage = trans?.Pix?.image || trans?.Pix?.imageQrcode;
          
          if (pixCode) {
            setPixData({
              qrCode: pixCode,
              image: pixImage,
              value: totalValueCents / 100
            });
            toast.success("Pix gerado com sucesso! Aguardando pagamento.", { duration: 8000 });
          } else {
            toast.error("Erro ao gerar Pix", { description: "QR Code não retornado pela API." });
          }
        } else {
          toast.error("Erro ao gerar Pix", { description: result.error });
        }

      } else if (paymentMethod === "credit_card") {
        const { processCreditCardPayment } = await import("@/features/checkout/actions/ecommerce-actions");
        const result = await processCreditCardPayment({
          customer: customerData,
          card: buildCard(),
          value: totalValueCents,
          numMonths: cycle === "yearly" ? 12 : 1,
          plan: selectedPlan.name,
        });
        if (result.success) {
          toast.success("Pagamento aprovado! Contrato em processamento.");
        } else {
          toast.error("Falha no pagamento", { description: result.error });
        }

      } else if (paymentMethod === "recurring") {
        const { processRecurringPayment } = await import("@/features/checkout/actions/ecommerce-actions");
        const result = await processRecurringPayment({
          customer: customerData,
          card: buildCard(),
          value: totalValueCents,
          plan: selectedPlan.name,
        });
        if (result.success) {
          toast.success("Assinatura recorrente criada com sucesso!");
        } else {
          toast.error("Falha ao criar recorrência", { description: result.error });
        }
      }
    } catch (error) {
      console.error(error);
      toast.error("Ocorreu um erro inesperado");
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  const needsCard = paymentMethod === "credit_card" || paymentMethod === "recurring";
  const submitLabel =
    paymentMethod === "recurring"
      ? "Contratar Recorrência"
      : paymentMethod === "pix"
      ? "Gerar Pix"
      : "Pagar e Finalizar";

  if (pixData) {
    return (
      <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500 text-center flex flex-col items-center">
        <div className="bg-green-100 p-4 rounded-full mb-4">
          <CheckCircle className="w-10 h-10 text-green-600" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900">Pedido Registrado!</h2>
        <p className="text-gray-500 max-w-sm">Escaneie o QR Code abaixo no seu aplicativo de banco para finalizar o pagamento e ativar seu plano.</p>
        
        {pixData.image && (
          <div className="bg-white p-4 border rounded-2xl shadow-sm inline-block">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={pixData.image} alt="QR Code Pix" className="w-56 h-56 object-contain" />
          </div>
        )}
        
        <h3 className="text-2xl font-bold text-gray-900">
          {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(pixData.value)}
        </h3>
        
        <div className="w-full max-w-sm space-y-2 mt-4">
          <p className="text-sm text-gray-500 font-medium">Ou utilize o Pix Copia e Cola:</p>
          <div className="flex bg-gray-50 border rounded-xl overflow-hidden shadow-sm">
            <input 
              type="text" 
              readOnly 
              value={pixData.qrCode} 
              className="bg-transparent flex-1 px-4 py-3 text-sm text-gray-600 outline-none truncate" 
            />
            <button 
              onClick={handleCopyPix} 
              className="p-3 bg-gray-100 hover:bg-gray-200 border-l transition-colors focus:ring-2 focus:ring-brand-wine focus:outline-none"
              title="Copiar código PIX"
            >
              {copied ? <CheckCircle className="w-5 h-5 text-green-600" /> : <Copy className="w-5 h-5 text-gray-600" />}
            </button>
          </div>
        </div>
        
        <Button onClick={() => setPixData(null)} variant="outline" className="mt-8 rounded-xl h-12 w-full max-w-sm">
           Voltar para formas de pagamento
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">

      {/* Cabeçalho */}
      <div className="flex items-center gap-3 mb-2">
        <div className="bg-brand-wine/10 p-2 rounded-full">
          <Wallet className="w-6 h-6 text-brand-wine" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-gray-900">Pagamento</h2>
          <p className="text-sm text-gray-500">Escolha o ciclo e a forma de pagamento.</p>
        </div>
      </div>

      {/* ── Seletor de Ciclo ── */}
      <div className="space-y-2">
        <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wide">Ciclo de cobrança</h3>
        <div className="grid grid-cols-2 gap-3">
          {(["monthly", "yearly"] as BillingCycle[]).map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => { setCycle(c); setPaymentMethod(null); }}
              className={cn(
                "p-4 rounded-2xl border-2 flex flex-col items-center gap-1 transition-all",
                cycle === c
                  ? "border-brand-wine bg-brand-wine/5"
                  : "border-gray-200 hover:border-brand-wine/40"
              )}
            >
              <CalendarDays className={cn("w-6 h-6", cycle === c ? "text-brand-wine" : "text-gray-400")} />
              <span className={cn("font-bold text-sm", cycle === c ? "text-brand-wine" : "text-gray-500")}>
                {c === "monthly" ? "Mensal" : "Anual"}
              </span>
              {c === "yearly" && (
                <span className="text-[10px] bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">
                  Economia de até 20%
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* ── Toggle: Titular é o pagador? ── */}
      <div
        className="group p-4 rounded-xl border border-gray-200 bg-gray-50 hover:bg-gray-100 cursor-pointer flex items-center justify-between"
        onClick={() => setIsHolderPayer(!isHolderPayer)}
      >
        <span className="text-sm font-bold text-gray-900">O titular é o responsável financeiro?</span>
        <div className={cn("w-12 h-6 rounded-full p-1 transition-colors", isHolderPayer ? "bg-brand-wine" : "bg-gray-300")}>
          <div className={cn("w-4 h-4 bg-white rounded-full shadow-sm transition-transform", isHolderPayer ? "translate-x-6" : "translate-x-0")} />
        </div>
      </div>

      {/* ── Dados do Titular (visível quando titular é o pagador) ── */}
      {isHolderPayer && (
        <div className="p-5 border border-brand-wine/20 rounded-2xl bg-brand-wine/5 space-y-2 animate-in slide-in-from-top-2">
          <h3 className="text-sm font-bold uppercase text-brand-wine flex gap-2">
            <User className="w-4 h-4 mt-0.5" /> Cobrança para o Titular
          </h3>
          {holder ? (
            <div className="space-y-0.5 text-sm text-gray-700">
              <p><span className="font-medium">Nome:</span> {holder.name}</p>
              <p><span className="font-medium">CPF:</span> {holder.cpf}</p>
              <p><span className="font-medium">E-mail:</span> {holder.email}</p>
              <p><span className="font-medium">Telefone:</span> {holder.phone}</p>
            </div>
          ) : (
            <p className="text-sm text-orange-600">Volte ao passo anterior e informe o CPF do titular.</p>
          )}
        </div>
      )}

      {/* ── Formulário do Pagador ── */}
      {!isHolderPayer && (
        <div className="p-6 border border-gray-200 rounded-2xl bg-white space-y-5">
          <h3 className="text-sm font-bold uppercase text-brand-wine flex gap-2">
            <User className="w-4 h-4 mt-0.5" /> Dados do Pagador
          </h3>

          <div className="space-y-1.5">
            <label className="text-sm text-gray-700">CPF</label>
            <div className="relative">
              <input
                {...register("cpf")}
                onBlur={handleCpfBlur}
                className="w-full p-3 pl-10 border rounded-lg"
                placeholder="000.000.000-00"
                maxLength={14}
              />
              <Search className="absolute left-3 top-3.5 w-4 h-4 text-gray-400" />
            </div>
            {errors.cpf && <span className="text-red-500 text-xs">{errors.cpf.message}</span>}
          </div>

          <div className="space-y-1.5">
            <label className="text-sm text-gray-700">Nome Completo</label>
            <input {...register("fullName")} className="w-full p-3 border rounded-lg" />
            {errors.fullName && <span className="text-red-500 text-xs">{errors.fullName.message}</span>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-sm text-gray-700">E-mail</label>
              <input {...register("email")} className="w-full p-3 border rounded-lg" />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm text-gray-700">Celular</label>
              <input {...register("phone")} className="w-full p-3 border rounded-lg" />
            </div>
          </div>
        </div>
      )}

      {/* ── Formas de Pagamento (condicionais por ciclo) ── */}
      <div className="space-y-4">
        <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wide">Forma de pagamento</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {PAYMENT_OPTIONS[cycle].map((opt) => (
            <button
              key={opt.id}
              type="button"
              onClick={() => setPaymentMethod(opt.id)}
              className={cn(
                "relative p-4 border-2 rounded-2xl flex flex-col items-center gap-2 transition-all",
                paymentMethod === opt.id
                  ? "border-brand-wine bg-brand-wine/5"
                  : "border-gray-200 hover:border-brand-wine/40"
              )}
            >
              {opt.badge && (
                <span className="absolute top-2 right-2 text-[10px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full font-medium">
                  {opt.badge}
                </span>
              )}
              <span className={cn(paymentMethod === opt.id ? "text-brand-wine" : "text-gray-400")}>
                {opt.icon}
              </span>
              <span className={cn("font-bold text-sm", paymentMethod === opt.id ? "text-brand-wine" : "text-gray-500")}>
                {opt.label}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* ── Formulário de Cartão (Crédito e Recorrente) ── */}
      {needsCard && (
        <div className="p-6 border border-gray-200 rounded-2xl bg-white space-y-4 animate-in slide-in-from-top-2">
          <h4 className="font-bold text-gray-900 border-b pb-2 flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-brand-wine" />
            Dados do Cartão
            {cycle === "yearly" && paymentMethod === "credit_card" && (
              <span className="ml-auto text-xs font-normal text-gray-500">Parcelado em até 12x</span>
            )}
          </h4>

          <div className="space-y-1.5">
            <label className="text-sm text-gray-700">Número do Cartão</label>
            <input {...register("cardNumber")} className="w-full p-3 border rounded-lg" placeholder="0000 0000 0000 0000" />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm text-gray-700">Nome no Cartão</label>
            <input {...register("cardName")} className="w-full p-3 border rounded-lg" placeholder="COMO IMPRESSO NO CARTÃO" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-sm text-gray-700">Validade (MM/AA)</label>
              <input {...register("cardExpiration")} className="w-full p-3 border rounded-lg" placeholder="MM/AA" maxLength={5} />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm text-gray-700">CVV</label>
              <input {...register("cardCvv")} className="w-full p-3 border rounded-lg" placeholder="123" maxLength={4} />
            </div>
          </div>
        </div>
      )}

      {/* ── Botões ── */}
      <div className="pt-4 flex gap-4">
        <Button
          type="button"
          variant="outline"
          onClick={onBack}
          disabled={isSubmitting}
          className="w-1/3 h-14 rounded-xl"
        >
          Voltar
        </Button>
        <Button
          onClick={handleSubmit(onSubmit)}
          disabled={isSubmitting || !paymentMethod}
          className="w-2/3 h-14 bg-green-600 hover:bg-green-700 text-white font-bold rounded-xl"
        >
          {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : submitLabel}
        </Button>
      </div>
    </div>
  );
}