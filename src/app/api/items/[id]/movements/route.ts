import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUserAccess } from "@/lib/permissions";
import { z } from "zod";

const dbAny = prisma as any;

const movementSchema = z
  .object({
    action: z.enum([
      "move_stock",
      "use_on_job",
      "return_from_job",
      "receive_stock",
      "adjust_quantity",
    ]),
    quantity: z.number().int().min(1).optional(),
    quantityDelta: z.number().int().optional(),
    fromLocationId: z.string().optional(),
    toLocationId: z.string().optional(),
    jobId: z.string().optional(),
    notes: z.string().optional(),
    supplierCost: z.number().min(0).optional(),
    clientRequestId: z.string().optional(),
    submittedOfflineAt: z.string().optional(),
  })
  .superRefine((value, context) => {
    if (["move_stock", "use_on_job", "return_from_job", "receive_stock"].includes(value.action) && !value.quantity) {
      context.addIssue({ code: z.ZodIssueCode.custom, path: ["quantity"], message: "Quantity is required." });
    }

    if (value.action === "move_stock" && (!value.fromLocationId || !value.toLocationId)) {
      context.addIssue({ code: z.ZodIssueCode.custom, path: ["toLocationId"], message: "Both locations are required." });
    }

    if (value.action === "use_on_job" && !value.jobId) {
      context.addIssue({ code: z.ZodIssueCode.custom, path: ["jobId"], message: "Select a job." });
    }

    if (value.action === "return_from_job" && (!value.jobId || !value.toLocationId)) {
      context.addIssue({ code: z.ZodIssueCode.custom, path: ["jobId"], message: "Select a job and return location." });
    }

    if (value.action === "adjust_quantity" && !value.quantityDelta) {
      context.addIssue({ code: z.ZodIssueCode.custom, path: ["quantityDelta"], message: "Adjustment amount is required." });
    }
  });

async function validateLocationOwnership(tx: any, organizationId: string, locationId?: string) {
  if (!locationId) {
    return null;
  }

  const location = await tx.location.findFirst({
    where: { id: locationId, organizationId },
    select: { id: true, name: true },
  });

  if (!location) {
    throw new Error("Location not found");
  }

  return location;
}

async function applyLocationDelta(tx: any, itemId: string, locationId: string | null | undefined, delta: number) {
  if (!locationId || delta === 0) {
    return;
  }

  const stock = await tx.locationStock.findUnique({
    where: { locationId_itemId: { locationId, itemId } },
  });

  if (!stock) {
    if (delta < 0) {
      throw new Error("Location stock is insufficient");
    }

    await tx.locationStock.create({
      data: {
        locationId,
        itemId,
        quantityOnHand: delta,
      },
    });
    return;
  }

  if (stock.quantityOnHand + delta < 0) {
    throw new Error("Location stock is insufficient");
  }

  await tx.locationStock.update({
    where: { id: stock.id },
    data: { quantityOnHand: stock.quantityOnHand + delta },
  });
}

