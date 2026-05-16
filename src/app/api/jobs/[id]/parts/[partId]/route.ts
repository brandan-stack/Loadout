import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { appendJobHistory, createJobPartSnapshot, touchJob } from "@/lib/jobs/server";
import { canEditJobParts, normalizeJobStatus } from "@/lib/jobs/workflow";
import { requireRequestContext } from "@/lib/request-context";
import { z } from "zod";

const dbAny = prisma as any;

const updatePartSchema = z
  .object({
    quantity: z.number().int().min(1).optional(),
    unitCost: z.number().min(0).optional(),
    markupPercent: z.number().min(0).optional(),
    notes: z.string().nullable().optional(),
  })
  .refine((value) => Object.values(value).some((entry) => entry !== undefined), {
    message: "At least one field is required.",
  });

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; partId: string }> }
) {
  try {
    const { id: jobId, partId } = await params;
    const auth = requireRequestContext(request);
    if (!auth.ok) {
      return auth.response;
    }

    const body = await request.json();
    const data = updatePartSchema.parse(body);

    const job = await dbAny.job.findFirst({
      where: { id: jobId, organizationId: auth.context.organizationId },
      select: { id: true, jobNumber: true, description: true, technicianId: true, status: true },
    });
    if (!job) return NextResponse.json({ error: "Job not found" }, { status: 404 });

    if (auth.context.role === "TECH" && job.technicianId !== auth.context.userId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (!canEditJobParts(normalizeJobStatus(job.status))) {
      return NextResponse.json({ error: "Only open or completed jobs can be edited." }, { status: 400 });
    }

    const part = await dbAny.jobPart.findFirst({
      where: { id: partId, jobId },
      include: {
        item: {
          select: {
            id: true,
            name: true,
            partNumber: true,
            quantityOnHand: true,
            quantityUsedTotal: true,
          },
        },
      },
    });
    if (!part) {
      return NextResponse.json({ error: "Part not found" }, { status: 404 });
    }

    const nextQuantity = data.quantity ?? part.quantity;
    const quantityDelta = nextQuantity - part.quantity;
    if (quantityDelta > 0 && part.item.quantityOnHand < quantityDelta) {
      return NextResponse.json({ error: `Insufficient stock. Available: ${part.item.quantityOnHand}` }, { status: 400 });
    }

    const pricing = createJobPartSnapshot({
      unitCost: data.unitCost ?? part.unitCost,
      markupPercent: data.markupPercent ?? part.markupPercent,
      itemName: part.item.name,
      itemPartNumber: part.item.partNumber,
      jobDescription: job.description ?? undefined,
    });

    const notes = data.notes === undefined ? part.notes : data.notes?.trim() || null;
    const quantityChanged = quantityDelta !== 0;
    const pricingChanged = pricing.unitCost !== (part.unitCost ?? 0) || pricing.markupPercent !== (part.markupPercent ?? 0);
    const notesChanged = notes !== (part.notes ?? null);

    await dbAny.$transaction(async (tx: any) => {
      if (quantityDelta !== 0) {
        const nextQuantityOnHand = part.item.quantityOnHand - quantityDelta;

        await tx.item.update({
          where: { id: part.itemId },
          data: {
            quantityOnHand: nextQuantityOnHand,
            quantityUsedTotal: { increment: quantityDelta },
            lastMovementAt: new Date(),
            lastMovementType: quantityDelta > 0 ? "use_on_job" : "return_from_job",
          },
        });

        await tx.inventoryTransaction.create({
          data: {
            organizationId: auth.context.organizationId,
            itemId: part.itemId,
            actorUserId: auth.context.userId,
            jobId: job.id,
            type: quantityDelta > 0 ? "use" : "add",
            quantity: Math.abs(quantityDelta),
            quantityDelta: quantityDelta > 0 ? quantityDelta * -1 : Math.abs(quantityDelta),
            balanceAfter: nextQuantityOnHand,
            jobNumberSnapshot: job.jobNumber,
            jobDescriptionSnapshot: job.description ?? undefined,
            costSnapshot: pricing.unitCost,
            notes: `Job ${job.jobNumber} — part quantity adjusted`,
            syncedAt: new Date(),
          },
        });
      }

      await tx.jobPart.update({
        where: { id: partId },
        data: {
          quantity: nextQuantity,
          unitCost: pricing.unitCost,
          markupPercent: pricing.markupPercent,
          unitSell: pricing.unitSell,
          costSnapshot: pricing.costSnapshot,
          itemNameSnapshot: pricing.itemNameSnapshot,
          itemPartNumberSnapshot: pricing.itemPartNumberSnapshot,
          jobDescriptionSnapshot: pricing.jobDescriptionSnapshot,
          notes,
          lastActivityAt: new Date(),
        },
      });

      await touchJob(tx, job.id);

      if (quantityChanged) {
        await appendJobHistory(tx, {
          organizationId: auth.context.organizationId,
          jobId: job.id,
          actorUserId: auth.context.userId,
          actorName: auth.context.name,
          actionType: "quantity_changed",
          actionLabel: "Quantity changed",
          details: `${part.item.name}: ${part.quantity} to ${nextQuantity}`,
        });
      }

      if (pricingChanged) {
        await appendJobHistory(tx, {
          organizationId: auth.context.organizationId,
          jobId: job.id,
          actorUserId: auth.context.userId,
          actorName: auth.context.name,
          actionType: "pricing_changed",
          actionLabel: "Pricing changed",
          details: `${part.item.name}: ${pricing.unitCost.toFixed(2)} cost / ${pricing.markupPercent.toFixed(2)}% markup`,
        });
      }

      if (notesChanged && !quantityChanged && !pricingChanged) {
        await appendJobHistory(tx, {
          organizationId: auth.context.organizationId,
          jobId: job.id,
          actorUserId: auth.context.userId,
          actorName: auth.context.name,
          actionType: "part_edited",
          actionLabel: "Part edited",
          details: `${part.item.name} notes updated`,
        });
      }
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.errors[0]?.message ?? "Invalid part update." }, { status: 400 });
    }
    console.error("Update part error:", err);
    return NextResponse.json({ error: "Failed to update part" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; partId: string }> }
) {
  try {
    const { id: jobId, partId } = await params;
    const auth = requireRequestContext(request);
    if (!auth.ok) {
      return auth.response;
    }

    const job = await dbAny.job.findFirst({
      where: { id: jobId, organizationId: auth.context.organizationId },
      select: { id: true, jobNumber: true, technicianId: true, status: true },
    });
    if (!job) return NextResponse.json({ error: "Job not found" }, { status: 404 });

    if (auth.context.role === "TECH" && job.technicianId !== auth.context.userId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (!canEditJobParts(normalizeJobStatus(job.status))) {
      return NextResponse.json({ error: "Only open or completed jobs can be edited." }, { status: 400 });
    }

    const part = await dbAny.jobPart.findFirst({
      where: { id: partId, jobId },
      include: {
        item: { select: { id: true, quantityOnHand: true, quantityUsedTotal: true, name: true } },
      },
    });
    if (!part || part.jobId !== jobId) {
      return NextResponse.json({ error: "Part not found" }, { status: 404 });
    }

    await dbAny.$transaction(async (tx: any) => {
      const nextQuantityOnHand = part.item.quantityOnHand + part.quantity;

      await tx.inventoryTransaction.create({
        data: {
          organizationId: auth.context.organizationId,
          itemId: part.itemId,
          actorUserId: auth.context.userId,
          jobId: job.id,
          type: "add",
          quantity: part.quantity,
          quantityDelta: part.quantity,
          balanceAfter: nextQuantityOnHand,
          jobNumberSnapshot: job.jobNumber,
          costSnapshot: part.unitCost ?? 0,
          notes: `Job ${job.jobNumber} — part removed`,
          syncedAt: new Date(),
        },
      });

      await tx.item.update({
        where: { id: part.itemId },
        data: {
          quantityOnHand: nextQuantityOnHand,
          quantityUsedTotal: { decrement: part.quantity },
          lastMovementAt: new Date(),
          lastMovementType: "return_from_job",
        },
      });

      await touchJob(tx, job.id);

      await appendJobHistory(tx, {
        organizationId: auth.context.organizationId,
        jobId: job.id,
        actorUserId: auth.context.userId,
        actorName: auth.context.name,
        actionType: "part_removed",
        actionLabel: "Part removed",
        details: `${part.quantity} x ${part.item.name}`,
      });

      await tx.jobPart.delete({ where: { id: partId } });
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Remove part error:", err);
    return NextResponse.json({ error: "Failed to remove part" }, { status: 500 });
  }
}
