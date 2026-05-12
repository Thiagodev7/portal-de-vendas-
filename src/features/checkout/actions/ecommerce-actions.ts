"use server";

import { API_TOKEN, API_URL } from "@/lib/api-config";
import { z } from "zod";

// ─── Tipos compartilhados ────────────────────────────────────────────────────

type TransactionResponse = {
  success: boolean;
  data?: unknown;
  error?: string;
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function callApi(path: string, body: unknown): Promise<TransactionResponse> {
  try {
    const response = await fetch(`${API_URL}/portal-de-vendas${path}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${API_TOKEN}`,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const errorMessage =
        errorData && typeof errorData === "object" && "error" in errorData
          ? String(errorData.error)
          : `Erro HTTP ${response.status}`;
      return { success: false, error: errorMessage };
    }

    const result = await response.json();
    return { success: true, data: result };
  } catch (error: unknown) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erro desconhecido",
    };
  }
}

// ─── Schemas ─────────────────────────────────────────────────────────────────

const customerSchema = z.object({
  name: z.string(),
  cpf: z.string(),
  email: z.string().optional().default(""),
  phone: z.string(),
  cep: z.string(),
});

const cardSchema = z.object({
  number: z.string(),
  holder: z.string(),
  expirationMonth: z.string(), // "MM"
  expirationYear: z.string(),  // "YYYY"
  cvv: z.string(),
});

const pixPayloadSchema = z.object({
  customer: customerSchema,
  value: z.number(),         // em centavos
  plan: z.string().optional(),
  myid: z.string().optional(),
});

const creditCardPayloadSchema = z.object({
  customer: customerSchema,
  card: cardSchema,
  value: z.number(),         // em centavos
  plan: z.string().optional(),
  installments: z.number().optional(),
  numMonths: z.number().optional(),
  myid: z.string().optional(),
});

const recurringPayloadSchema = z.object({
  customer: customerSchema,
  card: cardSchema,
  initialValue: z.number(),    // em centavos — cobrado hoje (adesão + pro-rata)
  recurringValue: z.number(),  // em centavos — cobrado mensalmente nas 11x seguintes
  plan: z.string().optional(),
  myid: z.string().optional(),
});

const transactionStatusSchema = z.object({
  myId: z.string().min(1),
});

const insertClientPayloadSchema = z.object({
  pessoa_titular: z.record(z.string(), z.unknown()),
  endereco: z.record(z.string(), z.unknown()),
  contato: z.array(z.record(z.string(), z.unknown())),
  contrato: z.record(z.string(), z.unknown()),
});

// ─── Actions ─────────────────────────────────────────────────────────────────

/**
 * Gera cobrança Pix via /portal-de-vendas/ecommerce/pix
 */
export async function processPixPayment(
  data: z.infer<typeof pixPayloadSchema>
): Promise<TransactionResponse> {
  try {
    const validated = pixPayloadSchema.parse(data);
    return await callApi("/ecommerce/pix", validated);
  } catch (error: unknown) {
    console.error("Pix Payment Error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erro desconhecido",
    };
  }
}

/**
 * Gera link de pagamento por cartão de crédito (cobrança avulsa)
 * via /portal-de-vendas/ecommerce/credit-card
 */
export async function processCreditCardPayment(
  data: z.infer<typeof creditCardPayloadSchema>
): Promise<TransactionResponse> {
  try {
    const validated = creditCardPayloadSchema.parse(data);
    return await callApi("/ecommerce/credit-card", validated);
  } catch (error: unknown) {
    console.error("Credit Card Payment Error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erro desconhecido",
    };
  }
}

/**
 * Cria assinatura recorrente (cobrança hoje + 11x no mês seguinte)
 * via /portal-de-vendas/ecommerce/recurring
 */
export async function processRecurringPayment(
  data: z.infer<typeof recurringPayloadSchema>
): Promise<TransactionResponse> {
  try {
    const validated = recurringPayloadSchema.parse(data);
    return await callApi("/ecommerce/recurring", validated);
  } catch (error: unknown) {
    console.error("Recurring Payment Error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erro desconhecido",
    };
  }
}

/**
 * Consulta status de uma transação Celcoin
 * via /portal-de-vendas/ecommerce/pix (POST com myId — reutilizando /celcoin/postTransactionStatus)
 *
 * Obs: o route específico de status ainda está no caminho legado.
 */
