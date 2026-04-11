"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { GlassBubbleCard } from "@/components/ui/glass-bubble-card";
import { useCurrentUser } from "@/hooks/useCurrentUser";
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
  const router = useRouter();
  const { user, loading: userLoading } = useCurrentUser();
  const { data, loading, error, generateReport } = useUsageReport();
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  useEffect(() => {
    if (!userLoading && user && !user.canViewReports) {
      router.replace("/");
    }
  }, [router, user, userLoading]);

  if (userLoading || !user || !user.canViewReports) {
    return null;
  }

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
    <main className="mx-auto w-full max-w-[1280px] px-4 sm:px-6 lg:px-8 py-8 form-screen">
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
          <div className="space-y-3 sm:hidden">
            {typedData.map((row) => (
              <div key={row.itemId} className="rounded-2xl border border-slate-700/70 bg-slate-900/55 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-slate-100">{row.name}</p>
                    <p className="mt-1 font-mono text-xs text-slate-400">{row.barcode || "-"}</p>
                  </div>
                  <span className="inline-block rounded border border-white/10 bg-white/10 px-2 py-0.5 text-xs font-semibold text-slate-200">
                    {row.trend}
                  </span>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-slate-500">Used</p>
                    <p className="mt-0.5 text-slate-200">{row.quantityUsed}</p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-slate-500">Avg/Day</p>
                    <p className="mt-0.5 text-slate-200">{row.averageUsagePerDay}</p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-[10px] uppercase tracking-wider text-slate-500">Last Used</p>
                    <p className="mt-0.5 text-slate-200">{formatDate(row.lastUsed)}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className="hidden overflow-x-auto sm:block">
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
                      <span className="inline-block rounded px-2 py-0.5 text-xs font-semibold bg-white/10 text-slate-200 border border-white/10">
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
