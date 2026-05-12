"use server";

import { API_TOKEN, API_URL } from "@/lib/api-config";

type TransactionResponse = {
  success: boolean;
  error?: string;
};

/**
 * Atualiza os campos de integração de uma proposta (pipeline de venda)
 * via PUT /portal-de-vendas/propostas/:nroProposta/integration
 */
export async function updateSaleIntegrationStatus(
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
        errorData && typeof errorData === "object" && "message" in errorData
          ? String(errorData.message)
          : `Erro HTTP ${response.status}`;
      return { success: false, error: errorMessage };
    }

    return { success: true };
  } catch (error: unknown) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erro desconhecido",
    };
  }
}
