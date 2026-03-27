// src/lib/reports/query-service.ts - Report query service

import { prisma } from "@/lib/db";
import {
  ReportFilters,
  LowStockItem,
  UsageReport,
  DeadStockItem,
  FastMover,
} from "./types";

/**
 * Generate low-stock report
 */
export async function getLowStockReport(
  filters: ReportFilters
): Promise<LowStockItem[]> {
  const allItems = (await prisma.item.findMany({
    include: {
      preferredSupplier: true,
    },
  } as any)) as any[];

  const items = allItems.filter(
    (item: any) =>
      item.quantityOnHand <= item.lowStockRedThreshold ||
      item.quantityOnHand <= item.lowStockAmberThreshold
  );

  // Map to LowStockItem with severity
  const lowStock = items
    .map((item: any) => ({
      id: item.id,
      name: item.name,
      barcode: item.barcode,
      quantityOnHand: item.quantityOnHand,
      lowStockAmberThreshold: item.lowStockAmberThreshold,
      lowStockRedThreshold: item.lowStockRedThreshold,
      severity:
        item.quantityOnHand <= item.lowStockRedThreshold
          ? ("red" as const)
          : ("amber" as const),
      preferredSupplier: item.preferredSupplier || undefined,
    }))
    .sort((a, b) => {
      if (filters.sortBy === "quantity") {
        return filters.sortOrder === "asc"
          ? a.quantityOnHand - b.quantityOnHand
          : b.quantityOnHand - a.quantityOnHand;
      }
      return filters.sortOrder === "asc"
        ? a.name.localeCompare(b.name)
        : b.name.localeCompare(a.name);
    });

  return lowStock;
}

/**
 * Generate usage period report
 */
export async function getUsageReport(
  filters: ReportFilters
): Promise<UsageReport[]> {
  const dateFrom = filters.dateFrom || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // 30 days ago
  const dateTo = filters.dateTo || new Date();

  const items = (await prisma.item.findMany({
    include: {
      transactions: {
        where: {
          type: "use",
          createdAt: {
            gte: dateFrom,
            lte: dateTo,
          },
        },
        orderBy: { createdAt: "desc" },
      },
    },
  } as any)) as any[];

  const daysInPeriod =
    (dateTo.getTime() - dateFrom.getTime()) / (1000 * 60 * 60 * 24);

  const usageReports = items
    .map((item: any) => {
      const quantityUsed = item.transactions.reduce(
        (sum: number, t: any) => sum + t.quantity,
        0
      );
      const lastUsed =
        item.transactions.length > 0 ? item.transactions[0].createdAt : undefined;

      return {
        itemId: item.id,
        name: item.name,
        barcode: item.barcode,
        periodStart: dateFrom,
        periodEnd: dateTo,
        quantityUsed,
        averageUsagePerDay: Math.round((quantityUsed / daysInPeriod) * 100) / 100,
        lastUsed,
        trend: quantityUsed > 10 ? ("increasing" as const) : ("stable" as const),
      };
    })
    .filter((r) => r.quantityUsed > 0)
    .sort((a, b) =>
      filters.sortOrder === "asc"
        ? a.quantityUsed - b.quantityUsed
        : b.quantityUsed - a.quantityUsed
    );

  return usageReports;
}

/**
 * Generate dead-stock report (items not used for X days)
 */
export async function getDeadStockReport(
  filters: ReportFilters
): Promise<DeadStockItem[]> {
  const daysUnusedThreshold = 90; // 3 months
  const cutoffDate = new Date(Date.now() - daysUnusedThreshold * 24 * 60 * 60 * 1000);

  const items = (await prisma.item.findMany({
    include: {
      transactions: {
        where: { type: "use" },
        orderBy: { createdAt: "desc" },
        take: 1,
      },
    },
  } as any)) as any[];

  const deadStock = items
    .map((item: any) => {
      const lastUsed = item.transactions[0]?.createdAt;
      const daysUnused = lastUsed
        ? Math.floor((Date.now() - lastUsed.getTime()) / (1000 * 60 * 60 * 24))
        : Math.floor((Date.now() - item.createdAt.getTime()) / (1000 * 60 * 60 * 24));

      return {
        id: item.id,
        name: item.name,
        barcode: item.barcode,
        quantityOnHand: item.quantityOnHand,
        createdAt: item.createdAt,
        lastUsed,
        daysUnused,
      };
    })
    .filter((item) => item.daysUnused >= daysUnusedThreshold)
    .sort((a, b) => b.daysUnused - a.daysUnused);

  return deadStock;
}

/**
 * Generate fast-movers report
 */
export async function getFastMoversReport(
  filters: ReportFilters
): Promise<FastMover[]> {
  const dateFrom = filters.dateFrom || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // 30 days ago

  const items = (await prisma.item.findMany({
    include: {
      transactions: {
        where: {
          type: "use",
          createdAt: { gte: dateFrom },
        },
      },
    },
  } as any)) as any[];

  const daysInPeriod =
    (Date.now() - dateFrom.getTime()) / (1000 * 60 * 60 * 24);

  const fastMovers = items
    .map((item: any) => {
      const quantityUsed = item.transactions.reduce(
        (sum: number, t: any) => sum + t.quantity,
        0
      );
      const usagePerDay = quantityUsed / daysInPeriod;

      return {
        id: item.id,
        name: item.name,
        barcode: item.barcode,
        quantityOnHand: item.quantityOnHand,
        totalUsed: item.quantityUsedTotal,
        usagePerDay: Math.round(usagePerDay * 100) / 100,
        reorderPriority: (
          usagePerDay > 10
            ? "high"
            : usagePerDay > 5
              ? "medium"
              : "low"
        ) as "high" | "medium" | "low",
      };
    })
    .filter((item) => item.usagePerDay > 0)
    .sort((a, b) => b.usagePerDay - a.usagePerDay);

  return fastMovers;
}
