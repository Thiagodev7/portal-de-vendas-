"use server";

import { API_TOKEN, API_URL } from "@/lib/api-config";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface SaleRecord {
  nro_proposta: number;
  created_at: string;
  updated_at: string;
  venda_finalizada: boolean;
  pagamento_concluido: boolean;
  contrato_assinado: boolean;
  gateway_pagamento_id: string | null;
  is_anual: boolean;
  dia_vencimento: number | null;
  valor_venda: number | null;
  pro_rata: number | null;
  envelope_id: string | null;
  forma_pagamento: string | null;
  datasys_status: string | null;
  datasys_id_pessoa: number | null;
  datasys_carteirinha: string | null;
  documentos_enviados: boolean;
  integration_log: unknown[];
  nome_contrato: string;
  nro_contrato: number;
  plano_codigo: string;
  cpf_titular: string;
  nome_titular: string | null;
  email_titular: string | null;
  telefone_titular: string | null;
  total_vidas: number;
  cpf_resp_financeiro: string;
  endereco: {
    cep: string;
    numero: string;
    complemento: string;
    logradouro: string;
    bairro: string;
    cidade: string;
    uf: string;
  } | null;
  dependentes: { cpf: string; grau: number }[];
  vendedor_id: number | null;
  vendedor_nome: string | null;
  vendedor_email: string | null;
}

export interface DashboardKPIs {
  total_vendas: number;
  valor_total: number;
  pagamentos_aprovados: number;
  pagamentos_pendentes: number;
  datasys_sucesso: number;
  datasys_erro: number;
  datasys_pendente: number;
  docs_enviados: number;
  contratos_assinados: number;
  vendas_finalizadas: number;
  vendas_pix: number;
  vendas_cartao: number;
  vendas_hoje: number;
  vendas_mes: number;
}

export interface DashboardResponse {
  vendas: SaleRecord[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  kpis: DashboardKPIs;
}

export interface DashboardFilters {
  page?: number;
  limit?: number;
  status?: string;
  plano?: string;
  from?: string;
  to?: string;
  search?: string;
}

// ─── Actions ─────────────────────────────────────────────────────────────────

export async function getWebSalesDashboard(
  filters: DashboardFilters = {}
): Promise<{ success: boolean; data?: DashboardResponse; error?: string }> {
  try {
    const params = new URLSearchParams();
    if (filters.page) params.set("page", String(filters.page));
    if (filters.limit) params.set("limit", String(filters.limit));
    if (filters.status) params.set("status", filters.status);
    if (filters.plano) params.set("plano", filters.plano);
    if (filters.from) params.set("from", filters.from);
    if (filters.to) params.set("to", filters.to);
    if (filters.search) params.set("search", filters.search);

    const url = `${API_URL}/portal-de-vendas/dashboard/vendas?${params.toString()}`;

    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${API_TOKEN}`,
      },
      cache: "no-store",
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return {
        success: false,
        error:
          (errorData as { message?: string })?.message ||
          `Erro HTTP ${response.status}`,
      };
    }

    const data = await response.json();
    return { success: true, data: data as DashboardResponse };
  } catch (error: unknown) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erro desconhecido",
    };
  }
}

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
): Promise<{ success: boolean; error?: string }> {
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
      return {
        success: false,
        error:
          (errorData as { message?: string })?.message ||
          `Erro HTTP ${response.status}`,
      };
    }

    return { success: true };
  } catch (error: unknown) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erro desconhecido",
    };
  }
}
