"use server";

import { API_TOKEN, API_URL } from "@/lib/api-config";
import { z } from "zod";

// --- Types & Schemas ---

const baseCelcoinPayloadSchema = z.object({
  username: z.string(),
  customer: z.object({
    name: z.string(),
    cpf: z.string(),
    email: z.string().optional().default(""),
    phone: z.string(),
    cep: z.string(),
    // Campos de endereço para o debtor da Celcoin BaaS
    street: z.string().optional().default(""),
    number: z.string().optional().default("1"),
    neighborhood: z.string().optional().default(""),
    city: z.string().optional().default(""),
    state: z.string().optional().default(""),
  }),
  plan: z.string(),
  enrollment: z.number(), // em centavos (unitário)
  monthly: z.number(), // em centavos (unitário)
  value: z.number(), // em centavos
  numLives: z.number(),
  numMonths: z.number(),
  myid: z.string().optional(),
  dependent: z
    .array(
      z.object({
        cpf: z.string(),
        id_grau_dependencia: z.number(),
      })
    )
    .optional(),
  financialManager: z
    .object({
      cpf: z.string(),
    })
    .optional(),
  nro_proposta: z.number().optional(),
});

const pixPayloadSchema = baseCelcoinPayloadSchema;
const creditCardLinkPayloadSchema = baseCelcoinPayloadSchema;
const recurringPayloadSchema = baseCelcoinPayloadSchema;

type TransactionResponse = {
  success: boolean;
  data?: unknown;
  error?: string;
};

const insertClientPayloadSchema = z.object({
  pessoa_titular: z.record(z.unknown()),
  endereco: z.record(z.unknown()),
  contato: z.array(z.record(z.unknown())),
  contrato: z.record(z.unknown()),
});

// --- API Configuration ---

// API_URL and API_TOKEN are now imported from @/lib/api-config

// --- Actions ---

export async function processPixPayment(data: z.infer<typeof pixPayloadSchema>): Promise<TransactionResponse> {
  try {
    const validated = pixPayloadSchema.parse(data);

    const response = await fetch(`${API_URL}/celcoin/generatePixV2`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${API_TOKEN}`, 
      },
      body: JSON.stringify(validated),
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = (errorData && typeof errorData === 'object' && 'error' in errorData) 
            ? String(errorData.error) 
            : `Erro HTTP ${response.status}`;
        return { success: false, error: errorMessage };
    }

    const result = await response.json();
    return { success: true, data: result };

  } catch (error: unknown) {
    console.error("Pix Payment Error:", error);
    let errorMessage = "Erro desconhecido";
    if (error instanceof Error) {
        errorMessage = error.message;
    }
    return { success: false, error: errorMessage };
  }
}

export async function processCreditCardPayment(data: z.infer<typeof creditCardLinkPayloadSchema>): Promise<TransactionResponse> {
  try {
    const validated = creditCardLinkPayloadSchema.parse(data);
    
    const response = await fetch(`${API_URL}/celcoin/generateOneOffChargeLinkV2`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${API_TOKEN}`,
      },
      body: JSON.stringify(validated),
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = (errorData && typeof errorData === 'object' && 'error' in errorData) 
            ? String(errorData.error) 
            : `Erro HTTP ${response.status}`;
        return { success: false, error: errorMessage };
    }

    const result = await response.json();
    return { success: true, data: result };

  } catch (error: unknown) {
    console.error("Credit Card Payment Error:", error);
    let errorMessage = "Erro desconhecido";
    if (error instanceof Error) {
        errorMessage = error.message;
    }
    return { success: false, error: errorMessage };
  }
}

export async function processRecurringPayment(data: z.infer<typeof recurringPayloadSchema>): Promise<TransactionResponse> {
  try {
    const validated = recurringPayloadSchema.parse(data);

    const response = await fetch(`${API_URL}/celcoin/generateRecurringSubscriptionV2`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${API_TOKEN}`,
      },
      body: JSON.stringify(validated),
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = (errorData && typeof errorData === 'object' && 'error' in errorData)
            ? String(errorData.error)
            : `Erro HTTP ${response.status}`;
        return { success: false, error: errorMessage };
    }

    const result = await response.json();
    return { success: true, data: result };

  } catch (error: unknown) {
    console.error("Recurring Payment Error:", error);
    let errorMessage = "Erro desconhecido";
    if (error instanceof Error) {
        errorMessage = error.message;
    }
    return { success: false, error: errorMessage };
  }
}

export async function getCelcoinTransactionStatus(myId: string): Promise<TransactionResponse> {
  try {
    const validatedMyId = z.string().min(5).parse(myId);

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
    return { success: false, error: error instanceof Error ? error.message : "Erro desconhecido" };
  }
}

export async function insertDatasysClient(payload: z.infer<typeof insertClientPayloadSchema>): Promise<TransactionResponse> {
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
    return { success: false, error: error instanceof Error ? error.message : "Erro desconhecido" };
  }
}
