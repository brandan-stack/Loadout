import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { z } from "zod";

const dbAny = prisma as any;

const TransferSchema = z.object({
  fromLocationId: z.string().min(1),
  toLocationId: z.string().min(1),
  itemId: z.string().min(1),
  quantity: z.number().int().min(1),
  notes: z.string().optional(),
});

export async function POST(req: NextRequest) {
  const body = await req.json();
  const parsed = TransferSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { fromLocationId, toLocationId, itemId, quantity, notes } = parsed.data;

  if (fromLocationId === toLocationId) {
    return NextResponse.json(
      { error: "Source and destination locations must differ" },
      { status: 400 }
    );
  }

  // Check source stock exists and has sufficient quantity
  const sourceStock = await dbAny.locationStock.findUnique({
    where: { locationId_itemId: { locationId: fromLocationId, itemId } },
  });

  if (!sourceStock || sourceStock.quantityOnHand < quantity) {
    return NextResponse.json({ error: "Insufficient stock at source location" }, { status: 400 });
  }

  // Atomic transfer
  await dbAny.$transaction([
    dbAny.locationStock.update({
      where: { locationId_itemId: { locationId: fromLocationId, itemId } },
      data: { quantityOnHand: { decrement: quantity } },
    }),
    dbAny.locationStock.upsert({
      where: { locationId_itemId: { locationId: toLocationId, itemId } },
      update: { quantityOnHand: { increment: quantity } },
      create: { locationId: toLocationId, itemId, quantityOnHand: quantity },
    }),
    dbAny.locationTransfer.create({
      data: { fromLocationId, toLocationId, itemId, quantity, notes },
    }),
  ]);

  return NextResponse.json({ success: true });
}

export async function GET(req: NextRequest) {
  const itemId = req.nextUrl.searchParams.get("itemId");

  const where = itemId ? { itemId } : {};
  const transfers = await dbAny.locationTransfer.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 50,
  });
  return NextResponse.json(transfers);
}
