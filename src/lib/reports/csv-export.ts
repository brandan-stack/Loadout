// src/lib/reports/csv-export.ts - CSV export utilities

import {
  LowStockItem,
  UsageReport,
  DeadStockItem,
  FastMover,
} from "./types";

/**
 * Convert low-stock items to CSV
 */
export function lowStockToCSV(items: LowStockItem[]): string {
  const headers = [
    "Item Name",
    "Barcode",
    "Quantity On Hand",
    "Amber Threshold",
    "Red Threshold",
    "Severity",
    "Preferred Supplier",
    "Lead Time (days)",
  ];

  const rows = items.map((item) => [
    item.name,
    item.barcode || "",
    item.quantityOnHand.toString(),
    item.lowStockAmberThreshold.toString(),
    item.lowStockRedThreshold.toString(),
    item.severity.toUpperCase(),
    item.preferredSupplier?.name || "",
    item.preferredSupplier?.leadTimeD.toString() || "",
  ]);

  return [headers, ...rows].map((row) => row.map(escapeCSV).join(",")).join("\n");
}

/**
 * Convert usage report to CSV
 */
export function usageReportToCSV(items: UsageReport[]): string {
  const headers = [
    "Item Name",
    "Barcode",
    "Period Start",
    "Period End",
    "Quantity Used",
    "Avg Usage/Day",
    "Last Used",
    "Trend",
  ];

  const rows = items.map((item) => [
    item.name,
    item.barcode || "",
    item.periodStart.toISOString().split("T")[0],
    item.periodEnd.toISOString().split("T")[0],
    item.quantityUsed.toString(),
    item.averageUsagePerDay.toString(),
    item.lastUsed?.toISOString().split("T")[0] || "",
    item.trend,
  ]);

  return [headers, ...rows].map((row) => row.map(escapeCSV).join(",")).join("\n");
}

/**
 * Convert dead-stock items to CSV
 */
export function deadStockToCSV(items: DeadStockItem[]): string {
  const headers = [
    "Item Name",
    "Barcode",
    "Quantity On Hand",
    "Created Date",
    "Last Used",
    "Days Unused",
  ];

  const rows = items.map((item) => [
    item.name,
    item.barcode || "",
    item.quantityOnHand.toString(),
    item.createdAt.toISOString().split("T")[0],
    item.lastUsed?.toISOString().split("T")[0] || "Never",
    item.daysUnused.toString(),
  ]);

  return [headers, ...rows].map((row) => row.map(escapeCSV).join(",")).join("\n");
}

/**
 * Convert fast-movers to CSV
 */
export function fastMoversToCSV(items: FastMover[]): string {
  const headers = [
    "Item Name",
    "Barcode",
    "Quantity On Hand",
    "Total Used",
    "Usage/Day",
    "Reorder Priority",
  ];

  const rows = items.map((item) => [
    item.name,
    item.barcode || "",
    item.quantityOnHand.toString(),
    item.totalUsed.toString(),
    item.usagePerDay.toString(),
    item.reorderPriority.toUpperCase(),
  ]);

  return [headers, ...rows].map((row) => row.map(escapeCSV).join(",")).join("\n");
}

/**
 * Escape CSV values
 */
function escapeCSV(value: string): string {
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

/**
 * Download CSV file to user's device
 */
export function downloadCSV(
  csv: string,
  filename: string
): void {
  const blob = new Blob([csv], { type: "text/csv" });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  window.URL.revokeObjectURL(url);
}
