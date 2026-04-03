"use client";

import Link from "next/link";
import { GlassBubbleCard } from "@/components/ui/glass-bubble-card";
import { useFastMoversReport } from "@/hooks/useReports";
import { downloadCSV, fastMoversToCSV } from "@/lib/reports/csv-export";

interface FastMoverRow {
  id: string;
  name: string;
  barcode?: string | null;
  quantityOnHand: number;
  totalUsed: number;
  usagePerDay: number;
  reorderPriority: "high" | "medium" | "low";
}

export default function FastMoversReportPage() {
  const { data, loading, error, generateReport } = useFastMoversReport();
  const typedData = (data || []) as FastMoverRow[];

  const handleGenerateReport = () => {
    generateReport({
      sortBy: "usage",
      sortOrder: "desc",
    });
  };

  const handleDownloadCSV = () => {
    const csv = fastMoversToCSV(typedData);
    downloadCSV(csv, `fast-movers-report-${new Date().toISOString().split("T")[0]}.csv`);
  };

  const priorityClass = (priority: FastMoverRow["reorderPriority"]) => {
    if (priority === "high") return "bg-red-500/20 text-red-200";
    if (priority === "medium") return "bg-amber-500/20 text-amber-200";
    return "bg-slate-700/60 text-slate-300";
  };

  return (
    <main className="mx-auto w-full max-w-[1280px] px-4 sm:px-6 lg:px-8 py-8 form-screen">
      <h1 className="text-2xl sm:text-3xl font-bold mb-6">Fast Movers Report</h1>

      <GlassBubbleCard className="mb-6">
        <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
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
            <table className="w-full min-w-[42rem] text-sm">
              <thead>
                <tr className="border-b border-slate-700">
                  <th className="text-left py-2 px-3">Item</th>
                  <th className="text-left py-2 px-3">Barcode</th>
                  <th className="text-right py-2 px-3">On Hand</th>
                  <th className="text-right py-2 px-3">Total Used</th>
                  <th className="text-right py-2 px-3">Usage/Day</th>
                  <th className="text-center py-2 px-3">Priority</th>
                </tr>
              </thead>
              <tbody>
                {typedData.map((row) => (
                  <tr key={row.id} className="border-b border-slate-800/70">
                    <td className="py-2 px-3 font-medium">{row.name}</td>
                    <td className="py-2 px-3 font-mono text-xs text-slate-400">{row.barcode || "-"}</td>
                    <td className="py-2 px-3 text-right">{row.quantityOnHand}</td>
                    <td className="py-2 px-3 text-right">{row.totalUsed}</td>
                    <td className="py-2 px-3 text-right font-semibold">{row.usagePerDay}</td>
                    <td className="py-2 px-3 text-center">
                      <span className={`inline-block rounded px-2 py-0.5 text-xs font-semibold ${priorityClass(row.reorderPriority)}`}>
                        {row.reorderPriority.toUpperCase()}
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
          Run the report to view fast-moving items.
        </GlassBubbleCard>
      )}
    </main>
  );
}
