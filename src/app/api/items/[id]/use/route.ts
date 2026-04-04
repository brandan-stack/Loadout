// src/app/api/items/[id]/use/route.ts - Use from inventory (atomic transaction with underflow prevention)

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireRequestContext } from "@/lib/request-context";
import { z } from "zod";

const dbAny = prisma as any;

const useInventorySchema = z.object({
  quantity: z.number().int().min(1),
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
    const { quantity, notes, lotNumber } = useInventorySchema.parse(body);

    const result = await dbAny.$transaction(async (tx: any) => {
      const item = await tx.item.findUnique({
        where: { id },
      });

      if (!item || item.organizationId !== auth.context.organizationId) {
        throw new Error("Item not found");
      }

      // Prevent negative inventory
      if (item.quantityOnHand < quantity) {
        throw new Error(
          `Insufficient quantity. Available: ${item.quantityOnHand}, requested: ${quantity}`
        );
      }

      // Create transaction record
      await tx.inventoryTransaction.create({
        data: {
          itemId: id,
          type: "use",
          quantity,
          lotNumber,
          notes,
        },
      });

      // Update item quantity
      const updatedItem = await tx.item.update({
        where: { id },
        data: {
          quantityOnHand: item.quantityOnHand - quantity,
          quantityUsedTotal: item.quantityUsedTotal + quantity,
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
    if (error instanceof Error) {
      if (error.message.includes("not found")) {
        return NextResponse.json({ error: "Item not found" }, { status: 404 });
      }
      if (error.message.includes("Insufficient")) {
        return NextResponse.json({ error: error.message }, { status: 400 });
      }
    }
    console.error("Use inventory error:", error);
    return NextResponse.json({ error: "Failed to use inventory" }, { status: 500 });
  }
}
