"use client";

import { useState } from "react";
import Link from "next/link";
import { GlassBubbleCard } from "@/components/ui/glass-bubble-card";
import { useUsageReport } from "@/hooks/useReports";
import { downloadCSV, usageReportToCSV } from "@/lib/reports/csv-export";

interface UsageRow {
  itemId: string;
  name: string;
  barcode?: string | null;
  periodStart: string;
  periodEnd: string;
  quantityUsed: number;
  averageUsagePerDay: number;
  lastUsed?: string;
  trend: "increasing" | "stable" | "decreasing";
}

export default function UsageReportPage() {
  const { data, loading, error, generateReport } = useUsageReport();
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const typedData = (data || []) as UsageRow[];

  const handleGenerateReport = () => {
    generateReport({
      dateFrom: dateFrom ? new Date(dateFrom) : undefined,
      dateTo: dateTo ? new Date(dateTo) : undefined,
      sortBy: "usage",
      sortOrder: "desc",
    });
  };

  const handleDownloadCSV = () => {
    const csv = usageReportToCSV(
      typedData.map((row) => ({
        ...row,
        periodStart: new Date(row.periodStart),
        periodEnd: new Date(row.periodEnd),
        lastUsed: row.lastUsed ? new Date(row.lastUsed) : undefined,
      }))
    );
    downloadCSV(csv, `usage-report-${new Date().toISOString().split("T")[0]}.csv`);
  };

  const formatDate = (value?: string) => {
    if (!value) return "-";
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return "-";
    return d.toISOString().split("T")[0];
  };

  return (
    <main className="container mx-auto px-3 py-4 sm:p-4 max-w-4xl form-screen">
      <h1 className="text-2xl sm:text-3xl font-bold mb-6">Usage Report</h1>

      <GlassBubbleCard className="mb-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
          <div>
            <label className="block text-sm font-medium mb-2">From</label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">To</label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg"
            />
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-2 sm:items-center mt-4">
          <button
            onClick={handleGenerateReport}
            disabled={loading}
            className="px-4 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-semibold disabled:bg-slate-600"
          >
            {loading ? "Generating..." : "Generate Report"}
          </button>
          <button
            onClick={handleDownloadCSV}
            disabled={typedData.length === 0}
            className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold disabled:bg-slate-600"
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
                  <th className="text-right py-2 px-3">Used</th>
                  <th className="text-right py-2 px-3">Avg/Day</th>
                  <th className="text-left py-2 px-3">Last Used</th>
                  <th className="text-center py-2 px-3">Trend</th>
                </tr>
              </thead>
              <tbody>
                {typedData.map((row) => (
                  <tr key={row.itemId} className="border-b border-slate-800/70">
                    <td className="py-2 px-3 font-medium">{row.name}</td>
                    <td className="py-2 px-3 font-mono text-xs text-slate-400">{row.barcode || "-"}</td>
                    <td className="py-2 px-3 text-right">{row.quantityUsed}</td>
                    <td className="py-2 px-3 text-right">{row.averageUsagePerDay}</td>
                    <td className="py-2 px-3">{formatDate(row.lastUsed)}</td>
                    <td className="py-2 px-3 text-center">
                      <span className="inline-block rounded px-2 py-0.5 text-xs font-semibold bg-cyan-500/20 text-cyan-200">
                        {row.trend}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </GlassBubbleCard>
      ) : (
        <GlassBubbleCard className="text-slate-400 text-sm">
          Run the report to view usage data.
        </GlassBubbleCard>
      )}
    </main>
  );
}
