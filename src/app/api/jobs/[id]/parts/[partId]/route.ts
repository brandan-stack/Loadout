import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

const dbAny = prisma as any;

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; partId: string }> }
) {
  try {
    const { id: jobId, partId } = await params;
    const role = request.headers.get("x-user-role");
    const userId = request.headers.get("x-user-id");

    const job = await dbAny.job.findUnique({ where: { id: jobId }, select: { id: true, jobNumber: true, technicianId: true, status: true } });
    if (!job) return NextResponse.json({ error: "Job not found" }, { status: 404 });

    if (role === "TECH" && job.technicianId !== userId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (job.status === "INVOICED") {
      return NextResponse.json({ error: "Cannot modify an invoiced job" }, { status: 400 });
    }

    const part = await dbAny.jobPart.findUnique({ where: { id: partId } });
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
