import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireRequestContext } from "@/lib/request-context";

const dbAny = prisma as any;

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

    if (job.status === "INVOICED") {
      return NextResponse.json({ error: "Cannot modify an invoiced job" }, { status: 400 });
    }

    const part = await dbAny.jobPart.findFirst({
      where: { id: partId, jobId },
    });
    if (!part || part.jobId !== jobId) {
      return NextResponse.json({ error: "Part not found" }, { status: 404 });
    }

    // Restore stock
    await dbAny.item.update({
      where: { id: part.itemId },
      data: {
        quantityOnHand: { increment: part.quantity },
        quantityUsedTotal: { decrement: part.quantity },
      },
    });

    // Audit transaction
    await dbAny.inventoryTransaction.create({
      data: {
        itemId: part.itemId,
        type: "add",
        quantity: part.quantity,
        notes: `Job ${job.jobNumber} — part removed`,
      },
    });

    await dbAny.jobPart.delete({ where: { id: partId } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Remove part error:", err);
    return NextResponse.json({ error: "Failed to remove part" }, { status: 500 });
  }
}
