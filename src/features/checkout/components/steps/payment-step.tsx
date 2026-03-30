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
import { useEffect, useState } from "react";
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
type PaymentMethod = "credit_card" | "pix" | null;

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
  const [isRecurringCard, setIsRecurringCard] = useState(false);

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
  const [pixData, setPixData] = useState<{
    qrCode?: string;
    image?: string;
    value: number;
    paymentLink?: string;
    myId?: string;
    status?: string;
  } | null>(null);
  const [copied, setCopied] = useState(false);
  const [pixApproved, setPixApproved] = useState(false);
  const [datasysState, setDatasysState] = useState<"idle" | "sending" | "success" | "error">("idle");
  const [datasysError, setDatasysError] = useState<string | null>(null);

  const handleCopyPix = () => {
    if (pixData?.qrCode) {
      navigator.clipboard.writeText(pixData.qrCode);
      setCopied(true);
      toast.success("Código Copia e Cola copiado!");
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // Polling do status do Pix (e, quando disponível, captura status/aprovação)
  useEffect(() => {
    const myId = pixData?.myId;
    if (!myId) return;

    let cancelled = false;
    let interval: ReturnType<typeof setInterval> | null = null;

    const tick = async () => {
      try {
        const { getCelcoinTransactionStatus } = await import("@/features/checkout/actions/ecommerce-actions");
        const res = await getCelcoinTransactionStatus(myId);
        if (cancelled || !res.success) return;

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const tx = (res.data as any)?.Transactions?.[0];
        const status = tx?.status as string | undefined;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const charge = tx?.Charge as any | undefined;
        const paymentLink = charge?.paymentLink as string | undefined;

        setPixData((prev) =>
          prev
            ? {
                ...prev,
                status: status || prev.status,
                paymentLink: paymentLink || prev.paymentLink,
              }
            : prev
        );

        const normalized = (status || "").toLowerCase();
        const isPaid =
          normalized.includes("paid") ||
          normalized.includes("approved") ||
          normalized.includes("captured") ||
          normalized.includes("authorized") ||
          normalized.includes("payexternal");

        if (isPaid) {
          setPixApproved(true);
          toast.success("Pagamento Pix aprovado!");
          if (interval) clearInterval(interval);
        }
      } catch {
        // silencioso: não queremos spam de erro no polling
      }
    };

    tick();
    interval = setInterval(tick, 5000);

    return () => {
      cancelled = true;
      if (interval) clearInterval(interval);
    };
  }, [pixData?.myId]);

  // Após pagamento aprovado, envia inserção no DataSys via /datanext/insertClient
  useEffect(() => {
    const run = async () => {
      if (!pixApproved) return;
      if (datasysState !== "idle") return;
      if (!holder || !address || !selectedPlan) return;

      const contractId = Number(process.env.UNIODONTO_DATASYS_CONTRACT_ID);
      const planId = Number(process.env.UNIODONTO_DATASYS_PLAN_ID);
      if (!Number.isFinite(contractId) || !Number.isFinite(planId)) {
        setDatasysState("error");
        setDatasysError("Configuração ausente: IDs do contrato/plano do DataSys.");
        toast.error("Não foi possível finalizar", { description: "IDs do contrato/plano do DataSys não configurados." });
        return;
      }

      const toDdMmYyyy = (iso: string) => {
        const [y, m, d] = String(iso || "").split("-");
        if (!y || !m || !d) return "";
        return `${d}-${m}-${y}`;
      };

      const cpfDigits = holder.cpf.replace(/\D/g, "");
      const cepDigits = address.cep.replace(/\D/g, "");
      const phoneDigits = holder.phone.replace(/\D/g, "");
      const ddd = phoneDigits.slice(0, 2);
      const phone = phoneDigits.slice(2);

      setDatasysState("sending");
      setDatasysError(null);

      const payload = {
        pessoa_titular: {
          id_sexo: holder.sex === "M" ? 1 : 2,
          id_estado_civil: 6,
          nome: holder.name,
          data_nascimento: toDdMmYyyy(holder.birthDate),
          nome_mae: holder.motherName || "",
          nome_pai: "",
          cpf: cpfDigits,
          rg: "",
          rg_data_emissao: "",
          rg_orgao_emissor: "",
          cns: holder.cns || "",
          naturalde: "",
          observacao: "Inserção via e-vendas",
          id_origem: null,
        },
        endereco: {
          id_cidade: address.cityId ?? null,
          id_tipo_logradouro: address.streetTypeId ?? null,
          nome_cidade: address.city,
          sigla_uf: address.uf,
          cep: cepDigits,
          bairro: address.neighborhood,
          logradouro: address.street,
          numero: Number(address.number) || address.number,
          complemento: address.complement || "",
        },
        contato: [
          {
            id_meio_comunicacao: 1,
            ddd,
            descricao: phone,
            contato: "Telefone",
            nome_contato: holder.name,
          },
          {
            id_meio_comunicacao: 5,
            ddd: "",
            descricao: holder.email,
            contato: "E-mail",
            nome_contato: holder.name,
          },
        ],
        contrato: {
          id_contrato: contractId,
          id_plano: planId,
          id_tipo_cobranca: 8,
          dia_vencimento: 10,
          data_adesao_contratual: toDdMmYyyy(new Date().toISOString().slice(0, 10)),
          data_inicio_cobranca: toDdMmYyyy(new Date().toISOString().slice(0, 10)),
          data_adesao_plano: toDdMmYyyy(new Date().toISOString().slice(0, 10)),
          data_inicio_uso: toDdMmYyyy(new Date().toISOString().slice(0, 10)),
          observacao: `Inserção via ecommerce - ${selectedPlan.name}`,
          nro_proposta: "",
        },
      };

      const { insertDatasysClient } = await import("@/features/checkout/actions/ecommerce-actions");
      const res = await insertDatasysClient(payload);
      if (res.success) {
        setDatasysState("success");
        toast.success("Cadastro concluído! Seu plano está sendo ativado.");
      } else {
        setDatasysState("error");
        setDatasysError(res.error || "Erro ao inserir no DataSys");
        toast.error("Falha ao finalizar cadastro", { description: res.error });
      }
    };

    run();
  }, [pixApproved, datasysState, holder, address, selectedPlan]);

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
      const peopleCount = dependentsCount + 1;
      const enrollmentUnitCents = Math.round(pricing.enrollmentFee * 100);
      const monthlyUnitCents = Math.round(pricing.baseFee * 100);
      const numMonths = cycle === "yearly" ? 12 : 1;

      const username = process.env.UNIODONTO_ECOMMERCE_USERNAME || "uniodonto";

      // Chama a action correta
      if (paymentMethod === "pix") {
        const { processPixPayment } = await import("@/features/checkout/actions/ecommerce-actions");
        const result = await processPixPayment({
          username,
          customer: customerData,
          plan: selectedPlan.name,
          enrollment: enrollmentUnitCents,
          monthly: monthlyUnitCents,
          value: totalValueCents,
          numLives: peopleCount,
          numMonths,
        });
        if (result.success) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const trans = (result.data as any)?.Charge?.Transactions?.[0];
          const pixCode = trans?.Pix?.qrCode;
          const pixImage = trans?.Pix?.image || trans?.Pix?.imageQrcode;
          // Em alguns ambientes (ex: sandbox), a API retorna apenas `paymentLink` e não o QR/Copy&Paste.
          // Nesse caso, abrimos o link para o usuário concluir o Pix.
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const paymentLink = (result.data as any)?.Charge?.paymentLink;
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const myId = (result.data as any)?.Charge?.myId as string | undefined;
          
          if (pixCode) {
            setPixData({
              qrCode: pixCode,
              image: pixImage,
              value: totalValueCents / 100,
              myId,
            });
            toast.success("Pix gerado com sucesso! Aguardando pagamento.", { duration: 8000 });
          } else if (typeof paymentLink === "string" && paymentLink.length > 0) {
            setPixData({
              value: totalValueCents / 100,
              paymentLink,
              myId,
            });
            toast.success("Pix gerado. Escaneie o QR Code na tela.", { duration: 8000 });
          } else {
            toast.error("Erro ao gerar Pix", { description: "QR Code não retornado pela API." });
          }
        } else {
          toast.error("Erro ao gerar Pix", { description: result.error });
        }

      } else if (paymentMethod === "credit_card") {
        // Mensal permite optar por recorrência no cartão; anual permanece como cobrança parcelada/avulsa.
        if (cycle === "monthly" && isRecurringCard) {
          const { processRecurringPayment } = await import("@/features/checkout/actions/ecommerce-actions");
          const result = await processRecurringPayment({
            username,
            customer: customerData,
            value: totalValueCents,
            plan: selectedPlan.name,
            enrollment: enrollmentUnitCents,
            monthly: monthlyUnitCents,
            numLives: peopleCount,
            numMonths,
          });
          if (result.success) {
            toast.success("Cobrança recorrente criada com sucesso!");
          } else {
            toast.error("Falha ao criar recorrência", { description: result.error });
          }
        } else {
          const { processCreditCardPayment } = await import("@/features/checkout/actions/ecommerce-actions");
          const result = await processCreditCardPayment({
            username,
            customer: customerData,
            value: totalValueCents,
            plan: selectedPlan.name,
            enrollment: enrollmentUnitCents,
            monthly: monthlyUnitCents,
            numLives: peopleCount,
            numMonths,
          });
          if (result.success) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const link = (result.data as any)?.Charge?.PaymentMethodCreditCard?.Link?.url;
            if (typeof link === "string" && link.length > 0) {
              window.open(link, "_blank", "noopener,noreferrer");
              toast.success("Link de pagamento gerado. Abra a janela para concluir.");
            } else {
              toast.success("Link de pagamento gerado.");
            }
          } else {
            toast.error("Falha no pagamento", { description: result.error });
          }
        }
      }
    } catch (error) {
      console.error(error);
      toast.error("Ocorreu um erro inesperado");
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  // Cálculos prévios de preços para exibição
  const monthlyPricing = selectedPlan ? calculateCheckout(selectedPlan.id, dependentsCount, "monthly") : null;
  const yearlyPricing = selectedPlan ? calculateCheckout(selectedPlan.id, dependentsCount, "yearly") : null;
  const yearlySavings = (monthlyPricing?.monthlyTotal || 0) * 12 - (yearlyPricing?.annualTotal || 0);

  const formatBRL = (value: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);

  const needsCard = paymentMethod === "credit_card";
  const submitLabel =
    paymentMethod === "pix"
      ? "Gerar Pix"
      : paymentMethod === "credit_card" && cycle === "monthly" && isRecurringCard
      ? "Contratar Recorrência"
      : "Pagar e Finalizar";

  if (pixData) {
    return (
      <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500 text-center flex flex-col items-center">
        <div className="bg-green-100 p-4 rounded-full mb-4">
          <CheckCircle className="w-10 h-10 text-green-600" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900">Pedido Registrado!</h2>
        <p className="text-gray-500 max-w-sm">Escaneie o QR Code abaixo no seu aplicativo de banco para finalizar o pagamento e ativar seu plano.</p>
        
        {!!pixData.image && (
          <div className="bg-white p-4 border rounded-2xl shadow-sm inline-block">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={pixData.image} alt="QR Code Pix" className="w-56 h-56 object-contain" />
          </div>
        )}

        {!pixData.image && pixData.paymentLink && (
          <div className="w-full max-w-[420px] bg-white border rounded-2xl shadow-sm overflow-hidden">
            <iframe
              title="Pagamento Pix"
              src={pixData.paymentLink}
              className="w-full h-[520px]"
            />
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
              value={pixData.qrCode || ""} 
              className="bg-transparent flex-1 px-4 py-3 text-sm text-gray-600 outline-none truncate" 
            />
            <button 
              onClick={handleCopyPix} 
              disabled={!pixData.qrCode}
              className="p-3 bg-gray-100 hover:bg-gray-200 border-l transition-colors focus:ring-2 focus:ring-brand-wine focus:outline-none"
              title="Copiar código PIX"
            >
              {copied ? <CheckCircle className="w-5 h-5 text-green-600" /> : <Copy className="w-5 h-5 text-gray-600" />}
            </button>
          </div>
        </div>

        {pixData.status && (
          <p className={cn("text-sm font-medium", pixApproved ? "text-green-700" : "text-gray-600")}>
            Status: {pixApproved ? "Pagamento aprovado" : pixData.status}
          </p>
        )}

        {pixApproved && (
          <div className="w-full max-w-sm rounded-2xl border bg-white p-4 text-left space-y-2">
            <p className="text-sm font-bold text-gray-900">Finalizando seu cadastro</p>
            <p className="text-xs text-gray-500">
              Estamos registrando seus dados no DataSys para ativar o plano.
            </p>
            {datasysState === "sending" && (
              <div className="flex items-center gap-2 text-sm text-gray-700">
                <Loader2 className="w-4 h-4 animate-spin" /> Enviando dados…
              </div>
            )}
            {datasysState === "success" && (
              <div className="flex items-center gap-2 text-sm text-green-700">
                <CheckCircle className="w-4 h-4" /> Cadastro concluído com sucesso.
              </div>
            )}
            {datasysState === "error" && (
              <div className="text-sm text-red-600">
                Não conseguimos finalizar automaticamente.
                {datasysError ? <div className="text-xs text-red-500 mt-1">{datasysError}</div> : null}
              </div>
            )}
          </div>
        )}
        
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
                "p-4 rounded-2xl border-2 flex flex-col items-center justify-center gap-1 transition-all h-full",
                cycle === c
                  ? "border-brand-wine bg-brand-wine/5 shadow-sm"
                  : "border-gray-200 hover:border-brand-wine/40 bg-white"
              )}
            >
              <div className="flex items-center gap-2">
                <CalendarDays className={cn("w-5 h-5", cycle === c ? "text-brand-wine" : "text-gray-400")} />
                <span className={cn("font-bold text-sm", cycle === c ? "text-brand-wine" : "text-gray-600")}>
                  {c === "monthly" ? "Mensal" : "Anual"}
                </span>
              </div>
              
              <div className="text-center mt-1">
                {c === "monthly" && monthlyPricing && (
                  <span className={cn("text-lg font-bold block", cycle === c ? "text-brand-wine" : "text-gray-800")}>
                    {formatBRL(monthlyPricing.monthlyTotal)}<span className="text-xs font-normal text-gray-500">/mês</span>
                  </span>
                )}
                {c === "yearly" && yearlyPricing && (
                  <>
                    <span className={cn("text-lg font-bold block", cycle === c ? "text-brand-wine" : "text-gray-800")}>
                      {formatBRL(yearlyPricing.annualTotal)}<span className="text-xs font-normal text-gray-500">/ano</span>
                    </span>
                    {yearlySavings > 0 && (
                      <span className="inline-block mt-1 text-[10px] bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-bold">
                        Economia de {formatBRL(yearlySavings)}
                      </span>
                    )}
                  </>
                )}
              </div>
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
              onClick={() => { setPaymentMethod(opt.id); setPixData(null); }}
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

          {/* Recorrência no cartão (apenas mensal) */}
          {cycle === "monthly" && (
            <div
              className="group p-4 rounded-xl border border-gray-200 bg-gray-50 hover:bg-gray-100 cursor-pointer flex items-center justify-between"
              onClick={() => setIsRecurringCard((v) => !v)}
            >
              <div className="flex items-center gap-2">
                <RefreshCcw className={cn("w-4 h-4", isRecurringCard ? "text-brand-wine" : "text-gray-400")} />
                <span className="text-sm font-bold text-gray-900">Cobrança recorrente no cartão</span>
              </div>
              <div className={cn("w-12 h-6 rounded-full p-1 transition-colors", isRecurringCard ? "bg-brand-wine" : "bg-gray-300")}>
                <div className={cn("w-4 h-4 bg-white rounded-full shadow-sm transition-transform", isRecurringCard ? "translate-x-6" : "translate-x-0")} />
              </div>
            </div>
          )}

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