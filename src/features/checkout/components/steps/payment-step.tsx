"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import {
  AlertTriangle,
  BookOpen,
  CalendarDays,
  CheckCircle,
  Copy,
  CreditCard,
  Download,
  Loader2,
  Mail,
  PartyPopper,
  Search,
  ShieldCheck,
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

// ─── Detecta menor de 18 anos a partir da data ISO (YYYY-MM-DD) ─────────────────
function isHolderMinor(birthDateIso: string | undefined): boolean {
  if (!birthDateIso) return false;
  const [y, m, d] = birthDateIso.split("-").map(Number);
  if (!y || !m || !d) return false;
  const today = new Date();
  const birth = new Date(y, m - 1, d);
  let age = today.getFullYear() - birth.getFullYear();
  const diff = today.getMonth() - birth.getMonth();
  if (diff < 0 || (diff === 0 && today.getDate() < birth.getDate())) age--;
  return age < 18;
}

// ─── IDs DataSys agora vêm direto do plano selecionado (selectedPlan.nroContrato / datasysPlanId)
// Fonte original: integrador/prod/datanext/utils/jsonUtil.js (getPlanCod / getContractCod)
// Os IDs são populados no IPlan via mock-plans.ts ou via backend /database/valoresContrato

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
  const { payer, setPayer, selectedPlan, billingCycle: storeCycle, dependentsCount, address, holder, setBillingCycle, uploadedDocuments } = useCartStore();

  // A seleção de ciclo pode ser sobrescrita pelo usuário neste step
  const [cycle, setCycle] = useState<BillingCycle>(storeCycle as BillingCycle ?? "monthly");

  // Detecta se o titular é menor de idade — nesse caso o titular não pode ser o pagador
  const holderIsMinor = isHolderMinor(holder?.birthDate);

  const [isHolderPayer, setIsHolderPayer] = useState(holderIsMinor ? false : payer.isHolder);
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
  const [pixData, setPixData] = useState<{
    qrCode?: string;
    image?: string;
    value: number;
    paymentLink?: string;
    myId?: string;
    status?: string;
  } | null>(null);
  const [copied, setCopied] = useState(false);
  const [paymentApproved, setPaymentApproved] = useState(false);
  const [datasysState, setDatasysState] = useState<"idle" | "sending" | "success" | "error">("idle");
  const [datasysError, setDatasysError] = useState<string | null>(null);
  const [memberCardNumber, setMemberCardNumber] = useState<string | null>(null);
  const [idPessoa, setIdPessoa] = useState<number | null>(null);
  const [emailState, setEmailState] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [docsUploadState, setDocsUploadState] = useState<"idle" | "uploading" | "done" | "error">("idle");
  const [nroProposta, setNroProposta] = useState<number | null>(null);

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
          setPaymentApproved(true);
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

  // Após pagamento aprovado: 1) Cria proposta no banco  2) Envia inserção no DataSys
  useEffect(() => {
    const run = async () => {
      if (!paymentApproved) return;
      if (datasysState !== "idle") return;
      if (!holder || !address || !selectedPlan) return;

      // IDs do banco (para proposta)
      const dbNroContrato = selectedPlan.nroContrato;
      // IDs DataSys (para insertClient)
      const datasysContractId = selectedPlan.datasysContractId;
      const datasysPlanId = selectedPlan.datasysPlanId;
      if (!dbNroContrato || !datasysContractId || !datasysPlanId) {
        setDatasysState("error");
        setDatasysError(`Plano "${selectedPlan.id}" não possui IDs completos (nroContrato/datasysContractId/datasysPlanId).`);
        toast.error("Não foi possível finalizar", { description: `Plano sem IDs: ${selectedPlan.id}` });
        return;
      }

      const cpfDigits = holder.cpf.replace(/\D/g, "");
      const cepDigits = address.cep.replace(/\D/g, "");
      const phoneDigits = holder.phone.replace(/\D/g, "");
      const ddd = phoneDigits.slice(0, 2);
      const phone = phoneDigits.slice(2);

      // ── 1. Cria a proposta no banco (aparece no dashboard) ──────────────
      try {
        const { createWebProposal } = await import("@/features/checkout/actions/ecommerce-actions");
        const pricing = calculateCheckout(selectedPlan.id, dependentsCount, cycle);

        const propostaRes = await createWebProposal({
          titular: { cpf: cpfDigits, estado_civil: 6 },
          responsavel_financeiro: !isHolderPayer && payer.cpf
            ? { cpf: payer.cpf.replace(/\D/g, ""), estado_civil: 6 }
            : null,
          plano: {
            nro_contrato: dbNroContrato,
            id_plano: datasysPlanId,
            is_anual: cycle === "yearly",
            dia_vencimento: 10,
          },
          endereco: {
            cep: cepDigits,
            numero: address.number,
            complemento: address.complement || "",
            logradouro: address.street,
            bairro: address.neighborhood,
            nome_cidade: address.city,
            sigla_uf: address.uf,
          },
          contatos: [
            { meio_comunicacao_id: 1, descricao: phone, nome_contato: holder.name },
            { meio_comunicacao_id: 5, descricao: holder.email, nome_contato: holder.name },
          ],
          valor_venda: pricing.totalDueNow,
          forma_pagamento: pixData ? "pix" : "credit_card",
          gateway_pagamento_id: pixData?.myId || undefined,
        });

        if (propostaRes.success) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const nro = (propostaRes.data as any)?.nro_proposta;
          if (nro) {
            setNroProposta(Number(nro));
            console.log("[Checkout] Proposta criada:", nro);

            // Marca pagamento como concluído
            const { updateProposalStatus: updateStatus } = await import("@/features/checkout/actions/ecommerce-actions");
            await updateStatus(Number(nro), { pagamentoConcluido: true });
          }
        } else {
          console.error("[Checkout] Falha ao criar proposta:", propostaRes.error);
        }
      } catch (err) {
        console.error("[Checkout] Erro ao criar proposta:", err);
      }

      // ── 2. Integração DataSys ──────────────────────────────────────────
      setDatasysState("sending");
      setDatasysError(null);

      const toDdMmYyyy = (iso: string) => {
        const [y, m, d] = String(iso || "").split("-");
        if (!y || !m || !d) return "";
        return `${d}-${m}-${y}`;
      };

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
          id_contrato: datasysContractId,
          id_plano: datasysPlanId,
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
        // Tenta capturar o número da carteirinha retornado pelo DataSys
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const d = res.data as any;
        const cardNum =
          d?.titular?.id_pessoa_contrato ||
          d?.titular?.id_pessoa_contrato_titular ||
          d?.id_pessoa_contrato ||
          null;
        // Captura id_pessoa para o upload de documentos
        const idPessoaVal =
          d?.titular?.id_pessoa ||
          d?.id_pessoa ||
          null;
        if (cardNum) setMemberCardNumber(String(cardNum));
        if (idPessoaVal) setIdPessoa(Number(idPessoaVal));
        setDatasysState("success");
        toast.success("Bem-vindo à Uniodonto Goiânia! Seu plano está ativo.");

        // Atualiza proposta com dados do DataSys
        if (nroProposta) {
          const { updateProposalIntegration } = await import("@/features/checkout/actions/ecommerce-actions");
          await updateProposalIntegration(nroProposta, {
            datasys_status: "sucesso",
            datasys_id_pessoa: idPessoaVal ? Number(idPessoaVal) : undefined,
            datasys_carteirinha: cardNum ? String(cardNum) : undefined,
            log_entry: { event: "datasys_ok", detail: "Inserção DataSys concluída" },
          });
        }
      } else {
        setDatasysState("error");
        setDatasysError(res.error || "Erro ao inserir no DataSys");
        toast.error("Falha ao finalizar cadastro", { description: res.error });

        // Registra erro na proposta
        if (nroProposta) {
          const { updateProposalIntegration } = await import("@/features/checkout/actions/ecommerce-actions");
          await updateProposalIntegration(nroProposta, {
            datasys_status: "erro",
            log_entry: { event: "datasys_error", detail: res.error || "Erro DataSys" },
          });
        }
      }
    };

    run();
  }, [paymentApproved, datasysState, holder, address, selectedPlan]);

  // Após cadastro no DataSys confirmado, envia os documentos ao DataSys
  useEffect(() => {
    const sendDocs = async () => {
      if (datasysState !== "success") return;
      if (docsUploadState !== "idle") return;
      if (!idPessoa && uploadedDocuments.length === 0) return;
      if (uploadedDocuments.length === 0) return;
      if (!idPessoa) {
        // id_pessoa não veio na resposta — tenta usar memberCardNumber como fallback
        console.warn("[DocumentUpload] id_pessoa não disponível, pulando envio de documentos.");
        setDocsUploadState("done");
        return;
      }

      setDocsUploadState("uploading");
      try {
        const { uploadBeneficiaryDocuments } = await import("@/features/checkout/actions/upload-documents");
        const { results, allSuccess } = await uploadBeneficiaryDocuments(idPessoa, uploadedDocuments);
        setDocsUploadState(allSuccess ? "done" : "error");
        const failed = results.filter((r) => !r.success);
        if (allSuccess) {
          toast.success("Documentos enviados com sucesso!");
          // Atualiza proposta: documentos enviados
          if (nroProposta) {
            const { updateProposalIntegration } = await import("@/features/checkout/actions/ecommerce-actions");
            await updateProposalIntegration(nroProposta, {
              documentos_enviados: true,
              log_entry: { event: "docs_uploaded", detail: `${results.length} documento(s) enviado(s)` },
            });
          }
        } else {
          toast.warning(
            `${results.length - failed.length}/${results.length} documentos enviados.`,
            { description: failed.map((f) => f.label).join(", ") }
          );
        }
      } catch {
        setDocsUploadState("error");
      }
    };
    sendDocs();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [datasysState, idPessoa]);

  // Após cadastro no DataSys confirmado, envia e-mail de boas-vindas com o manual
  useEffect(() => {
    const sendEmail = async () => {
      if (datasysState !== "success") return;
      if (emailState !== "idle") return;
      if (!holder?.email) return;

      setEmailState("sending");
      // try {
      //   const { sendWelcomeEmail } = await import("@/features/checkout/actions/send-welcome-email");
      //   // const result = await sendWelcomeEmail({
      //   //   toEmail: holder.email,
      //   //   holderName: holder.name,
      //   //   planName: selectedPlan?.name || "",
      //   //   memberCard: memberCardNumber,
      //   // });
      //   setEmailState(result.success ? "sent" : "error");
      // } catch {
      //   setEmailState("error");
      // }
    };

    sendEmail();
  }, [datasysState, emailState, holder, selectedPlan, memberCardNumber]);

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
        setPayer({ 
          isHolder: true, 
          fullName: holder?.name, 
          cpf: holder?.cpf ?? "", 
          phone: holder?.phone ?? "", 
          email: holder?.email ?? "" 
        });
      } else {
        setPayer({ 
          isHolder: false, 
          fullName: data.fullName, 
          cpf: data.cpf, 
          phone: data.phone, 
          email: data.email 
        });
      }

      // Dados do cliente — usa holder do store quando titular = pagador
      const customerData = isHolderPayer
        ? {
            name: holder?.name || "Titular",
            cpf: (holder?.cpf || "").replace(/\D/g, ""),
            email: holder?.email || "",
            phone: (holder?.phone || "").replace(/\D/g, ""),
            cep: (address?.cep || "74000000").replace(/\D/g, ""),
          }
        : {
            name: data.fullName || "Titular",
            cpf: data.cpf?.replace(/\D/g, "") || "",
            email: data.email || "",
            phone: data.phone?.replace(/\D/g, "") || "",
            cep: (address?.cep || "74000000").replace(/\D/g, ""),
          };

      // Valores financeiros
      const pricing = calculateCheckout(selectedPlan.id, dependentsCount, cycle);
      const totalValueCents   = Math.round(pricing.totalDueNow * 100);
      const numMonths = cycle === "yearly" ? 12 : 1;

      // Dados do cartão — parse MM/AA ou MM/AAAA
      const parseExpiration = (raw: string | undefined) => {
        const clean = (raw || "").replace(/\s/g, "");
        const match = clean.match(/^(\d{1,2})[/]?(\d{2,4})$/);
        if (!match) return { expirationMonth: "", expirationYear: "" };
        const month = match[1].padStart(2, "0");
        const year  = match[2].length === 2 ? `20${match[2]}` : match[2];
        return { expirationMonth: month, expirationYear: year };
      };
      const { expirationMonth, expirationYear } = parseExpiration(data.cardExpiration);
      const cardData = {
        number:          (data.cardNumber || "").replace(/\s/g, ""),
        holder:          data.cardName || "",
        expirationMonth,
        expirationYear,
        cvv:             data.cardCvv || "",
      };

      // ── Chama a action correta ──────────────────────────────────────────────
      if (paymentMethod === "pix") {
        const { processPixPayment } = await import("@/features/checkout/actions/ecommerce-actions");
        const result = await processPixPayment({
          customer: customerData,
          value: totalValueCents,
          plan: selectedPlan.name,
        });

        if (result.success) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const d = result.data as any;
          // O ecommerce_service retorna o objeto da GalaxPay diretamente
          const pixCode     = d?.PaymentMethodPix?.qrCode    ?? d?.Charge?.Transactions?.[0]?.Pix?.qrCode;
          const pixImage    = d?.PaymentMethodPix?.imagemQrcode ?? d?.Charge?.Transactions?.[0]?.Pix?.image;
          const paymentLink = d?.paymentLink                 ?? d?.Charge?.paymentLink;
          const myId        = (d?.myId ?? d?.Charge?.myId)  as string | undefined;

          if (pixCode) {
            setPixData({ qrCode: pixCode, image: pixImage, value: totalValueCents / 100, myId });
            toast.success("Pix gerado com sucesso! Aguardando pagamento.", { duration: 8000 });
          } else if (typeof paymentLink === "string" && paymentLink.length > 0) {
            setPixData({ value: totalValueCents / 100, paymentLink, myId });
            toast.success("Pix gerado. Escaneie o QR Code na tela.", { duration: 8000 });
          } else {
            toast.error("Erro ao gerar Pix", { description: "QR Code não retornado pela API." });
          }
        } else {
          toast.error("Erro ao gerar Pix", { description: result.error });
        }

      } else if (paymentMethod === "credit_card") {
        {
          // ── Avulso / Parcelado (anual ou mensal)
          const { processCreditCardPayment } = await import("@/features/checkout/actions/ecommerce-actions");
          const result = await processCreditCardPayment({
            customer:     customerData,
            card:         cardData,
            value:        totalValueCents,
            plan:         selectedPlan.name,
            installments: numMonths,
            numMonths,
          });
          if (result.success) {
            toast.success("Pagamento aprovado! Finalizando seu cadastro…");
            setPaymentApproved(true); // dispara o fluxo DataSys igual ao Pix
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
      : "Pagar e Finalizar";

  // ── Tela de Boas-Vindas (pós cadastro DataSys aprovado) ───────────────────
  if (datasysState === "success") {
    return (
      <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">

        {/* Header comemorativo */}
        <div className="text-center space-y-3">
          <div className="flex justify-center">
            <div className="bg-gradient-to-br from-brand-wine to-brand-wine/70 p-5 rounded-full shadow-lg">
              <PartyPopper className="w-10 h-10 text-white" />
            </div>
          </div>
          <h2 className="text-2xl font-bold text-gray-900">Bem-vindo à Uniodonto Goiânia!</h2>
          <p className="text-gray-500 text-sm max-w-sm mx-auto">
            Seu plano foi ativado com sucesso. Abaixo estão as informações do seu cadastro.
          </p>
        </div>

        {/* Card da Carteirinha */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-brand-wine via-brand-wine/90 to-brand-wine/70 p-6 text-white shadow-xl">
          <div className="absolute top-0 right-0 w-40 h-40 bg-white/5 rounded-full -translate-y-16 translate-x-16" />
          <div className="absolute bottom-0 left-0 w-32 h-32 bg-white/5 rounded-full translate-y-12 -translate-x-12" />
          <div className="relative space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-6 h-6 text-white/80" />
                <span className="text-xs font-bold uppercase tracking-widest text-white/70">Uniodonto Goiânia</span>
              </div>
              <span className="text-xs bg-white/20 px-2 py-1 rounded-full font-medium">{selectedPlan?.name}</span>
            </div>
            <div>
              <p className="text-xs text-white/60 mb-1">Beneficiário Titular</p>
              <p className="text-lg font-bold">{holder?.name || "—"}</p>
            </div>
            {memberCardNumber ? (
              <div>
                <p className="text-xs text-white/60 mb-1">Nº da Carteirinha</p>
                <p className="text-2xl font-mono font-bold tracking-widest">{memberCardNumber}</p>
              </div>
            ) : (
              <div>
                <p className="text-xs text-white/60 mb-1">Nº da Carteirinha</p>
                <p className="text-sm text-white/80 italic">Será enviado por e-mail em breve</p>
              </div>
            )}
          </div>
        </div>

        {/* Status do E-mail de Boas-Vindas */}
        <div className={cn(
          "rounded-2xl border p-4 flex items-center gap-3 transition-all",
          emailState === "sent"
            ? "border-green-200 bg-green-50"
            : emailState === "error"
            ? "border-red-200 bg-red-50"
            : "border-blue-200 bg-blue-50"
        )}>
          <div className={cn(
            "p-2 rounded-full shrink-0",
            emailState === "sent" ? "bg-green-100" : emailState === "error" ? "bg-red-100" : "bg-blue-100"
          )}>
            {emailState === "sending" ? (
              <Loader2 className="w-4 h-4 text-blue-600 animate-spin" />
            ) : emailState === "sent" ? (
              <Mail className="w-4 h-4 text-green-600" />
            ) : emailState === "error" ? (
              <Mail className="w-4 h-4 text-red-500" />
            ) : (
              <Mail className="w-4 h-4 text-blue-600" />
            )}
          </div>
          <div>
            {emailState === "sending" && (
              <>
                <p className="text-sm font-bold text-blue-900">Enviando e-mail de boas-vindas…</p>
                <p className="text-xs text-blue-700">Aguarde, estamos enviando o Manual do Cliente para {holder?.email}</p>
              </>
            )}
            {emailState === "sent" && (
              <>
                <p className="text-sm font-bold text-green-800">E-mail enviado com sucesso! 📬</p>
                <p className="text-xs text-green-700">O Manual do Cliente foi enviado para <strong>{holder?.email}</strong></p>
              </>
            )}
            {emailState === "error" && (
              <>
                <p className="text-sm font-bold text-red-800">Falha ao enviar e-mail</p>
                <p className="text-xs text-red-600">Não foi possível enviar automaticamente. Baixe o manual abaixo.</p>
              </>
            )}
            {emailState === "idle" && (
              <p className="text-sm text-blue-700">Preparando envio do e-mail de boas-vindas…</p>
            )}
          </div>
        </div>

        {/* Status do Envio de Documentos */}
        {uploadedDocuments.length > 0 && (
          <div className={cn(
            "rounded-2xl border p-4 flex items-center gap-3 transition-all",
            docsUploadState === "done"
              ? "border-green-200 bg-green-50"
              : docsUploadState === "error"
              ? "border-red-200 bg-red-50"
              : "border-amber-200 bg-amber-50"
          )}>
            <div className={cn(
              "p-2 rounded-full shrink-0",
              docsUploadState === "done" ? "bg-green-100" : docsUploadState === "error" ? "bg-red-100" : "bg-amber-100"
            )}>
              {docsUploadState === "uploading" ? (
                <Loader2 className="w-4 h-4 text-amber-600 animate-spin" />
              ) : docsUploadState === "done" ? (
                <CheckCircle className="w-4 h-4 text-green-600" />
              ) : docsUploadState === "error" ? (
                <AlertTriangle className="w-4 h-4 text-red-500" />
              ) : (
                <Loader2 className="w-4 h-4 text-amber-600 animate-spin" />
              )}
            </div>
            <div>
              {docsUploadState === "uploading" && (
                <p className="text-sm font-bold text-amber-900">Enviando seus documentos ao sistema…</p>
              )}
              {docsUploadState === "done" && (
                <p className="text-sm font-bold text-green-800">Documentos registrados com sucesso! ✅</p>
              )}
              {docsUploadState === "error" && (
                <>
                  <p className="text-sm font-bold text-red-800">Falha no envio de documentos</p>
                  <p className="text-xs text-red-600">Entre em contato: documentos@uniodonto.com.br</p>
                </>
              )}
              {docsUploadState === "idle" && (
                <p className="text-sm text-amber-800">Aguardando confirmação para enviar documentos…</p>
              )}
            </div>
          </div>
        )}

        {/* Download do Manual */}
        <a href="/MANUAL_DO_CLIENTE.pdf" download="Manual_do_Cliente_Uniodonto.pdf"
          className="flex items-center gap-3 w-full rounded-2xl border-2 border-brand-wine/30 bg-brand-wine/5 p-4 hover:bg-brand-wine/10 hover:border-brand-wine/60 transition-all group">
          <div className="bg-brand-wine/10 p-2 rounded-full group-hover:bg-brand-wine/20 transition-colors">
            <BookOpen className="w-5 h-5 text-brand-wine" />
          </div>
          <div className="text-left flex-1">
            <p className="font-bold text-brand-wine text-sm">Manual do Cliente — Baixar PDF completo</p>
            <p className="text-xs text-brand-wine/70 font-normal">Benefícios, rede credenciada, app e mais</p>
          </div>
          <Download className="w-4 h-4 text-brand-wine/60 group-hover:text-brand-wine transition-colors" />
        </a>

        {/* App Móvel */}
        <div className="rounded-2xl border border-gray-100 bg-white overflow-hidden">
          <div className="bg-indigo-50 px-5 py-3 border-b border-indigo-100">
            <h3 className="font-bold text-indigo-800 text-sm">📱 Aplicativo Uniodonto Goiânia</h3>
          </div>
          <div className="p-5 space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-gray-50 rounded-xl p-3 text-center space-y-1">
                <p className="text-2xl">🤖</p>
                <p className="text-xs font-bold text-gray-800">Android</p>
                <p className="text-[10px] text-gray-500">Google Play Store</p>
              </div>
              <div className="bg-gray-50 rounded-xl p-3 text-center space-y-1">
                <p className="text-2xl">🍎</p>
                <p className="text-xs font-bold text-gray-800">iOS (iPhone)</p>
                <p className="text-[10px] text-gray-500">App Store</p>
              </div>
            </div>
            <ul className="space-y-1.5 text-xs text-gray-600">
              {["💳 Carteirinha virtual digital","🔍 Busca de dentistas por especialidade e localização","💬 Atendimento online com um atendente","📄 Segunda via de boletos e extratos de utilização"].map((item, i) => <li key={i}>{item}</li>)}
            </ul>
            <div className="bg-indigo-50 rounded-xl p-3">
              <p className="text-xs font-bold text-indigo-800 mb-1">Portal do Beneficiário — Primeiro Acesso:</p>
              <ol className="text-xs text-indigo-700 space-y-1">
                {["Acesse uniodontogoiania.coop.br","Clique em \"Portal do Beneficiário\"","Selecione \"Primeiro Acesso\"","Informe CPF e data de nascimento","Receba o código por WhatsApp ou e-mail","Pronto! Acesso liberado."].map((step, i) => <li key={i} className="flex gap-1"><span className="font-bold shrink-0">{i+1}.</span>{step}</li>)}
              </ol>
            </div>
          </div>
        </div>

        {/* Contatos */}
        <div className="rounded-2xl border border-gray-100 bg-white overflow-hidden">
          <div className="bg-green-50 px-5 py-3 border-b border-green-100">
            <h3 className="font-bold text-green-800 text-sm">📞 Central de Atendimento</h3>
          </div>
          <div className="p-5 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <a href="tel:6232549100" className="bg-green-50 rounded-xl p-3 text-center hover:bg-green-100 transition-colors">
                <p className="text-lg">📞</p><p className="text-xs font-bold text-green-900">(62) 3254-9100</p>
              </a>
              <a href="tel:08009419192" className="bg-green-50 rounded-xl p-3 text-center hover:bg-green-100 transition-colors">
                <p className="text-lg">📞</p><p className="text-xs font-bold text-green-900">0800 941-9192</p><p className="text-[10px] text-green-700">Gratuito</p>
              </a>
            </div>
            <p className="text-xs text-gray-600 bg-gray-50 rounded-xl p-3">🕐 Atendimento: <strong>seg. a sex., das 8h às 18h</strong></p>
            <a href="mailto:contato@uniodontogoiania.com.br" className="flex items-center gap-2 text-xs text-blue-700 bg-blue-50 rounded-xl p-3 hover:bg-blue-100 transition-colors">
              <Mail className="w-3.5 h-3.5 shrink-0" />contato@uniodontogoiania.com.br
            </a>
          </div>
        </div>

        {/* Plantões 24h */}
        <div className="rounded-2xl border border-gray-100 bg-white overflow-hidden">
          <div className="bg-red-50 px-5 py-3 border-b border-red-100">
            <h3 className="font-bold text-red-800 text-sm">🏥 Endereços e Plantões 24h</h3>
          </div>
          <div className="p-5 space-y-3 text-xs text-gray-700">
            <div>
              <p className="font-bold text-gray-900">Goiânia — Sede Administrativa</p>
              <p className="text-gray-600">Rua T-27, Nº 1115, St. Bueno — CEP 74215-030 · (62) 3254-9100</p>
            </div>
            <div className="border-t border-gray-100 pt-3">
              <p className="font-bold text-red-700">🚨 Plantão 24h — Goiânia</p>
              <p className="text-gray-600">Rua T-27, Nº 1.190, Setor Bueno — CEP 74215-030</p>
            </div>
            <div className="border-t border-gray-100 pt-3">
              <p className="font-bold text-red-700 mb-2">🚨 Plantão 24h — Anápolis</p>
              {[
                {name:"Dr. Bruno / Dr. Breno Lacerda",clinic:"Ateliê Odontorriso",phone:"(62) 3324-5133",addr:"Av. Coronel Batista, Nº 280, Setor Central"},
                {name:"Dra. Patrícia Zillmer de Alcântara",clinic:"Sorria Health Care",phone:"(62) 3314-1222",addr:"Av. Jamel Cecílio, Qd. 61, Lt. 12, Sala 101, JK Nova Capital"},
              ].map((p,i)=>(
                <div key={i} className="bg-red-50/60 rounded-xl p-3 mb-2">
                  <p className="font-bold text-gray-900">{p.name}</p>
                  <p className="text-gray-600">{p.clinic} · {p.phone}</p>
                  <p className="text-gray-500 text-[10px] mt-0.5">{p.addr}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Ouvidoria */}
        <div className="rounded-2xl border border-gray-100 bg-white overflow-hidden">
          <div className="bg-purple-50 px-5 py-3 border-b border-purple-100">
            <h3 className="font-bold text-purple-800 text-sm">🗣️ Ouvidoria</h3>
          </div>
          <div className="p-5 space-y-2 text-xs text-gray-700">
            <p className="text-gray-600">Canal de 2ª instância para mediação de conflitos. Tenha o número de protocolo do atendimento anterior em mãos.</p>
            <a href="https://uniodontogoiania.coop.br/ouvidoria/" target="_blank" rel="noopener noreferrer" className="block text-purple-700 hover:underline">🌐 uniodontogoiania.coop.br/ouvidoria/</a>
            <a href="mailto:ouvidoria@uniodontogoiania.com.br" className="flex items-center gap-1 text-purple-700 hover:underline"><Mail className="w-3 h-3" />ouvidoria@uniodontogoiania.com.br</a>
            <p className="text-gray-500">📍 Rua T-27 nº 1.115, Setor Bueno — Goiânia/GO</p>
          </div>
        </div>

        {/* Alerta Boleto */}
        <div className="rounded-2xl border-2 border-amber-300 bg-amber-50 p-5 space-y-3">
          <p className="font-bold text-amber-900 text-sm flex items-center gap-2"><AlertTriangle className="w-4 h-4 text-amber-600" />Atenção — Evite Golpes de Boleto</p>
          <ul className="space-y-1.5">
            {["Emita boletos apenas pelos canais oficiais","Central: (62) 3254-9100 | 0800 941-9192","Verifique o código de barras antes de pagar","E-mail oficial: @uniodonto.com.br ou @uniodonto.coop.br"].map((item,i)=>(
              <li key={i} className="flex items-start gap-2 text-xs text-amber-800"><span className="text-amber-600 font-bold">✓</span>{item}</li>
            ))}
          </ul>
          <p className="text-xs text-amber-700 border-t border-amber-200 pt-2">Segunda via de boleto: <strong>app</strong> ou <strong>Portal do Beneficiário</strong>.</p>
        </div>

        {/* Redes Sociais */}
        <div className="rounded-2xl border border-gray-100 bg-white p-5">
          <p className="text-sm font-bold text-gray-800 mb-3">🌐 Siga a Uniodonto Goiânia</p>
          <div className="grid grid-cols-2 gap-2">
            {[
              {label:"Facebook",handle:"@uniodontogoiania",url:"https://facebook.com/uniodontogoiania",emoji:"📘"},
              {label:"Instagram",handle:"@uniodontogoiania",url:"https://instagram.com/uniodontogoiania",emoji:"📸"},
              {label:"LinkedIn",handle:"uniodonto-goiania",url:"https://linkedin.com/in/uniodonto-goiania",emoji:"💼"},
              {label:"YouTube",handle:"UniodontoGoiania",url:"https://youtube.com/UniodontoGoiania",emoji:"▶️"},
            ].map((s,i)=>(
              <a key={i} href={s.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 bg-gray-50 rounded-xl p-2.5 hover:bg-gray-100 transition-colors">
                <span className="text-base">{s.emoji}</span>
                <div><p className="text-xs font-bold text-gray-800">{s.label}</p><p className="text-[10px] text-gray-500">{s.handle}</p></div>
              </a>
            ))}
          </div>
        </div>

      </div>
    );
  }

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
          <p className={cn("text-sm font-medium", paymentApproved ? "text-green-700" : "text-gray-600")}>
            Status: {paymentApproved ? "Pagamento aprovado" : pixData.status}
          </p>
        )}

        {paymentApproved && (
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
              onClick={() => { setCycle(c); setBillingCycle(c); setPaymentMethod(null); }}
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
      {/* Quando o titular é menor de 18, o toggle fica bloqueado */}
      {holderIsMinor ? (
        <div className="p-4 rounded-xl border-2 border-amber-300 bg-amber-50 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-bold text-amber-900">Titular menor de idade</p>
            <p className="text-xs text-amber-700 mt-0.5">
              Por ser menor de 18 anos, o titular não pode ser o responsável financeiro. Preencha os dados do responsável abaixo.
            </p>
          </div>
        </div>
      ) : (
        <div
          className="group p-4 rounded-xl border border-gray-200 bg-gray-50 hover:bg-gray-100 cursor-pointer flex items-center justify-between"
          onClick={() => setIsHolderPayer(!isHolderPayer)}
        >
          <span className="text-sm font-bold text-gray-900">O titular é o responsável financeiro?</span>
          <div className={cn("w-12 h-6 rounded-full p-1 transition-colors", isHolderPayer ? "bg-brand-wine" : "bg-gray-300")}>
            <div className={cn("w-4 h-4 bg-white rounded-full shadow-sm transition-transform", isHolderPayer ? "translate-x-6" : "translate-x-0")} />
          </div>
        </div>
      )}

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

      {/* ── Formulário de Cartão ── */}
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