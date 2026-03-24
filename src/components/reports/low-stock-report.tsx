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
    <div className="container mx-auto max-w-6xl px-3 py-4 sm:p-4">
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
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="severity">Severity (Red First)</option>
              <option value="quantity">Quantity (Low First)</option>
              <option value="name">Item Name (A-Z)</option>
            </select>
          </div>
          <button
            onClick={handleGenerateReport}
            disabled={loading}
            className="w-full sm:w-auto px-4 sm:px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-400"
          >
            {loading ? "Generating..." : "Generate Report"}
          </button>
          <button
            onClick={handleDownloadCSV}
            disabled={!data || data.length === 0}
            className="w-full sm:w-auto px-4 sm:px-6 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:bg-gray-400"
          >
            Download CSV
          </button>
        </div>
      </GlassBubbleCard>

      {error && (
        <GlassBubbleCard className="mb-6 bg-red-50 border-red-500">
          <p className="text-red-700">{error}</p>
        </GlassBubbleCard>
      )}

      {data && data.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[44rem] text-sm">
            <thead>
              <tr className="border-b-2 border-gray-300">
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
                  className={
                    item.severity === "red"
                      ? "bg-red-50 border-b border-red-200"
                      : "bg-amber-50 border-b border-amber-200"
                  }
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
      ) : (
        <GlassBubbleCard className="text-center text-gray-500">
          <p>No low-stock items. Click &quot;Generate Report&quot; to check inventory levels.</p>
        </GlassBubbleCard>
      )}
    </div>
  );
}
