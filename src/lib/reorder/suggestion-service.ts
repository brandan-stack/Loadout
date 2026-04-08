// src/lib/reorder/suggestion-service.ts - Reorder suggestion engine

import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { ReorderRecommendation, ReorderRecommendationSummary } from "./types";

type ReorderRecommendationSnapshot = {
  recommendations: ReorderRecommendation[];
  summary: ReorderRecommendationSummary;
  linkedSupplierCount: number;
};

type ReorderSourceItem = {
  id: string;
  name: string;
  barcode: string | null;
  quantityOnHand: number;
  preferredSupplier: {
    id: string;
    name: string;
    leadTimeD: number;
  } | null;
};

type UsageTotalRow = {
  itemId: string;
  usedQuantity: number | bigint | null;
};

const PRIORITY_ORDER: Record<ReorderRecommendation["priority"], number> = {
  urgent: 0,
  high: 1,
  medium: 2,
  low: 3,
};

function resolvePriority(quantityOnHand: number, minQuantity: number) {
  if (quantityOnHand === 0) {
    return "urgent" as const;
  }

  if (quantityOnHand < minQuantity) {
    return "high" as const;
  }

  if (quantityOnHand < minQuantity * 1.5) {
    return "medium" as const;
  }

  return "low" as const;
}

function buildRecommendation(
  item: ReorderSourceItem,
  usageInPeriod: number
): ReorderRecommendation {
  const usagePerDay = usageInPeriod / 30;
  const leadTimeDays = item.preferredSupplier?.leadTimeD || 7;
  const minQuantity = Math.ceil(leadTimeDays * usagePerDay);
  const maxQuantity = minQuantity * 2;
  const priority = resolvePriority(item.quantityOnHand, minQuantity);
  const suggestedOrderQuantity = Math.max(0, maxQuantity - item.quantityOnHand);
  const estimatedArrivalDate = new Date(
    Date.now() + leadTimeDays * 24 * 60 * 60 * 1000
  );

  let reason = "";
  if (item.quantityOnHand === 0) {
    reason = "Out of stock - urgent reorder";
  } else if (item.quantityOnHand < minQuantity) {
    reason = `Below minimum safety stock (${minQuantity.toFixed(1)})`;
  } else if (usagePerDay === 0) {
    reason = "No recent usage - monitor stock";
  } else {
    const stockRatio = maxQuantity > 0 ? Math.round((item.quantityOnHand / maxQuantity) * 100) : 0;
    reason = `At ${stockRatio}% of maximum`;
  }

  return {
    itemId: item.id,
    name: item.name,
    barcode: item.barcode,
    currentQuantity: item.quantityOnHand,
    suggestedQuantity: maxQuantity,
    suggestedOrderQuantity,
    minQuantity: Math.ceil(minQuantity),
    maxQuantity: Math.ceil(maxQuantity),
    usagePerDay: Math.round(usagePerDay * 100) / 100,
    leadTimeDays,
    estimatedArrivalDate,
    priority,
    preferredSupplier: item.preferredSupplier ?? undefined,
    reason,
  };
}

async function loadReorderInputs(organizationId: string) {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const [items, usageTotals] = await Promise.all([
    prisma.item.findMany({
      where: { organizationId },
      select: {
        id: true,
        name: true,
        barcode: true,
        quantityOnHand: true,
        preferredSupplier: {
          select: {
            id: true,
            name: true,
            leadTimeD: true,
          },
        },
      },
    }),
    prisma.$queryRaw<UsageTotalRow[]>(Prisma.sql`
      SELECT
        tx."itemId",
        COALESCE(SUM(tx.quantity), 0)::int AS "usedQuantity"
      FROM "InventoryTransaction" tx
      INNER JOIN "Item" item ON item.id = tx."itemId"
      WHERE item."organizationId" = ${organizationId}
        AND tx.type = 'use'
        AND tx."createdAt" >= ${thirtyDaysAgo}
      GROUP BY tx."itemId"
    `),
  ]);

  const usageByItem = new Map(
    usageTotals.map((row) => [row.itemId, Number(row.usedQuantity ?? 0)])
  );

  return {
    items: items as ReorderSourceItem[],
    usageByItem,
  };
}

async function getReorderRecommendationSnapshotInternal(
  organizationId: string,
  limit?: number,
  includeRecommendations = true
): Promise<ReorderRecommendationSnapshot> {
  const { items, usageByItem } = await loadReorderInputs(organizationId);

  const recommendations: ReorderRecommendation[] = [];
  let urgent = 0;
  let high = 0;
  let total = 0;
  let linkedSupplierCount = 0;

  for (const item of items) {
    const recommendation = buildRecommendation(item, usageByItem.get(item.id) ?? 0);

    if (recommendation.priority === "low") {
      continue;
    }

    total += 1;

    if (recommendation.priority === "urgent") {
      urgent += 1;
    }

    if (recommendation.priority === "high") {
      high += 1;
    }

    if (recommendation.preferredSupplier) {
      linkedSupplierCount += 1;
    }

    if (includeRecommendations) {
      recommendations.push(recommendation);
    }
  }

  if (includeRecommendations) {
    recommendations.sort((left, right) => {
      const priorityDiff = PRIORITY_ORDER[left.priority] - PRIORITY_ORDER[right.priority];
      if (priorityDiff !== 0) {
        return priorityDiff;
      }

      return right.usagePerDay - left.usagePerDay;
    });
  }

  return {
    recommendations:
      includeRecommendations && typeof limit === "number"
        ? recommendations.slice(0, limit)
        : recommendations,
    summary: {
      urgent,
      high,
      total,
    },
    linkedSupplierCount,
  };
}

export async function getReorderRecommendations(
  organizationId: string,
  options?: { limit?: number }
): Promise<ReorderRecommendation[]> {
  const snapshot = await getReorderRecommendationSnapshotInternal(
    organizationId,
    options?.limit,
    true
  );

  return snapshot.recommendations;
}

export async function getReorderRecommendationSnapshot(
  organizationId: string,
  limit?: number
): Promise<ReorderRecommendationSnapshot> {
  return getReorderRecommendationSnapshotInternal(organizationId, limit, true);
}

export async function getReorderRecommendationSummary(
  organizationId: string
): Promise<ReorderRecommendationSummary> {
  const snapshot = await getReorderRecommendationSnapshotInternal(
    organizationId,
    undefined,
    false
  );

  return snapshot.summary;
}

/**
 * Calculate reorder recommendations for a specific item
 */
export async function getItemReorderRecommendation(
  organizationId: string,
  itemId: string
): Promise<ReorderRecommendation | null> {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const [item, usageAggregate] = await Promise.all([
    prisma.item.findFirst({
      where: { id: itemId, organizationId },
      select: {
        id: true,
        name: true,
        barcode: true,
        quantityOnHand: true,
        preferredSupplier: {
          select: {
            id: true,
            name: true,
            leadTimeD: true,
          },
        },
      },
    }),
    prisma.inventoryTransaction.aggregate({
      where: {
        itemId,
        type: "use",
        createdAt: { gte: thirtyDaysAgo },
      },
      _sum: {
        quantity: true,
      },
    }),
  ]);

  if (!item) {
    return null;
  }

  return buildRecommendation(
    item as ReorderSourceItem,
    usageAggregate._sum.quantity ?? 0
  );
}
