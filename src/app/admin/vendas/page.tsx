"use client";

import {
  type DashboardFilters,
  type DashboardResponse,
  getWebSalesDashboard,
} from "@/features/dashboard/actions/dashboard-actions";
import { FiltersBar } from "@/features/dashboard/components/filters-bar";
import { KPICards } from "@/features/dashboard/components/kpi-cards";
import { SalesTable } from "@/features/dashboard/components/sales-table";
import { Activity, RefreshCw } from "lucide-react";
import Image from "next/image";
import { useCallback, useEffect, useState } from "react";

export default function AdminVendasPage() {
  const [data, setData] = useState<DashboardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<DashboardFilters>({});
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchData = useCallback(
    async (overrideFilters?: DashboardFilters) => {
      setLoading(true);
      setError(null);

      const activeFilters = overrideFilters ?? filters;
      const result = await getWebSalesDashboard(activeFilters);

      if (result.success && result.data) {
        setData(result.data);
        setLastUpdated(new Date());
      } else {
        setError(result.error || "Erro ao carregar dados");
      }

      setLoading(false);
    },
    [filters]
  );

  // Initial load
  useEffect(() => {
    fetchData();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      fetchData();
    }, 30000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const handleFilterChange = useCallback(
    (newFilters: Record<string, string>) => {
      const updatedFilters: DashboardFilters = {
        ...newFilters,
        page: 1,
      };
      setFilters(updatedFilters);
      fetchData(updatedFilters);
    },
    [fetchData]
  );

  const handlePageChange = useCallback(
    (page: number) => {
      const updatedFilters = { ...filters, page };
      setFilters(updatedFilters);
      fetchData(updatedFilters);
    },
    [filters, fetchData]
  );

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100/50 font-sans">
      {/* Header */}
      <header className="bg-white border-b border-gray-100 sticky top-0 z-50 shadow-sm">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 relative flex items-center justify-center">
              <Image
                src="/iconLogoTest.png"
                alt="Logo Uniodonto"
                width={40}
                height={40}
                className="object-contain"
              />
            </div>
            <div>
              <h1 className="font-bold text-gray-900 text-sm flex items-center gap-2">
                <Activity className="w-4 h-4 text-brand-wine" />
                Painel de Vendas
              </h1>
              <p className="text-[10px] text-gray-400">E-Commerce Uniodonto Goiânia</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Last updated */}
            {lastUpdated && (
              <span className="text-[10px] text-gray-400 hidden sm:block">
                Atualizado: {lastUpdated.toLocaleTimeString("pt-BR")}
              </span>
            )}

            {/* Refresh button */}
            <button
              onClick={() => fetchData()}
              disabled={loading}
              className="flex items-center gap-1.5 h-9 px-3 bg-gray-50 border border-gray-200 rounded-lg text-xs font-medium text-gray-600 hover:bg-gray-100 transition-colors disabled:opacity-50"
            >
              <RefreshCw
                className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`}
              />
              Atualizar
            </button>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="container mx-auto px-4 py-6 space-y-5 max-w-[1400px]">
        {/* Error Banner */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3 animate-in fade-in duration-300">
            <div className="bg-red-100 p-2 rounded-full shrink-0">
              <Activity className="w-4 h-4 text-red-600" />
            </div>
            <div>
              <p className="text-sm font-bold text-red-800">
                Erro ao carregar dados
              </p>
              <p className="text-xs text-red-600">{error}</p>
            </div>
            <button
              onClick={() => fetchData()}
              className="ml-auto text-xs text-red-700 font-bold hover:underline"
            >
              Tentar novamente
            </button>
          </div>
        )}

        {/* KPIs */}
        <KPICards kpis={data?.kpis ?? null} loading={loading && !data} />

        {/* Filters */}
        <FiltersBar onFilterChange={handleFilterChange} />

        {/* Table */}
        <SalesTable
          vendas={data?.vendas ?? []}
          loading={loading && !data}
          pagination={data?.pagination ?? null}
          onPageChange={handlePageChange}
        />
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-100 bg-white mt-8">
        <div className="container mx-auto px-4 py-4 text-center">
          <p className="text-[10px] text-gray-400">
            Painel de Vendas E-Commerce · Uniodonto Goiânia · {new Date().getFullYear()}
          </p>
        </div>
      </footer>
    </div>
  );
}
