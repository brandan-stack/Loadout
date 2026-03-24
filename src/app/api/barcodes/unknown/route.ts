// src/app/api/barcodes/unknown/route.ts - Create item from unknown barcode

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { z } from "zod";

const dbAny = prisma as any;

const unknownBarcodeSchema = z.object({
  barcode: z.string().min(1),
  itemName: z.string().min(1, "Item name required"),
  quantityOnHand: z.number().min(0).default(1),
  lowStockAmberThreshold: z.number().min(0).default(10),
  lowStockRedThreshold: z.number().min(0).default(5),
});

type UnknownBarcodeInput = z.infer<typeof unknownBarcodeSchema>;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const data = unknownBarcodeSchema.parse(body);
    const normalized = data.barcode.trim().toUpperCase();

    // Check barcode doesn't already exist
    const existing = await prisma.item.findUnique({
      where: { barcode: normalized },
    });

    if (existing) {
      return NextResponse.json(
        { error: "Barcode already exists" },
        { status: 409 }
      );
    }

    // Create new item
    const item = await dbAny.item.create({
      data: {
        barcode: normalized,
        name: data.itemName,
        quantityOnHand: data.quantityOnHand,
        quantityUsedTotal: 0,
        lowStockAmberThreshold: data.lowStockAmberThreshold,
        lowStockRedThreshold: data.lowStockRedThreshold,
      },
      include: {
        photos: true,
        preferredSupplier: true,
      },
    });

    return NextResponse.json(item, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    console.error("Unknown barcode handler error:", error);
    return NextResponse.json(
      { error: "Failed to create item from barcode" },
      { status: 500 }
    );
  }
}
