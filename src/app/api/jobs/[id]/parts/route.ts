import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { appendJobHistory, createJobPartSnapshot, touchJob } from "@/lib/jobs/server";
import { canEditJobParts, normalizeJobStatus } from "@/lib/jobs/workflow";
import { requireRequestContext } from "@/lib/request-context";
import { z } from "zod";

const dbAny = prisma as any;

const addPartSchema = z.object({
  itemId: z.string().min(1),
  quantity: z.number().int().min(1),
  unitCost: z.number().min(0).optional(),
  markupPercent: z.number().min(0).optional(),
  notes: z.string().optional(),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: jobId } = await params;
    const auth = requireRequestContext(request);
    if (!auth.ok) {
      return auth.response;
    }

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

    const body = await request.json();
    const data = addPartSchema.parse(body);

    const item = await dbAny.item.findFirst({
      where: { id: data.itemId, organizationId: auth.context.organizationId },
      select: {
        id: true,
        name: true,
        partNumber: true,
        quantityOnHand: true,
        lastUnitCost: true,
        marginPercent: true,
      },
    });
    if (!item) return NextResponse.json({ error: "Item not found" }, { status: 404 });

    if (item.quantityOnHand < data.quantity) {
      return NextResponse.json(
        { error: `Insufficient stock. Available: ${item.quantityOnHand}` },
        { status: 400 }
      );
    }

    const jobPart = await dbAny.$transaction(async (tx: any) => {
      const nextQuantityOnHand = item.quantityOnHand - data.quantity;
      const pricing = createJobPartSnapshot({
        unitCost: data.unitCost ?? item.lastUnitCost ?? 0,
        markupPercent: data.markupPercent ?? item.marginPercent ?? 0,
        itemName: item.name,
        itemPartNumber: item.partNumber,
        jobDescription: job.description ?? undefined,
      });

      const inventoryTransaction = await tx.inventoryTransaction.create({
        data: {
          organizationId: auth.context.organizationId,
          itemId: data.itemId,
          actorUserId: auth.context.userId,
          jobId: job.id,
          type: "use",
          quantity: data.quantity,
          quantityDelta: data.quantity * -1,
          balanceAfter: nextQuantityOnHand,
          jobNumberSnapshot: job.jobNumber,
          jobDescriptionSnapshot: job.description ?? undefined,
          costSnapshot: pricing.unitCost,
          notes: data.notes?.trim() || `Job ${job.jobNumber}`,
          syncedAt: new Date(),
        },
      });

      await tx.item.update({
        where: { id: data.itemId },
        data: {
          quantityOnHand: nextQuantityOnHand,
          quantityUsedTotal: { increment: data.quantity },
          lastMovementAt: new Date(),
          lastMovementType: "use_on_job",
        },
      });

      const createdPart = await tx.jobPart.create({
        data: {
          jobId,
          itemId: data.itemId,
          inventoryTransactionId: inventoryTransaction.id,
          performedByUserId: auth.context.userId,
          quantity: data.quantity,
          unitCost: pricing.unitCost,
          markupPercent: pricing.markupPercent,
          unitSell: pricing.unitSell,
          costSnapshot: pricing.costSnapshot,
          itemNameSnapshot: pricing.itemNameSnapshot,
          itemPartNumberSnapshot: pricing.itemPartNumberSnapshot,
          jobDescriptionSnapshot: pricing.jobDescriptionSnapshot,
          notes: data.notes?.trim() || null,
          lastActivityAt: new Date(),
        },
        include: { item: { select: { id: true, name: true, partNumber: true, unitOfMeasure: true } } },
      });

      await touchJob(tx, job.id);
      await appendJobHistory(tx, {
        organizationId: auth.context.organizationId,
        jobId: job.id,
        actorUserId: auth.context.userId,
        actorName: auth.context.name,
        actionType: "part_added",
        actionLabel: "Part added",
        details: `${createdPart.quantity} x ${item.name}`,
      });

      return createdPart;
    });

    return NextResponse.json(jobPart, { status: 201 });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.errors }, { status: 400 });
    }
    console.error("Add part error:", err);
    return NextResponse.json({ error: "Failed to add part" }, { status: 500 });
  }
}
