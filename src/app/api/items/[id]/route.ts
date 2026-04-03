// src/app/api/items/[id]/route.ts - Individual item CRUD

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { z } from "zod";

const dbAny = prisma as any;

const itemUpdateSchema = z.object({
  name: z.string().min(1).optional(),
  manufacturer: z.string().min(1).optional(),
  partNumber: z.string().min(1).optional(),
  modelNumber: z.string().min(1).optional(),
  serialNumber: z.string().min(1).optional(),
  barcode: z.string().optional(),
  description: z.string().optional(),
  photoUrl: z.string().optional().nullable(),
  quantityOnHand: z.number().int().min(0).optional(),
  lowStockAmberThreshold: z.number().int().min(1).optional(),
  lowStockRedThreshold: z.number().int().min(0).optional(),
  preferredSupplierId: z.string().optional(),
  lastUnitCost: z.number().min(0).optional(),
  unitOfMeasure: z.string().optional(),
  enableLotTracking: z.boolean().optional(),
  enableExpiryTracking: z.boolean().optional(),
}).superRefine((data, ctx) => {
  if (
    data.lowStockAmberThreshold !== undefined &&
    data.lowStockRedThreshold !== undefined &&
    data.lowStockRedThreshold > data.lowStockAmberThreshold
  ) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Critical stock alert must be less than or equal to low stock alert",
      path: ["lowStockRedThreshold"],
    });
  }
});

type ItemUpdate = z.infer<typeof itemUpdateSchema>;

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const item = await dbAny.item.findUnique({
      where: { id },
      include: {
        photos: true,
        preferredSupplier: true,
        transactions: {
          orderBy: { createdAt: "desc" },
          take: 50,
        },
      },
    });
    if (!item) {
      return NextResponse.json({ error: "Item not found" }, { status: 404 });
    }
    return NextResponse.json(item);
  } catch (error) {
    console.error("Item GET error:", error);
    return NextResponse.json({ error: "Failed to fetch item" }, { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const data = itemUpdateSchema.parse(body);

    // Check barcode uniqueness if updating
    if (data.barcode) {
      const existing = await prisma.item.findUnique({
        where: { barcode: data.barcode },
      });
      if (existing && existing.id !== id) {
        return NextResponse.json(
          { error: "Barcode already exists" },
          { status: 409 }
        );
      }
    }

    const item = await dbAny.item.update({
      where: { id },
      data,
      include: {
        photos: true,
        preferredSupplier: true,
      },
    });

    return NextResponse.json(item);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    console.error("Item PUT error:", error);
    return NextResponse.json({ error: "Failed to update item" }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    // Delete related photos first
    await prisma.itemPhoto.deleteMany({
      where: { itemId: id },
    });

    // Delete item
    await prisma.item.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Item DELETE error:", error);
    return NextResponse.json({ error: "Failed to delete item" }, { status: 500 });
  }
}
