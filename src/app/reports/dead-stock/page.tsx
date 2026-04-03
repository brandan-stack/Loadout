"use client";

import { useState } from "react";
import Link from "next/link";
import { GlassBubbleCard } from "@/components/ui/glass-bubble-card";
import { useDeadStockReport } from "@/hooks/useReports";
import { deadStockToCSV, downloadCSV } from "@/lib/reports/csv-export";

interface DeadStockRow {
  id: string;
  name: string;
  barcode?: string | null;
  quantityOnHand: number;
  createdAt: string;
  lastUsed?: string;
  daysUnused: number;
}

export default function DeadStockReportPage() {
  const { data, loading, error, generateReport } = useDeadStockReport();
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  const typedData = (data || []) as DeadStockRow[];

  const handleGenerateReport = () => {
    generateReport({
      sortBy: "date",
      sortOrder,
    });
  };

  const handleDownloadCSV = () => {
    const csv = deadStockToCSV(
      typedData.map((row) => ({
        ...row,
        createdAt: new Date(row.createdAt),
        lastUsed: row.lastUsed ? new Date(row.lastUsed) : undefined,
      }))
    );
    downloadCSV(csv, `dead-stock-report-${new Date().toISOString().split("T")[0]}.csv`);
  };

  const formatDate = (value?: string) => {
    if (!value) return "Never";
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return "Never";
    return d.toISOString().split("T")[0];
  };

  return (
    <main className="mx-auto w-full max-w-[1280px] px-4 sm:px-6 lg:px-8 py-8 form-screen">
      <h1 className="text-2xl sm:text-3xl font-bold mb-6">Dead Stock Report</h1>

      <GlassBubbleCard className="mb-6">
        <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
          <select
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value as "asc" | "desc")}
            className="px-3 py-2 border rounded-lg"
          >
            <option value="desc">Most stale first</option>
            <option value="asc">Least stale first</option>
          </select>

          <button
            onClick={handleGenerateReport}
            disabled={loading}
            className="px-4 py-2 rounded-lg text-white font-semibold disabled:bg-slate-600"
            style={{ background: "linear-gradient(135deg, #5b5ef4 0%, #818cf8 100%)" }}
          >
            {loading ? "Generating..." : "Generate Report"}
          </button>
          <button
            onClick={handleDownloadCSV}
            disabled={typedData.length === 0}
            className="soft-button rounded-lg px-4 py-2 text-sm font-semibold text-center disabled:opacity-50"
          >
            Download CSV
          </button>
          <Link href="/reports" className="soft-button rounded-lg px-4 py-2 text-sm font-semibold text-center">
            Back to Reports
          </Link>
        </div>
      </GlassBubbleCard>

      {error && (
        <GlassBubbleCard className="mb-4 border border-red-400/35 bg-red-500/10">
          <p className="text-red-200 text-sm">{error}</p>
        </GlassBubbleCard>
      )}

      {typedData.length > 0 ? (
        <GlassBubbleCard>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[44rem] text-sm">
              <thead>
                <tr className="border-b border-slate-700">
                  <th className="text-left py-2 px-3">Item</th>
                  <th className="text-left py-2 px-3">Barcode</th>
                  <th className="text-right py-2 px-3">On Hand</th>
                  <th className="text-left py-2 px-3">Created</th>
                  <th className="text-left py-2 px-3">Last Used</th>
                  <th className="text-right py-2 px-3">Days Unused</th>
                </tr>
              </thead>
              <tbody>
                {typedData.map((row) => (
                  <tr key={row.id} className="border-b border-slate-800/70">
                    <td className="py-2 px-3 font-medium">{row.name}</td>
                    <td className="py-2 px-3 font-mono text-xs text-slate-400">{row.barcode || "-"}</td>
                    <td className="py-2 px-3 text-right">{row.quantityOnHand}</td>
                    <td className="py-2 px-3">{formatDate(row.createdAt)}</td>
                    <td className="py-2 px-3">{formatDate(row.lastUsed)}</td>
                    <td className="py-2 px-3 text-right font-semibold">{row.daysUnused}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </GlassBubbleCard>
      ) : (
        <GlassBubbleCard className="text-slate-400 text-sm">
          Run the report to view items with long inactivity.
        </GlassBubbleCard>
      )}
    </main>
  );
}
