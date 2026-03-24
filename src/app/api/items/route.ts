// src/app/api/items/route.ts - Item CRUD API

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { z } from "zod";

const dbAny = prisma as any;

const itemSchema = z.object({
  name: z.string().min(1, "Name required"),
  manufacturer: z.string().min(1, "Manufacturer required"),
  partNumber: z.string().min(1, "Part number required"),
  modelNumber: z.string().min(1, "Model number required"),
  serialNumber: z.string().min(1, "Serial number required"),
  barcode: z.string().optional(),
  description: z.string().optional(),
  quantityOnHand: z.number().min(0).default(0),
  lowStockAmberThreshold: z.number().min(1, "Low stock alert must be at least 1"),
  lowStockRedThreshold: z.number().min(0, "Critical stock alert must be 0 or more"),
  preferredSupplierId: z.string().min(1, "Supplier required"),
  lastUnitCost: z.number().min(0).optional(),
  unitOfMeasure: z.string().default("units"),
  enableLotTracking: z.boolean().default(false),
  enableExpiryTracking: z.boolean().default(false),
}).refine((data) => data.lowStockRedThreshold <= data.lowStockAmberThreshold, {
  message: "Critical stock alert must be less than or equal to low stock alert",
  path: ["lowStockRedThreshold"],
});

type ItemInput = z.infer<typeof itemSchema>;

export async function GET() {
  try {
    const items = await dbAny.item.findMany({
      include: {
        photos: true,
        preferredSupplier: true,
      },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(items);
  } catch (error) {
    console.error("Item GET error:", error);
    return NextResponse.json({ error: "Failed to fetch items" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const data = itemSchema.parse(body);

    // Check barcode uniqueness if provided
    if (data.barcode) {
      const existing = await prisma.item.findUnique({
        where: { barcode: data.barcode },
      });
      if (existing) {
        return NextResponse.json(
          { error: "Barcode already exists" },
          { status: 409 }
        );
      }
    }

    const item = await dbAny.item.create({
      data: {
        ...data,
        quantityUsedTotal: 0,
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
    console.error("Item POST error:", error);
    return NextResponse.json({ error: "Failed to create item" }, { status: 500 });
  }
}
