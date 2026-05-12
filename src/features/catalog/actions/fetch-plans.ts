"use server";

import { API_TOKEN, API_URL } from "@/lib/api-config";

export interface BackendPlanValue {
  plano: string;
  descricao: string; // "Mensalidade" | "Taxa de Adesão"
  qtde_vida: number;
  valor: string;
  valor_total: string;
}

export interface BackendPlan {
  id: number;           // apps.contrato.id (interno)
  codigo_plano: string; // ex: "UNI_QUALITY"
  nro_contrato: number; // DataSys contract ID (ex: 56429)
  nome_contrato: string;
  values: BackendPlanValue[];
}

/**
 * Busca planos e valores do backend via GET /database/valoresContrato
 * Mesma API usada pelo app Flutter (e-vendas)
 */
export async function fetchBackendPlans(): Promise<{
  success: boolean;
  data?: BackendPlan[];
  error?: string;
}> {
  try {
    const response = await fetch(`${API_URL}/database/valoresContrato`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${API_TOKEN}`,
      },
      next: { revalidate: 300 }, // cache 5 min
    });

    if (!response.ok) {
      return { success: false, error: `Erro HTTP ${response.status}` };
    }

    const json = await response.json();
    const result = (json?.result ?? []) as BackendPlan[];
    return { success: true, data: result };
  } catch (error: unknown) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erro desconhecido",
    };
  }
}
