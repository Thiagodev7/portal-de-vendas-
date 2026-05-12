"use client";

import type { DashboardKPIs } from "@/features/dashboard/actions/dashboard-actions";
import {
  Activity,
  AlertTriangle,
  CheckCircle,
  CreditCard,
  DollarSign,
  FileCheck,
  ShoppingCart,
  TrendingUp,
} from "lucide-react";

interface KPICardsProps {
  kpis: DashboardKPIs | null;
  loading?: boolean;
}

interface KPICardDef {
  label: string;
  value: number | string;
  icon: React.ReactNode;
  color: string;
  bg: string;
  border: string;
  sub?: string;
}

export function KPICards({ kpis, loading }: KPICardsProps) {
  if (loading || !kpis) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-7 gap-3">
        {Array.from({ length: 7 }).map((_, i) => (
          <div
            key={i}
            className="bg-white rounded-xl border border-gray-100 p-4 animate-pulse"
          >
            <div className="h-4 bg-gray-200 rounded w-16 mb-3" />
            <div className="h-7 bg-gray-200 rounded w-12" />
          </div>
        ))}
      </div>
    );
  }

  const formatBRL = (value: number) =>
    new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);

  const cards: KPICardDef[] = [
    {
      label: "Total Vendas",
      value: kpis.total_vendas,
      icon: <ShoppingCart className="w-4 h-4" />,
      color: "text-indigo-700",
      bg: "bg-indigo-50",
      border: "border-indigo-100",
      sub: `${kpis.vendas_hoje} hoje · ${kpis.vendas_mes} mês`,
    },
    {
      label: "Valor Total",
      value: formatBRL(Number(kpis.valor_total) || 0),
      icon: <DollarSign className="w-4 h-4" />,
      color: "text-emerald-700",
      bg: "bg-emerald-50",
      border: "border-emerald-100",
    },
    {
      label: "Pagamentos",
      value: kpis.pagamentos_aprovados,
      icon: <CheckCircle className="w-4 h-4" />,
      color: "text-green-700",
      bg: "bg-green-50",
      border: "border-green-100",
      sub: `${kpis.pagamentos_pendentes} pendentes`,
    },
    {
      label: "DataSys OK",
      value: kpis.datasys_sucesso,
      icon: <Activity className="w-4 h-4" />,
      color: "text-blue-700",
      bg: "bg-blue-50",
      border: "border-blue-100",
      sub: `${kpis.datasys_erro} erros`,
    },
    {
      label: "Docs Enviados",
      value: kpis.docs_enviados,
      icon: <FileCheck className="w-4 h-4" />,
      color: "text-purple-700",
      bg: "bg-purple-50",
      border: "border-purple-100",
    },
    {
      label: "Pix / Cartão",
      value: `${kpis.vendas_pix} / ${kpis.vendas_cartao}`,
      icon: <CreditCard className="w-4 h-4" />,
      color: "text-cyan-700",
      bg: "bg-cyan-50",
      border: "border-cyan-100",
    },
    {
      label: "Erros",
      value: kpis.datasys_erro,
      icon: <AlertTriangle className="w-4 h-4" />,
      color: "text-red-700",
      bg: "bg-red-50",
      border: "border-red-100",
      sub: "atenção",
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-7 gap-3">
      {cards.map((card) => (
        <div
          key={card.label}
          className={`${card.bg} rounded-xl border ${card.border} p-4 transition-all hover:shadow-md hover:scale-[1.02]`}
        >
          <div className="flex items-center gap-2 mb-2">
            <div className={`${card.color}`}>{card.icon}</div>
            <span className="text-xs font-medium text-gray-500 truncate">
              {card.label}
            </span>
          </div>
          <p className={`text-xl font-bold ${card.color} truncate`}>
            {card.value}
          </p>
          {card.sub && (
            <p className="text-[10px] text-gray-400 mt-1 truncate">
              {card.sub}
            </p>
          )}
        </div>
      ))}
    </div>
  );
}
