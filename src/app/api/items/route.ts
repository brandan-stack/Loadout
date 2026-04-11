// src/app/api/items/route.ts - Item CRUD API

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUserAccess } from "@/lib/permissions";
import { Prisma } from "@prisma/client";
import { z } from "zod";

const dbAny = prisma as any;

function normalizeOptionalText(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed ? trimmed : undefined;
}

const itemSchema = z.object({
  name: z.string().min(1, "Name required"),
  manufacturer: z.string().optional(),
  partNumber: z.string().optional(),
  modelNumber: z.string().optional(),
  category: z.string().optional(),
  serialNumber: z.string().optional(),
  barcode: z.string().optional(),
  description: z.string().optional(),
  photoUrl: z.string().optional(),
  quantityOnHand: z.number().int().min(0).default(0),
  lowStockAmberThreshold: z.number().int().min(1).default(5),
  lowStockRedThreshold: z.number().int().min(0).default(2),
  preferredSupplierId: z.string().optional(),
  lastUnitCost: z.number().min(0).optional(),
  unitOfMeasure: z.string().default("units"),
  enableLotTracking: z.boolean().default(false),
  enableExpiryTracking: z.boolean().default(false),
  locationId: z.string().optional(),
}).refine(
  (data) => data.lowStockRedThreshold <= data.lowStockAmberThreshold,
  { message: "Critical stock alert must be ≤ low stock alert", path: ["lowStockRedThreshold"] }
);

type ItemInput = z.infer<typeof itemSchema>;

export async function GET(request: NextRequest) {
  try {
    const access = await requireUserAccess(request);
    if (!access.ok) {
      return access.response;
    }

    if (!access.access.canViewInventory) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const items = await dbAny.item.findMany({
      where: { organizationId: access.access.organizationId },
      select: {
        id: true,
        name: true,
        manufacturer: true,
        partNumber: true,
        modelNumber: true,
        category: true,
        description: true,
        photoUrl: true,
        quantityOnHand: true,
        lowStockAmberThreshold: true,
        lowStockRedThreshold: true,
        preferredSupplier: { select: { id: true, name: true } },
        defaultLocation: { select: { id: true, name: true } },
        lastUnitCost: true,
        unitOfMeasure: true,
        lastMovementAt: true,
        lastMovementType: true,
        _count: { select: { jobParts: true } },
      },
      orderBy: [{ lastMovementAt: "desc" }, { name: "asc" }],
    });

    return NextResponse.json(items);
  } catch (error) {
    console.error("Item GET error:", error);
    return NextResponse.json({ error: "Failed to fetch items" }, { status: 500 });
  }
}


export async function POST(request: NextRequest) {
  try {
    const access = await requireUserAccess(request);
    if (!access.ok) {
      return access.response;
    }

    if (!access.access.canAddInventory) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const sanitizedBody = {
      ...body,
      name: typeof body?.name === "string" ? body.name.trim() : body?.name,
      manufacturer: normalizeOptionalText(body?.manufacturer),
      partNumber: normalizeOptionalText(body?.partNumber),
      modelNumber: normalizeOptionalText(body?.modelNumber),
      category: normalizeOptionalText(body?.category),
      serialNumber: normalizeOptionalText(body?.serialNumber),
      barcode: normalizeOptionalText(body?.barcode),
      description: normalizeOptionalText(body?.description),
      photoUrl: typeof body?.photoUrl === "string" && body.photoUrl ? body.photoUrl : undefined,
      preferredSupplierId: normalizeOptionalText(body?.preferredSupplierId),
      unitOfMeasure: normalizeOptionalText(body?.unitOfMeasure),
    };
    const data = itemSchema.parse(sanitizedBody);
    const { locationId, ...itemData } = data;

    // Check barcode uniqueness if provided
    if (itemData.barcode) {
      const existing = await prisma.item.findFirst({
        where: {
          organizationId: access.access.organizationId,
          barcode: itemData.barcode,
        },
      });
      if (existing) {
        return NextResponse.json(
          { error: "Barcode already exists" },
          { status: 409 }
        );
      }
    }

    if (itemData.preferredSupplierId) {
      const supplier = await prisma.supplier.findFirst({
        where: {
          id: itemData.preferredSupplierId,
          organizationId: access.access.organizationId,
        },
        select: { id: true },
      });
      if (!supplier) {
        return NextResponse.json({ error: "Supplier not found" }, { status: 404 });
      }
    }

    if (locationId) {
      const location = await prisma.location.findFirst({
        where: {
          id: locationId,
          organizationId: access.access.organizationId,
        },
        select: { id: true },
      });
      if (!location) {
        return NextResponse.json({ error: "Location not found" }, { status: 404 });
      }
    }

    const item = await dbAny.item.create({
      data: {
        ...itemData,
        organizationId: access.access.organizationId,
        quantityUsedTotal: 0,
        defaultLocationId: locationId,
        lastMovementAt: new Date(),
        lastMovementType: "receive_stock",
      },
      include: {
        preferredSupplier: { select: { id: true, name: true } },
        defaultLocation: { select: { id: true, name: true } },
        _count: { select: { jobParts: true } },
      },
    });

    if (locationId) {
      await dbAny.locationStock.create({
        data: {
          locationId,
          itemId: item.id,
          quantityOnHand: itemData.quantityOnHand ?? 0,
        },
      });
    }

    return NextResponse.json(item, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      const message = error.errors[0]?.message || "Invalid item data";
      return NextResponse.json({ error: message }, { status: 400 });
    }
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return NextResponse.json({ error: "Barcode already exists" }, { status: 409 });
    }
    console.error("Item POST error:", error);
    return NextResponse.json({ error: "Failed to create item" }, { status: 500 });
  }
}
