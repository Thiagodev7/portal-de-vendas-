"use client";

import { Search } from "lucide-react";
import { useCallback, useState } from "react";

interface FiltersBarProps {
  onFilterChange: (filters: {
    status?: string;
    plano?: string;
    from?: string;
    to?: string;
    search?: string;
  }) => void;
}

const STATUS_OPTIONS = [
  { value: "", label: "Todos os Status" },
  { value: "pagamento_pendente", label: "Pagamento Pendente" },
  { value: "pagamento_concluido", label: "Pagamento Aprovado" },
  { value: "datasys_sucesso", label: "DataSys OK" },
  { value: "datasys_erro", label: "DataSys Erro" },
  { value: "documentos_enviados", label: "Docs Enviados" },
  { value: "venda_finalizada", label: "Venda Finalizada" },
];

const PLANO_OPTIONS = [
  { value: "", label: "Todos os Planos" },
  { value: "UNI_QUALITY", label: "Uni Quality" },
  { value: "UNI_QUALITY_PLUS", label: "Uni Quality Plus" },
  { value: "UNI_SMART", label: "Uni Smart" },
  { value: "UNI_KIDS", label: "Uni Kids" },
  { value: "UNI_LIGHT_PLUS", label: "Uni Light Plus" },
];

export function FiltersBar({ onFilterChange }: FiltersBarProps) {
  const [status, setStatus] = useState("");
  const [plano, setPlano] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [search, setSearch] = useState("");

  const applyFilters = useCallback(
    (overrides: Record<string, string> = {}) => {
      const filters = {
        status: overrides.status ?? status,
        plano: overrides.plano ?? plano,
        from: overrides.from ?? from,
        to: overrides.to ?? to,
        search: overrides.search ?? search,
      };
      // Remove empty values
      const clean: Record<string, string> = {};
      for (const [k, v] of Object.entries(filters)) {
        if (v) clean[k] = v;
      }
      onFilterChange(clean);
    },
    [status, plano, from, to, search, onFilterChange]
  );

  const selectClass =
    "h-9 px-3 text-xs bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-wine/30 focus:border-brand-wine transition-colors appearance-none cursor-pointer";

  const inputClass =
    "h-9 px-3 text-xs bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-wine/30 focus:border-brand-wine transition-colors";

  return (
    <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
      <div className="flex flex-wrap items-center gap-3">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar por nome ou CPF..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") applyFilters({ search: e.currentTarget.value });
            }}
            className={`${inputClass} pl-9 w-full`}
          />
        </div>

        {/* Status */}
        <select
          value={status}
          onChange={(e) => {
            setStatus(e.target.value);
            applyFilters({ status: e.target.value });
          }}
          className={selectClass}
        >
          {STATUS_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>

        {/* Plano */}
        <select
          value={plano}
          onChange={(e) => {
            setPlano(e.target.value);
            applyFilters({ plano: e.target.value });
          }}
          className={selectClass}
        >
          {PLANO_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>

        {/* Date Range */}
        <div className="flex items-center gap-2">
          <input
            type="date"
            value={from}
            onChange={(e) => {
              setFrom(e.target.value);
              if (e.target.value) applyFilters({ from: e.target.value });
            }}
            className={`${inputClass} w-[130px]`}
          />
          <span className="text-xs text-gray-400">até</span>
          <input
            type="date"
            value={to}
            onChange={(e) => {
              setTo(e.target.value);
              if (e.target.value) applyFilters({ to: e.target.value });
            }}
            className={`${inputClass} w-[130px]`}
          />
        </div>

        {/* Search button */}
        <button
          onClick={() => applyFilters()}
          className="h-9 px-4 bg-brand-wine text-white text-xs font-bold rounded-lg hover:bg-brand-wine/90 transition-colors flex items-center gap-1.5"
        >
          <Search className="w-3.5 h-3.5" />
          Filtrar
        </button>

        {/* Clear */}
        {(status || plano || from || to || search) && (
          <button
            onClick={() => {
              setStatus("");
              setPlano("");
              setFrom("");
              setTo("");
              setSearch("");
              onFilterChange({});
            }}
            className="h-9 px-3 text-xs text-gray-500 hover:text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Limpar
          </button>
        )}
      </div>
    </div>
  );
}
