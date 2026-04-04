// src/lib/reorder/suggestion-service.ts - Reorder suggestion engine

import { prisma } from "@/lib/db";
import { ReorderRecommendation } from "./types";

export async function getReorderRecommendations(
  organizationId: string
): Promise<ReorderRecommendation[]> {
  const items = (await prisma.item.findMany({
    where: { organizationId },
    include: {
      preferredSupplier: true,
      transactions: {
        where: { type: "use", createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } },
      },
    },
  } as any)) as any[];

  const recommendations: ReorderRecommendation[] = items
    .map((item: any) => {
      // Calculate usage velocity (30-day average)
      const usageInPeriod = item.transactions.reduce(
        (sum: number, t: any) => sum + t.quantity,
        0
      );
      const usagePerDay = usageInPeriod / 30;

      // Lead time
      const leadTimeDays = item.preferredSupplier?.leadTimeD || 7;

      // Safety stock (min quantity = lead time * daily usage)
      const minQuantity = Math.ceil(leadTimeDays * usagePerDay);

      // Max quantity = 2x safety stock
      const maxQuantity = minQuantity * 2;
      // Calculate priority
      let priority: "urgent" | "high" | "medium" | "low" = "low";
      if (item.quantityOnHand === 0) {
        priority = "urgent";
      } else if (item.quantityOnHand < minQuantity) {
        priority = "high";
      } else if (item.quantityOnHand < minQuantity * 1.5) {
        priority = "medium";
      }

      // Calculate suggested order quantity to reach max
      const suggestedOrderQuantity = Math.max(
        0,
        maxQuantity - item.quantityOnHand
      );

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
        reason = `At ${Math.round(
          (item.quantityOnHand / maxQuantity) * 100
        )}% of maximum`;
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
    })
    .filter((r) => r.priority !== "low") // Only show medium+ priority
    .sort((a, b) => {
      // Sort by priority
      const priorityOrder = { urgent: 0, high: 1, medium: 2, low: 3 };
      const priorityDiff =
        priorityOrder[a.priority] - priorityOrder[b.priority];
      if (priorityDiff !== 0) return priorityDiff;
      // Then by usage per day (high volume first)
      return b.usagePerDay - a.usagePerDay;
    });

  return recommendations;
}

/**
 * Calculate reorder recommendations for a specific item
 */
export async function getItemReorderRecommendation(
  organizationId: string,
  itemId: string
): Promise<ReorderRecommendation | null> {
  const item = (await prisma.item.findFirst({
    where: { id: itemId, organizationId },
    include: {
      preferredSupplier: true,
      transactions: {
        where: { type: "use", createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } },
      },
    },
  } as any)) as any;

  if (!item) return null;

  const usageInPeriod = item.transactions.reduce(
    (sum: number, t: any) => sum + t.quantity,
    0
  );
  const usagePerDay = usageInPeriod / 30;
  const leadTimeDays = item.preferredSupplier?.leadTimeD || 7;
  const minQuantity = Math.ceil(leadTimeDays * usagePerDay);
  const maxQuantity = minQuantity * 2;

  let priority: "urgent" | "high" | "medium" | "low" = "low";
  if (item.quantityOnHand === 0) {
    priority = "urgent";
  } else if (item.quantityOnHand < minQuantity) {
    priority = "high";
  } else if (item.quantityOnHand < minQuantity * 1.5) {
    priority = "medium";
  }

  const suggestedOrderQuantity = Math.max(
    0,
    maxQuantity - item.quantityOnHand
  );

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
    reason = `At ${Math.round(
      (item.quantityOnHand / maxQuantity) * 100
    )}% of maximum`;
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
