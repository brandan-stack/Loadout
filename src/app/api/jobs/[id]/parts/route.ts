import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireRequestContext } from "@/lib/request-context";
import { z } from "zod";

const dbAny = prisma as any;

const addPartSchema = z.object({
  itemId: z.string().min(1),
  quantity: z.number().int().min(1),
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
      select: { id: true, jobNumber: true, technicianId: true, status: true },
    });
    if (!job) return NextResponse.json({ error: "Job not found" }, { status: 404 });

    if (auth.context.role === "TECH" && job.technicianId !== auth.context.userId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (job.status === "INVOICED") {
      return NextResponse.json({ error: "Cannot modify an invoiced job" }, { status: 400 });
    }

    const body = await request.json();
    const data = addPartSchema.parse(body);

    const item = await dbAny.item.findFirst({
      where: { id: data.itemId, organizationId: auth.context.organizationId },
    });
    if (!item) return NextResponse.json({ error: "Item not found" }, { status: 404 });

    if (item.quantityOnHand < data.quantity) {
      return NextResponse.json(
        { error: `Insufficient stock. Available: ${item.quantityOnHand}` },
        { status: 400 }
      );
    }

    // Deduct stock
    await dbAny.item.update({
      where: { id: data.itemId },
      data: {
        quantityOnHand: { decrement: data.quantity },
        quantityUsedTotal: { increment: data.quantity },
      },
    });

    // Audit transaction
    await dbAny.inventoryTransaction.create({
      data: {
        itemId: data.itemId,
        type: "use",
        quantity: data.quantity,
        notes: `Job ${job.jobNumber}`,
      },
    });

    // Create job part with unit cost snapshot
    const jobPart = await dbAny.jobPart.create({
      data: {
        jobId,
        itemId: data.itemId,
        quantity: data.quantity,
        unitCost: item.lastUnitCost ?? 0,
        notes: data.notes?.trim() || null,
      },
      include: { item: { select: { id: true, name: true, partNumber: true, unitOfMeasure: true } } },
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