async function loadInventoryItemSummary(tx: any, organizationId: string, itemId: string) {
  const item = await tx.item.findFirst({
    where: { id: itemId, organizationId },
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
  });

  return item
    ? {
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
        lastMovementAt: item.lastMovementAt?.toISOString(),
        lastMovementType: item.lastMovementType ?? undefined,
        linkedJobsCount: item._count.jobParts,
      }
    : null;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const access = await requireUserAccess(request);
    if (!access.ok) {
      return access.response;
    }

    if (!access.access.canViewInventory) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;
    const body = movementSchema.parse(await request.json());

    if (body.action === "move_stock" && !access.access.canMoveInventory) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    if (body.action === "use_on_job" && !access.access.canUseInventoryOnJob) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    if (body.action === "return_from_job" && !access.access.canReturnInventoryFromJob) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    if (body.action === "receive_stock" && !access.access.canAddInventory) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    if (body.action === "adjust_quantity") {
      const quantityDelta = body.quantityDelta ?? 0;
      if (quantityDelta > 0 && !access.access.canAddInventory) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      if (quantityDelta < 0 && !access.access.canRemoveInventory) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      if (!access.access.canEditInventory && quantityDelta !== 0) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }

    const summary = await dbAny.$transaction(async (tx: any) => {
      if (body.clientRequestId) {
        const existing = await tx.inventoryTransaction.findUnique({
          where: { clientRequestId: body.clientRequestId },
          select: { itemId: true },
        });

        if (existing) {
          return loadInventoryItemSummary(tx, access.access.organizationId, existing.itemId);
        }
      }

      const item = await tx.item.findFirst({
        where: { id, organizationId: access.access.organizationId },
      });

      if (!item) {
        throw new Error("Item not found");
      }

      const fromLocation = await validateLocationOwnership(tx, access.access.organizationId, body.fromLocationId);
      const toLocation = await validateLocationOwnership(tx, access.access.organizationId, body.toLocationId);
      const quantity = body.quantity ?? 0;
      const quantityDelta = body.quantityDelta ?? 0;
      const offlineStamp = body.submittedOfflineAt ? new Date(body.submittedOfflineAt) : null;

      let nextQuantityOnHand = item.quantityOnHand;
      let transactionData: Record<string, unknown> = {
        organizationId: access.access.organizationId,
        itemId: item.id,
        actorUserId: access.access.userId,
        type: body.action,
        quantity: body.action === "adjust_quantity" ? Math.abs(quantityDelta) : quantity,
        quantityDelta,
        notes: body.notes?.trim() || undefined,
        clientRequestId: body.clientRequestId,
        submittedOfflineAt: offlineStamp,
        syncedAt: new Date(),
        syncStatus: body.clientRequestId && body.submittedOfflineAt ? "queued_sync" : "synced",
      };

      if (body.action === "move_stock") {
        if (item.quantityOnHand < quantity) {
          throw new Error("Insufficient quantity available");
        }

        await applyLocationDelta(tx, item.id, fromLocation?.id ?? item.defaultLocationId, -quantity);
        await applyLocationDelta(tx, item.id, toLocation?.id, quantity);
        transactionData = {
          ...transactionData,
          quantityDelta: 0,
          balanceAfter: item.quantityOnHand,
          fromLocationId: fromLocation?.id ?? item.defaultLocationId ?? undefined,
          toLocationId: toLocation?.id,
        };
      }

      if (body.action === "receive_stock") {
        nextQuantityOnHand += quantity;
        await applyLocationDelta(tx, item.id, toLocation?.id ?? item.defaultLocationId, quantity);
        transactionData = {
          ...transactionData,
          quantityDelta: quantity,
          balanceAfter: nextQuantityOnHand,
          toLocationId: toLocation?.id ?? item.defaultLocationId ?? undefined,
          costSnapshot: body.supplierCost ?? item.lastUnitCost,
        };
      }

      if (body.action === "adjust_quantity") {
        nextQuantityOnHand += quantityDelta;
        if (nextQuantityOnHand < 0) {
          throw new Error("Adjustment would reduce quantity below zero");
        }

        if (quantityDelta > 0) {
          await applyLocationDelta(tx, item.id, toLocation?.id ?? item.defaultLocationId, quantityDelta);
        }
        if (quantityDelta < 0) {
          await applyLocationDelta(tx, item.id, fromLocation?.id ?? item.defaultLocationId, quantityDelta);
        }

        transactionData = {
          ...transactionData,
          balanceAfter: nextQuantityOnHand,
          fromLocationId: quantityDelta < 0 ? fromLocation?.id ?? item.defaultLocationId ?? undefined : undefined,
          toLocationId: quantityDelta > 0 ? toLocation?.id ?? item.defaultLocationId ?? undefined : undefined,
        };
      }

      if (body.action === "use_on_job") {
        const job = await tx.job.findFirst({
          where: { id: body.jobId, organizationId: access.access.organizationId },
          select: { id: true, jobNumber: true, description: true },
        });

        if (!job) {
          throw new Error("Job not found");
        }
        if (item.quantityOnHand < quantity) {
          throw new Error("Insufficient quantity available");
        }

        nextQuantityOnHand -= quantity;
        await applyLocationDelta(tx, item.id, fromLocation?.id ?? item.defaultLocationId, -quantity);

        transactionData = {
          ...transactionData,
          quantityDelta: quantity * -1,
          balanceAfter: nextQuantityOnHand,
          fromLocationId: fromLocation?.id ?? item.defaultLocationId ?? undefined,
          jobId: job.id,
          jobNumberSnapshot: job.jobNumber,
          jobDescriptionSnapshot: job.description ?? undefined,
          costSnapshot: item.lastUnitCost,
        };

        const transaction = await tx.inventoryTransaction.create({ data: transactionData });

        await tx.jobPart.create({
          data: {
            jobId: job.id,
            itemId: item.id,
            inventoryTransactionId: transaction.id,
            performedByUserId: access.access.userId,
            quantity,
            unitCost: item.lastUnitCost ?? 0,
            costSnapshot: item.lastUnitCost ?? 0,
            itemNameSnapshot: item.name,
            jobDescriptionSnapshot: job.description ?? undefined,
            notes: body.notes?.trim() || undefined,
            lastActivityAt: new Date(),
          },
        });

        await tx.item.update({
          where: { id: item.id },
          data: {
            quantityOnHand: nextQuantityOnHand,
            quantityUsedTotal: item.quantityUsedTotal + quantity,
            lastMovementAt: new Date(),
            lastMovementType: body.action,
          },
        });

        await tx.job.update({
          where: { id: job.id },
          data: { latestActivityAt: new Date() },
        });

        return loadInventoryItemSummary(tx, access.access.organizationId, item.id);
      }

      if (body.action === "return_from_job") {
        const job = await tx.job.findFirst({
          where: { id: body.jobId, organizationId: access.access.organizationId },
          select: { id: true, jobNumber: true, description: true },
        });

        if (!job) {
          throw new Error("Job not found");
        }

        const usageRecord = await tx.jobPart.findFirst({
          where: {
            jobId: job.id,
            itemId: item.id,
          },
          orderBy: { lastActivityAt: "desc" },
        });

        if (!usageRecord || usageRecord.quantity - usageRecord.returnedQuantity < quantity) {
          throw new Error("Return quantity exceeds recorded job usage");
        }

        nextQuantityOnHand += quantity;
        await applyLocationDelta(tx, item.id, toLocation?.id, quantity);

        transactionData = {
          ...transactionData,
          quantityDelta: quantity,
          balanceAfter: nextQuantityOnHand,
          toLocationId: toLocation?.id,
          jobId: job.id,
          jobNumberSnapshot: job.jobNumber,
          jobDescriptionSnapshot: job.description ?? undefined,
          costSnapshot: item.lastUnitCost,
        };

        await tx.jobPart.update({
          where: { id: usageRecord.id },
          data: {
            returnedQuantity: usageRecord.returnedQuantity + quantity,
            lastActivityAt: new Date(),
          },
        });

        await tx.job.update({
          where: { id: job.id },
          data: { latestActivityAt: new Date() },
        });
      }

      await tx.inventoryTransaction.create({ data: transactionData });

      if (body.action !== "move_stock") {
        await tx.item.update({
          where: { id: item.id },
          data: {
            quantityOnHand: nextQuantityOnHand,
            lastUnitCost: body.action === "receive_stock" ? body.supplierCost ?? item.lastUnitCost : item.lastUnitCost,
            defaultLocationId:
              body.action === "receive_stock"
                ? toLocation?.id ?? item.defaultLocationId
                : body.action === "return_from_job"
                  ? toLocation?.id ?? item.defaultLocationId
                  : item.defaultLocationId,
            lastMovementAt: new Date(),
            lastMovementType: body.action,
          },
        });
      } else {
        await tx.item.update({
          where: { id: item.id },
          data: {
            defaultLocationId: toLocation?.id ?? item.defaultLocationId,
            lastMovementAt: new Date(),
            lastMovementType: body.action,
          },
        });
      }

      return loadInventoryItemSummary(tx, access.access.organizationId, item.id);
    });

    return NextResponse.json(summary);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0]?.message ?? "Invalid movement" }, { status: 400 });
    }

    if (error instanceof Error) {
      if (error.message.includes("not found")) {
        return NextResponse.json({ error: error.message }, { status: 404 });
      }

      if (
        error.message.includes("Insufficient") ||
        error.message.includes("below zero") ||
        error.message.includes("exceeds recorded")
      ) {
        return NextResponse.json({ error: error.message }, { status: 400 });
      }
    }

    console.error("Inventory movement error:", error);
    return NextResponse.json({ error: "Failed to save inventory movement" }, { status: 500 });
  }
}