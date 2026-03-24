import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import type { InventoryTransaction, Item } from "@prisma/client";

type TransactionWithItem = InventoryTransaction & {
  item: Pick<Item, "id" | "name" | "barcode">;
};

export async function GET(req: NextRequest) {
  const withinDays = parseInt(req.nextUrl.searchParams.get("withinDays") ?? "30", 10);
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() + withinDays);

  const expiring = await prisma.inventoryTransaction.findMany({
    where: {
      expiryDate: { not: null, lte: cutoff },
      type: "add",
    },
    include: {
      item: { select: { id: true, name: true, barcode: true } },
    },
    orderBy: { expiryDate: "asc" },
  });

  const now = new Date();
  const results = expiring.map((tx: TransactionWithItem) => {
    const daysLeft = tx.expiryDate
      ? Math.ceil((tx.expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
      : null;
    return {
      txId: tx.id,
      itemId: tx.item.id,
      itemName: tx.item.name,
      barcode: tx.item.barcode,
      quantity: tx.quantity,
      lotNumber: tx.lotNumber,
      expiryDate: tx.expiryDate,
      daysLeft,
      severity: daysLeft !== null && daysLeft <= 0 ? "expired" : daysLeft !== null && daysLeft <= 7 ? "critical" : "warning",
    };
  });

  return NextResponse.json(results);
}
