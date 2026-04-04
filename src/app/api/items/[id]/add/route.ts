// src/app/api/items/[id]/add/route.ts - Add to inventory (atomic transaction)

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireRequestContext } from "@/lib/request-context";
import { z } from "zod";

const dbAny = prisma as any;

const addInventorySchema = z.object({
  quantity: z.number().int().min(1),
  supplierCost: z.number().min(0).optional(),
  notes: z.string().optional(),
  lotNumber: z.string().optional(),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = requireRequestContext(req);
    if (!auth.ok) {
      return auth.response;
    }

    const { id } = await params;
    const body = await req.json();
    const { quantity, supplierCost, notes, lotNumber } = addInventorySchema.parse(body);

    // Use Prisma transaction to ensure atomic operation
    const result = await dbAny.$transaction(async (tx: any) => {
      const item = await tx.item.findUnique({
        where: { id },
      });

      if (!item || item.organizationId !== auth.context.organizationId) {
        throw new Error("Item not found");
      }

      // Create transaction record
      await tx.inventoryTransaction.create({
        data: {
          itemId: id,
          type: "add",
          quantity,
          lotNumber,
          notes,
        },
      });

      // Update item quantity and cost
      const updatedItem = await tx.item.update({
        where: { id },
        data: {
          quantityOnHand: item.quantityOnHand + quantity,
          lastUnitCost: supplierCost ?? item.lastUnitCost,
        },
        include: {
          photos: true,
          preferredSupplier: true,
        },
      });

      return updatedItem;
    });

    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    if (error instanceof Error && error.message.includes("not found")) {
      return NextResponse.json({ error: "Item not found" }, { status: 404 });
    }
    console.error("Add inventory error:", error);
    return NextResponse.json({ error: "Failed to add inventory" }, { status: 500 });
  }
}
