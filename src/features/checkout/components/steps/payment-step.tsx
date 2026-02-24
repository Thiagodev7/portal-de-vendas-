"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import {
    CalendarDays,
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

const payerSchema = z.object({
  fullName: z.string().min(5, "Nome completo obrigatório"),
  cpf: z.string().min(11, "CPF inválido"),
  email: z.string().email("E-mail inválido"),
  phone: z.string().min(10, "Telefone inválido"),
});

const cardSchema = z.object({
  cardNumber: z.string().optional(),
  cardName: z.string().optional(),
  cardExpiration: z.string().optional(),
  cardCvv: z.string().optional(),
});

type FullForm = z.infer<typeof payerSchema> & z.infer<typeof cardSchema>;

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
  const { payer, setPayer, selectedPlan, billingCycle: storeCycle, dependentsCount } = useCartStore();

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
    resolver: zodResolver(payerSchema.merge(cardSchema)),
    defaultValues: {
      fullName: payer.fullName || "",
      cpf: payer.cpf || "",
      email: payer.email || "",
      phone: payer.phone || "",
    },
  });

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

    try {
      // Salva pagador na store
      isHolderPayer ? setPayer({ isHolder: true }) : setPayer({ isHolder: false, ...data });

      // Dados do cliente
      const customerData = {
        name: data.fullName || "Titular",
        cpf: data.cpf || "",
        email: data.email || "",
        phone: data.phone || "",
        cep: "74000000", // TODO: Pegar do step de endereço
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
          toast.success("Pix gerado com sucesso! Aguardando pagamento.", { duration: 8000 });
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