export async function getCelcoinTransactionStatus(
  myId: string
): Promise<TransactionResponse> {
  try {
    const { myId: validatedMyId } = transactionStatusSchema.parse({ myId });

    const response = await fetch(`${API_URL}/celcoin/postTransactionStatus`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${API_TOKEN}`,
      },
      body: JSON.stringify({ myId: validatedMyId }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const errorMessage =
        errorData && typeof errorData === "object" && "error" in errorData
          ? String((errorData as { error?: unknown }).error)
          : `Erro HTTP ${response.status}`;
      return { success: false, error: errorMessage };
    }

    const result = await response.json();
    return { success: true, data: result };
  } catch (error: unknown) {
    console.error("Transaction Status Error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erro desconhecido",
    };
  }
}

/**
 * Insere cliente no DataSys após pagamento aprovado
 * via /portal-de-vendas/datanext/insertClient  (ou rota legada /datanext/insertClient)
 */
export async function insertDatasysClient(
  payload: z.infer<typeof insertClientPayloadSchema>
): Promise<TransactionResponse> {
  try {
    const validated = insertClientPayloadSchema.parse(payload);

    const response = await fetch(`${API_URL}/datanext/insertClient`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${API_TOKEN}`,
      },
      body: JSON.stringify(validated),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const errorMessage =
        errorData && typeof errorData === "object" && "error" in errorData
          ? String((errorData as { error?: unknown }).error)
          : `Erro HTTP ${response.status}`;
      return { success: false, error: errorMessage, data: errorData };
    }

    const result = await response.json();
    return { success: true, data: result };
  } catch (error: unknown) {
    console.error("Insert Datasys Client Error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erro desconhecido",
    };
  }
}

/**
 * Cria proposta no banco de dados após pagamento aprovado
 * via POST /portal-de-vendas/propostas/full
 * O integrador injeta automaticamente o WEB_DEFAULT_VENDEDOR_ID
 */
export async function createWebProposal(payload: {
  titular: { cpf: string; estado_civil?: number };
  responsavel_financeiro?: { cpf: string; estado_civil?: number } | null;
  plano: { contrato_id?: number; nro_contrato?: number; id_plano?: number; is_anual: boolean; dia_vencimento?: number };
  endereco: { cep: string; numero: string; complemento?: string; logradouro?: string; bairro?: string; nome_cidade?: string; sigla_uf?: string };
  contatos: { meio_comunicacao_id: number; descricao: string; nome_contato?: string }[];
  dependentes?: { cpf: string; grau_dependencia_id: number; estado_civil?: number }[];
  valor_venda?: number;
  forma_pagamento?: string;
  gateway_pagamento_id?: string;
}): Promise<TransactionResponse> {
  try {
    return await callApi("/propostas/full", payload);
  } catch (error: unknown) {
    console.error("Create Web Proposal Error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erro desconhecido",
    };
  }
}

/**
 * Atualiza status de integração da proposta (DataSys, documentos, etc.)
 * via PUT /portal-de-vendas/propostas/:nroProposta/integration
 */
export async function updateProposalIntegration(
  nroProposta: number,
  updates: {
    forma_pagamento?: string;
    datasys_status?: string;
    datasys_id_pessoa?: number;
    datasys_carteirinha?: string;
    documentos_enviados?: boolean;
    log_entry?: Record<string, unknown>;
  }
): Promise<TransactionResponse> {
  try {
    const response = await fetch(
      `${API_URL}/portal-de-vendas/propostas/${nroProposta}/integration`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${API_TOKEN}`,
        },
        body: JSON.stringify(updates),
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const errorMessage =
        errorData && typeof errorData === "object" && "error" in errorData
          ? String((errorData as { error?: unknown }).error)
          : `Erro HTTP ${response.status}`;
      return { success: false, error: errorMessage };
    }

    const result = await response.json();
    return { success: true, data: result };
  } catch (error: unknown) {
    console.error("Update Proposal Integration Error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erro desconhecido",
    };
  }
}

/**
 * Atualiza status de uma proposta (venda_finalizada, pagamento_concluido, contrato_assinado)
 * via PUT /portal-de-vendas/propostas/:nroProposta/status
 */
export async function updateProposalStatus(
  nroProposta: number,
  updates: {
    vendaFinalizada?: boolean;
    pagamentoConcluido?: boolean;
    contratoAssinado?: boolean;
    gatewayPagamentoId?: string;
  }
): Promise<TransactionResponse> {
  try {
    const response = await fetch(
      `${API_URL}/portal-de-vendas/propostas/${nroProposta}/status`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${API_TOKEN}`,
        },
        body: JSON.stringify(updates),
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const errorMessage =
        errorData && typeof errorData === "object" && "error" in errorData
          ? String((errorData as { error?: unknown }).error)
          : `Erro HTTP ${response.status}`;
      return { success: false, error: errorMessage };
    }

    const result = await response.json();
    return { success: true, data: result };
  } catch (error: unknown) {
    console.error("Update Proposal Status Error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erro desconhecido",
    };
  }
}

