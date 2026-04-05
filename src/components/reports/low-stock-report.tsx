"use client";

import { useState } from "react";
import { GlassBubbleCard } from "@/components/ui/glass-bubble-card";
import { useLowStockReport } from "@/hooks/useReports";
import {
  lowStockToCSV,
  downloadCSV,
} from "@/lib/reports/csv-export";

export function LowStockReportPage() {
  const { data, loading, error, generateReport } = useLowStockReport();
  const [filters, setFilters] = useState({
    sortBy: "severity" as "severity" | "quantity" | "name",
  });

  const handleGenerateReport = () => {
    generateReport({
      sortBy: filters.sortBy as any,
    });
  };

  const handleDownloadCSV = () => {
    if (data) {
      const csv = lowStockToCSV(data);
      downloadCSV(
        csv,
        `low-stock-report-${new Date().toISOString().split("T")[0]}.csv`
      );
    }
  };

  return (
    <main className="mx-auto w-full max-w-[1280px] px-4 sm:px-6 lg:px-8 py-8 form-screen">
      <h1 className="text-2xl sm:text-3xl font-bold mb-6">Low Stock Report</h1>

      <GlassBubbleCard className="mb-6">
        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 sm:items-end">
          <div className="flex-1">
            <label className="block text-sm font-medium mb-2">Sort By:</label>
            <select
              value={filters.sortBy}
              onChange={(e) =>
                setFilters({ ...filters, sortBy: e.target.value as any })
              }
              className="w-full rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
              style={{ background: "rgba(15,23,42,0.6)", border: "1px solid rgba(148,163,184,0.12)" }}
            >
              <option value="severity">Severity (Red First)</option>
              <option value="quantity">Quantity (Low First)</option>
              <option value="name">Item Name (A-Z)</option>
            </select>
          </div>
          <button
            onClick={handleGenerateReport}
            disabled={loading}
            className="w-full sm:w-auto rounded-lg px-4 sm:px-6 py-2 text-white font-semibold disabled:bg-gray-400"
            style={{ background: "linear-gradient(135deg, #5b5ef4 0%, #818cf8 100%)" }}
          >
            {loading ? "Generating..." : "Generate Report"}
          </button>
          <button
            onClick={handleDownloadCSV}
            disabled={!data || data.length === 0}
            className="w-full sm:w-auto soft-button rounded-lg px-4 sm:px-6 py-2 text-sm font-semibold disabled:opacity-50"
          >
            Download CSV
          </button>
        </div>
      </GlassBubbleCard>

      {error && (
        <GlassBubbleCard className="mb-6 border border-red-400/35 bg-red-500/10">
          <p className="text-red-200">{error}</p>
        </GlassBubbleCard>
      )}

      {data && data.length > 0 ? (
        <GlassBubbleCard>
          <div className="space-y-3 sm:hidden">
            {data.map((item) => (
              <div
                key={item.id}
                className="rounded-2xl border border-slate-700/70 p-4"
                style={{
                  background: item.severity === "red" ? "rgba(239,68,68,0.05)" : "rgba(245,158,11,0.04)",
                }}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-slate-100">{item.name}</p>
                    <p className="mt-1 font-mono text-xs text-slate-400">{item.barcode || "—"}</p>
                  </div>
                  <span
                    className={`rounded px-2 py-1 text-xs font-bold ${
                      item.severity === "red" ? "bg-red-600 text-white" : "bg-amber-500 text-white"
                    }`}
                  >
                    {item.severity.toUpperCase()}
                  </span>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-slate-500">On Hand</p>
                    <p className="mt-0.5 font-semibold text-slate-100">{item.quantityOnHand}</p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-slate-500">Supplier</p>
                    <p className="mt-0.5 text-slate-200">{item.preferredSupplier?.name || "—"}</p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-slate-500">Amber</p>
                    <p className="mt-0.5 text-slate-200">{item.lowStockAmberThreshold}</p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-slate-500">Red</p>
                    <p className="mt-0.5 text-slate-200">{item.lowStockRedThreshold}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className="hidden overflow-x-auto sm:block">
          <table className="w-full min-w-[44rem] text-sm">
            <thead>
              <tr className="border-b border-slate-700">
                <th className="text-left py-3 px-4">Item</th>
                <th className="text-left py-3 px-4">Barcode</th>
                <th className="text-right py-3 px-4">On Hand</th>
                <th className="text-right py-3 px-4">Amber</th>
                <th className="text-right py-3 px-4">Red</th>
                <th className="text-center py-3 px-4">Severity</th>
                <th className="text-left py-3 px-4">Supplier</th>
              </tr>
            </thead>
            <tbody>
              {data.map((item) => (
                <tr
                  key={item.id}
                  className="border-b border-slate-800/70"
                  style={{
                    background: item.severity === "red" ? "rgba(239,68,68,0.05)" : "rgba(245,158,11,0.04)",
                  }}
                >
                  <td className="py-3 px-4 font-medium">{item.name}</td>
                  <td className="py-3 px-4 font-mono text-xs">
                    {item.barcode || "—"}
                  </td>
                  <td className="py-3 px-4 text-right font-bold">
                    {item.quantityOnHand}
                  </td>
                  <td className="py-3 px-4 text-right">
                    {item.lowStockAmberThreshold}
                  </td>
                  <td className="py-3 px-4 text-right">
                    {item.lowStockRedThreshold}
                  </td>
                  <td className="py-3 px-4 text-center">
                    <span
                      className={`px-2 py-1 rounded text-xs font-bold ${
                        item.severity === "red"
                          ? "bg-red-600 text-white"
                          : "bg-amber-500 text-white"
                      }`}
                    >
                      {item.severity.toUpperCase()}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    {item.preferredSupplier?.name || "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        </GlassBubbleCard>
      ) : (
        <GlassBubbleCard className="text-center text-slate-400">
          <p>No low-stock items. Click &quot;Generate Report&quot; to check inventory levels.</p>
        </GlassBubbleCard>
      )}
    </main>
  );
}
