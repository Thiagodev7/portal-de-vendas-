"use client";

import type { SaleRecord } from "@/features/dashboard/actions/dashboard-actions";
import {
  AlertTriangle,
  CheckCircle,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Clock,
  CreditCard,
  FileText,
  Loader2,
  MapPin,
  User,
  Users,
} from "lucide-react";
import { useState } from "react";

interface SalesTableProps {
  vendas: SaleRecord[];
  loading?: boolean;
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  } | null;
  onPageChange: (page: number) => void;
}

// ─── Status Badge ────────────────────────────────────────────────────────────

function StatusBadge({
  ok,
  pending,
  error,
  label,
}: {
  ok: boolean;
  pending?: boolean;
  error?: boolean;
  label: string;
}) {
  if (error) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-red-100 text-red-700 border border-red-200">
        <AlertTriangle className="w-3 h-3" />
        {label}
      </span>
    );
  }
  if (ok) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-green-100 text-green-700 border border-green-200">
        <CheckCircle className="w-3 h-3" />
        {label}
      </span>
    );
  }
  if (pending) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-100 text-amber-700 border border-amber-200">
        <Clock className="w-3 h-3" />
        {label}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-gray-100 text-gray-500 border border-gray-200">
      —
    </span>
  );
}

function PaymentBadge({ method }: { method: string | null }) {
  if (method === "pix") {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-teal-100 text-teal-700 border border-teal-200">
        💠 Pix
      </span>
    );
  }
  if (method === "credit_card") {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-indigo-100 text-indigo-700 border border-indigo-200">
        <CreditCard className="w-3 h-3" />
        Cartão
      </span>
    );
  }
  return (
    <span className="text-[10px] text-gray-400">—</span>
  );
}

