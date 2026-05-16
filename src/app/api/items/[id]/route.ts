// src/app/api/items/[id]/route.ts - Individual item CRUD

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUserAccess } from "@/lib/permissions";
import { z } from "zod";

const dbAny = prisma as any;

function normalizeOptionalText(value: unknown) {
  if (typeof value !== "string") {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function mapItemResponse(item: any) {
  return {
    ...item,
    manufacturer: item.manufacturer ?? undefined,
    partNumber: item.partNumber ?? undefined,
    modelNumber: item.modelNumber ?? undefined,
    category: item.category ?? undefined,
    description: item.description ?? undefined,
    photoUrl: item.photoUrl ?? undefined,
    preferredSupplierName: item.preferredSupplier?.name ?? undefined,
    preferredSupplierId: item.preferredSupplier?.id ?? undefined,
    defaultLocationName: item.defaultLocation?.name ?? undefined,
    defaultLocationId: item.defaultLocation?.id ?? undefined,
    lastUnitCost: item.lastUnitCost ?? undefined,
    marginPercent: item.marginPercent ?? 0,
    lastMovementAt: item.lastMovementAt?.toISOString(),
    lastMovementType: item.lastMovementType ?? undefined,
    linkedJobsCount: item._count?.jobParts ?? 0,
  };
}

const itemUpdateSchema = z.object({
  name: z.string().min(1).optional(),
  manufacturer: z.string().optional().nullable(),
  partNumber: z.string().optional().nullable(),
  modelNumber: z.string().optional().nullable(),
  category: z.string().optional().nullable(),
  serialNumber: z.string().optional().nullable(),
  barcode: z.string().optional(),
  description: z.string().optional().nullable(),
  photoUrl: z.string().optional().nullable(),
  quantityOnHand: z.number().int().min(0).optional(),
  lowStockAmberThreshold: z.number().int().min(1).optional(),
  lowStockRedThreshold: z.number().int().min(0).optional(),
  preferredSupplierId: z.string().optional().nullable(),
  locationId: z.string().optional().nullable(),
  lastUnitCost: z.number().min(0).optional(),
  marginPercent: z.number().min(0).optional(),
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
    const access = await requireUserAccess(req);
    if (!access.ok) {
      return access.response;
    }

    if (!access.access.canViewInventory) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;
    const item = await dbAny.item.findFirst({
      where: { id, organizationId: access.access.organizationId },
      include: {
        photos: true,
        preferredSupplier: true,
        defaultLocation: true,
        _count: { select: { jobParts: true } },
        transactions: {
          orderBy: { createdAt: "desc" },
          take: 50,
        },
      },
    });
    if (!item) {
      return NextResponse.json({ error: "Item not found" }, { status: 404 });
    }
    return NextResponse.json(mapItemResponse(item));
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
    const access = await requireUserAccess(req);
    if (!access.ok) {
      return access.response;
    }

    if (!access.access.canEditInventory) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;
    const body = await req.json();
    const data = itemUpdateSchema.parse({
      ...body,
      manufacturer: body?.manufacturer === undefined ? undefined : normalizeOptionalText(body.manufacturer),
      partNumber: body?.partNumber === undefined ? undefined : normalizeOptionalText(body.partNumber),
      modelNumber: body?.modelNumber === undefined ? undefined : normalizeOptionalText(body.modelNumber),
      category: body?.category === undefined ? undefined : normalizeOptionalText(body.category),
      serialNumber: body?.serialNumber === undefined ? undefined : normalizeOptionalText(body.serialNumber),
      description: body?.description === undefined ? undefined : normalizeOptionalText(body.description),
      photoUrl: body?.photoUrl === undefined ? undefined : normalizeOptionalText(body.photoUrl),
      preferredSupplierId: body?.preferredSupplierId === undefined ? undefined : normalizeOptionalText(body.preferredSupplierId),
      locationId: body?.locationId === undefined ? undefined : normalizeOptionalText(body.locationId),
      unitOfMeasure: body?.unitOfMeasure === undefined ? undefined : normalizeOptionalText(body.unitOfMeasure),
    });

    const existingItem = await dbAny.item.findFirst({
      where: { id, organizationId: access.access.organizationId },
      select: { id: true, defaultLocationId: true, quantityOnHand: true },
    });
    if (!existingItem) {
      return NextResponse.json({ error: "Item not found" }, { status: 404 });
    }

    // Check barcode uniqueness if updating
    if (data.barcode) {
      const existing = await prisma.item.findFirst({
        where: {
          organizationId: access.access.organizationId,
          barcode: data.barcode,
        },
      });
      if (existing && existing.id !== id) {
        return NextResponse.json(
          { error: "Barcode already exists" },
          { status: 409 }
        );
      }
    }

    if (data.preferredSupplierId) {
      const supplier = await prisma.supplier.findFirst({
        where: {
          id: data.preferredSupplierId,
          organizationId: access.access.organizationId,
        },
        select: { id: true },
      });
      if (!supplier) {
        return NextResponse.json({ error: "Supplier not found" }, { status: 404 });
      }
    }

    if (data.locationId) {
      const location = await prisma.location.findFirst({
        where: {
          id: data.locationId,
          organizationId: access.access.organizationId,
        },
        select: { id: true },
      });
      if (!location) {
        return NextResponse.json({ error: "Location not found" }, { status: 404 });
      }
    }

    const item = await dbAny.item.update({
      where: { id },
      data: {
        ...(data.name !== undefined ? { name: data.name.trim() } : {}),
        ...(data.manufacturer !== undefined ? { manufacturer: data.manufacturer } : {}),
        ...(data.partNumber !== undefined ? { partNumber: data.partNumber } : {}),
        ...(data.modelNumber !== undefined ? { modelNumber: data.modelNumber } : {}),
        ...(data.category !== undefined ? { category: data.category } : {}),
        ...(data.serialNumber !== undefined ? { serialNumber: data.serialNumber } : {}),
        ...(data.barcode !== undefined ? { barcode: data.barcode?.trim() || null } : {}),
        ...(data.description !== undefined ? { description: data.description } : {}),
        ...(data.photoUrl !== undefined ? { photoUrl: data.photoUrl } : {}),
        ...(data.quantityOnHand !== undefined ? { quantityOnHand: data.quantityOnHand } : {}),
        ...(data.lowStockAmberThreshold !== undefined ? { lowStockAmberThreshold: data.lowStockAmberThreshold } : {}),
        ...(data.lowStockRedThreshold !== undefined ? { lowStockRedThreshold: data.lowStockRedThreshold } : {}),
        ...(data.preferredSupplierId !== undefined ? { preferredSupplierId: data.preferredSupplierId } : {}),
        ...(data.locationId !== undefined ? { defaultLocationId: data.locationId } : {}),
        ...(data.lastUnitCost !== undefined ? { lastUnitCost: data.lastUnitCost } : {}),
        ...(data.marginPercent !== undefined ? { marginPercent: data.marginPercent } : {}),
        ...(data.unitOfMeasure !== undefined ? { unitOfMeasure: data.unitOfMeasure ?? "units" } : {}),
        ...(data.enableLotTracking !== undefined ? { enableLotTracking: data.enableLotTracking } : {}),
        ...(data.enableExpiryTracking !== undefined ? { enableExpiryTracking: data.enableExpiryTracking } : {}),
      },
      include: {
        photos: true,
        preferredSupplier: true,
        defaultLocation: true,
        _count: { select: { jobParts: true } },
      },
    });

    if (item.defaultLocationId) {
      const locationStockCount = await dbAny.locationStock.count({
        where: { itemId: id },
      });

      if (locationStockCount === 0) {
        await dbAny.locationStock.create({
          data: {
            itemId: id,
            locationId: item.defaultLocationId,
            quantityOnHand:
              data.quantityOnHand ?? existingItem.quantityOnHand ?? item.quantityOnHand,
          },
        });
      }
    }

    return NextResponse.json(mapItemResponse(item));
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
    const access = await requireUserAccess(req);
    if (!access.ok) {
      return access.response;
    }

    if (!access.access.canEditInventory) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;
    const item = await prisma.item.findFirst({
      where: { id, organizationId: access.access.organizationId },
      select: {
        id: true,
        _count: {
          select: {
            jobParts: true,
            transactions: true,
          },
        },
      },
    });
    if (!item) {
      return NextResponse.json({ error: "Item not found" }, { status: 404 });
    }

    if (item._count.jobParts > 0 || item._count.transactions > 0) {
      return NextResponse.json({ error: "Items with movement or job history cannot be deleted." }, { status: 400 });
    }
    // Delete related photos first
    await prisma.itemPhoto.deleteMany({
      where: { itemId: id },
    });

    await prisma.locationStock.deleteMany({
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
