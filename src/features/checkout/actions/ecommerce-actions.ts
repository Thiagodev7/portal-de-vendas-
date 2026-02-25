"use server";

import { API_TOKEN, API_URL } from "@/lib/api-config";
import { z } from "zod";

// --- Types & Schemas ---

const pixPayloadSchema = z.object({
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
  value: z.number(), // em centavos
  myid: z.string().optional(),
});

const creditCardPayloadSchema = z.object({
  customer: z.object({
    name: z.string(),
    cpf: z.string(),
    email: z.string().optional().default(""),
    phone: z.string(),
    cep: z.string(),
  }),
  card: z.object({
    name: z.string(),
    number: z.string(),
    holder: z.string(),
    expirationMonth: z.string(),
    expirationYear: z.string(),
    cvv: z.string(),
  }),
  plan: z.string().optional(),
  value: z.number(),
  numMonths: z.number().optional(), // 12 for annual
});

type TransactionResponse = {
  success: boolean;
  data?: unknown;
  error?: string;
};

// --- API Configuration ---

// API_URL and API_TOKEN are now imported from @/lib/api-config

// --- Actions ---

export async function processPixPayment(data: z.infer<typeof pixPayloadSchema>): Promise<TransactionResponse> {
  try {
    const validated = pixPayloadSchema.parse(data);

    const response = await fetch(`${API_URL}/portal-de-vendas/ecommerce/pix`, {
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

export async function processCreditCardPayment(data: z.infer<typeof creditCardPayloadSchema>): Promise<TransactionResponse> {
  try {
    const validated = creditCardPayloadSchema.parse(data);
    
    // Decide endpoint based on recurrence or one-off
    // For now assuming the standard credit-card endpoint handles one-off and annual installments
    // If it's a subscription (recurrent monthly), we should use /subscription.
    // Let's assume for now this action is for the 'credit-card' endpoint (Annual/One-off).
    
    const response = await fetch(`${API_URL}/portal-de-vendas/ecommerce/credit-card`, {
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

export async function processRecurringPayment(data: z.infer<typeof creditCardPayloadSchema>): Promise<TransactionResponse> {
  try {
    const validated = creditCardPayloadSchema.parse(data);

    const response = await fetch(`${API_URL}/portal-de-vendas/ecommerce/recurring`, {
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