function maskCpf(cpf: string) {
  const d = (cpf || "").replace(/\D/g, "");
  if (d.length < 11) return cpf;
  return `***.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
}

function formatDate(iso: string) {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatBRL(value: number | null) {
  if (value === null || value === undefined) return "—";
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

function planLabel(codigo: string) {
  const map: Record<string, string> = {
    UNI_QUALITY: "Quality",
    UNI_QUALITY_PLUS: "Quality Plus",
    UNI_SMART: "Smart",
    UNI_KIDS: "Kids",
    UNI_LIGHT_PLUS: "Light Plus",
  };
  return map[codigo] || codigo || "—";
}

// ─── Row Details ─────────────────────────────────────────────────────────────

function RowDetails({ venda }: { venda: SaleRecord }) {
  return (
    <tr>
      <td colSpan={10} className="p-0">
        <div className="bg-gray-50/80 border-t border-b border-gray-100 px-6 py-4 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            {/* Titular */}
            <div className="space-y-2">
              <h4 className="font-bold text-gray-700 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-brand-wine" />
                Titular
              </h4>
              <div className="space-y-1 text-gray-600">
                <p><strong>Nome:</strong> {venda.nome_titular || "—"}</p>
                <p><strong>CPF:</strong> {venda.cpf_titular || "—"}</p>
                <p><strong>E-mail:</strong> {venda.email_titular || "—"}</p>
                <p><strong>Telefone:</strong> {venda.telefone_titular || "—"}</p>
              </div>
            </div>

            {/* Endereço */}
            <div className="space-y-2">
              <h4 className="font-bold text-gray-700 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-brand-wine" />
                Endereço
              </h4>
              {venda.endereco ? (
                <div className="space-y-1 text-gray-600">
                  <p>{venda.endereco.logradouro}, {venda.endereco.numero}</p>
                  {venda.endereco.complemento && <p>{venda.endereco.complemento}</p>}
                  <p>{venda.endereco.bairro} — {venda.endereco.cidade}/{venda.endereco.uf}</p>
                  <p>CEP: {venda.endereco.cep}</p>
                </div>
              ) : (
                <p className="text-gray-400 italic">Endereço não disponível</p>
              )}
            </div>

            {/* Integração */}
            <div className="space-y-2">
              <h4 className="font-bold text-gray-700 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-brand-wine" />
                Integração
              </h4>
              <div className="space-y-1 text-gray-600">
                <p><strong>Gateway ID:</strong> <span className="font-mono text-[10px]">{venda.gateway_pagamento_id || "—"}</span></p>
                <p><strong>DataSys ID Pessoa:</strong> {venda.datasys_id_pessoa || "—"}</p>
                <p><strong>Carteirinha:</strong> {venda.datasys_carteirinha || "—"}</p>
                <p><strong>Envelope DocuSign:</strong> <span className="font-mono text-[10px]">{venda.envelope_id || "—"}</span></p>
                <p><strong>Ciclo:</strong> {venda.is_anual ? "Anual" : "Mensal"}</p>
                {venda.pro_rata && <p><strong>Pro-rata:</strong> {formatBRL(Number(venda.pro_rata))}</p>}
                <p><strong>Vendedor:</strong> {venda.vendedor_nome || `ID ${venda.vendedor_id || '—'}`}</p>
                {venda.vendedor_email && <p><strong>E-mail Vendedor:</strong> {venda.vendedor_email}</p>}
              </div>
            </div>
          </div>

          {/* Dependentes */}
          {Array.isArray(venda.dependentes) && venda.dependentes.length > 0 && (
            <div className="mt-4 pt-3 border-t border-gray-200">
              <h4 className="font-bold text-gray-700 text-xs flex items-center gap-1.5 mb-2">
                <Users className="w-3.5 h-3.5 text-brand-wine" />
                Dependentes ({venda.dependentes.length})
              </h4>
              <div className="flex flex-wrap gap-2">
                {venda.dependentes.map((dep, i) => (
                  <span
                    key={i}
                    className="text-[10px] bg-white border border-gray-200 rounded-lg px-2 py-1 font-mono"
                  >
                    {maskCpf(dep.cpf)} (grau {dep.grau})
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Integration Log */}
          {Array.isArray(venda.integration_log) && venda.integration_log.length > 0 && (
            <div className="mt-4 pt-3 border-t border-gray-200">
              <h4 className="font-bold text-gray-700 text-xs mb-2">
                📋 Log de Integração
              </h4>
              <div className="max-h-32 overflow-y-auto space-y-1">
                {(venda.integration_log as Array<{ ts?: string; event?: string; detail?: string }>).map((log, i) => (
                  <div key={i} className="text-[10px] text-gray-500 font-mono bg-white rounded px-2 py-1 border border-gray-100">
                    <span className="text-gray-400">{log.ts || ""}</span>{" "}
                    <span className="font-semibold text-gray-700">{log.event || ""}</span>{" "}
                    {log.detail || ""}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </td>
    </tr>
  );
}

// ─── Main Table ──────────────────────────────────────────────────────────────

export function SalesTable({ vendas, loading, pagination, onPageChange }: SalesTableProps) {
  const [expandedRow, setExpandedRow] = useState<number | null>(null);

  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-gray-100 p-12 flex flex-col items-center justify-center">
        <Loader2 className="w-8 h-8 text-brand-wine animate-spin mb-3" />
        <p className="text-sm text-gray-500">Carregando vendas...</p>
      </div>
    );
  }

  if (!vendas || vendas.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-100 p-12 text-center">
        <div className="text-4xl mb-3">📭</div>
        <p className="text-sm font-bold text-gray-700">Nenhuma venda encontrada</p>
        <p className="text-xs text-gray-400 mt-1">Ajuste os filtros ou aguarde novas vendas.</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-gray-50/80 border-b border-gray-100">
              <th className="text-left px-4 py-3 font-semibold text-gray-500 w-8">#</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-500">Titular</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-500">Plano</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-500">Vendedor</th>
              <th className="text-right px-4 py-3 font-semibold text-gray-500">Valor</th>
              <th className="text-center px-4 py-3 font-semibold text-gray-500">Pagamento</th>
              <th className="text-center px-4 py-3 font-semibold text-gray-500">DataSys</th>
              <th className="text-center px-4 py-3 font-semibold text-gray-500">Docs</th>
              <th className="text-center px-4 py-3 font-semibold text-gray-500">Data</th>
              <th className="text-center px-4 py-3 font-semibold text-gray-500 w-8"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {vendas.map((venda) => {
              const isExpanded = expandedRow === venda.nro_proposta;
              const datasysOk = venda.datasys_status === "sucesso";
              const datasysError = venda.datasys_status === "erro";
              const datasysPending =
                !venda.datasys_status ||
                venda.datasys_status === "pendente" ||
                venda.datasys_status === "enviado";

              return (
                <>
                  <tr
                    key={venda.nro_proposta}
                    onClick={() =>
                      setExpandedRow(isExpanded ? null : venda.nro_proposta)
                    }
                    className={`cursor-pointer transition-colors ${
                      isExpanded
                        ? "bg-brand-wine/5"
                        : "hover:bg-gray-50/50"
                    }`}
                  >
                    <td className="px-4 py-3 font-mono text-gray-400 font-bold">
                      {venda.nro_proposta}
                    </td>
                    <td className="px-4 py-3">
                      <div>
                        <p className="font-semibold text-gray-800 truncate max-w-[180px]">
                          {venda.nome_titular || "—"}
                        </p>
                        <p className="text-[10px] text-gray-400 font-mono">
                          {maskCpf(venda.cpf_titular)}
                        </p>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div>
                        <p className="font-medium text-gray-700">
                          {planLabel(venda.plano_codigo)}
                        </p>
                        <p className="text-[10px] text-gray-400">
                          {venda.total_vidas} vida{venda.total_vidas !== 1 ? "s" : ""} ·{" "}
                          {venda.is_anual ? "Anual" : "Mensal"}
                        </p>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-700 truncate max-w-[120px]">
                        {venda.vendedor_nome || "E-Commerce"}
                      </p>
                      <p className="text-[10px] text-gray-400">
                        ID {venda.vendedor_id || "—"}
                      </p>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <p className="font-bold text-gray-800">
                        {formatBRL(Number(venda.valor_venda))}
                      </p>
                      <PaymentBadge method={venda.forma_pagamento} />
                    </td>
                    <td className="px-4 py-3 text-center">
                      <StatusBadge
                        ok={venda.pagamento_concluido}
                        pending={!venda.pagamento_concluido}
                        label={venda.pagamento_concluido ? "Pago" : "Pendente"}
                      />
                    </td>
                    <td className="px-4 py-3 text-center">
                      <StatusBadge
                        ok={datasysOk}
                        pending={datasysPending}
                        error={datasysError}
                        label={
                          datasysOk
                            ? "OK"
                            : datasysError
                            ? "Erro"
                            : "Pendente"
                        }
                      />
                    </td>
                    <td className="px-4 py-3 text-center">
                      <StatusBadge
                        ok={venda.documentos_enviados}
                        pending={!venda.documentos_enviados && venda.pagamento_concluido}
                        label={venda.documentos_enviados ? "Sim" : "Não"}
                      />
                    </td>
                    <td className="px-4 py-3 text-center">
                      <p className="text-[10px] text-gray-500 whitespace-nowrap">
                        {formatDate(venda.created_at)}
                      </p>
                    </td>
                    <td className="px-4 py-3 text-center">
                      {isExpanded ? (
                        <ChevronUp className="w-4 h-4 text-brand-wine" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-gray-400" />
                      )}
                    </td>
                  </tr>
                  {isExpanded && <RowDetails venda={venda} />}
                </>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {pagination && pagination.totalPages > 1 && (
        <div className="border-t border-gray-100 px-4 py-3 flex items-center justify-between bg-gray-50/50">
          <p className="text-[10px] text-gray-400">
            Mostrando {(pagination.page - 1) * pagination.limit + 1}–
            {Math.min(pagination.page * pagination.limit, pagination.total)} de{" "}
            {pagination.total}
          </p>
          <div className="flex items-center gap-1">
            <button
              disabled={pagination.page <= 1}
              onClick={() => onPageChange(pagination.page - 1)}
              className="p-1.5 rounded-lg border border-gray-200 hover:bg-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
              const start = Math.max(
                1,
                Math.min(
                  pagination.page - 2,
                  pagination.totalPages - 4
                )
              );
              const pageNum = start + i;
              if (pageNum > pagination.totalPages) return null;
              return (
                <button
                  key={pageNum}
                  onClick={() => onPageChange(pageNum)}
                  className={`w-8 h-8 text-xs rounded-lg border transition-colors ${
                    pageNum === pagination.page
                      ? "bg-brand-wine text-white border-brand-wine font-bold"
                      : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"
                  }`}
                >
                  {pageNum}
                </button>
              );
            })}
            <button
              disabled={pagination.page >= pagination.totalPages}
              onClick={() => onPageChange(pagination.page + 1)}
              className="p-1.5 rounded-lg border border-gray-200 hover:bg-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
