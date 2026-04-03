import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { z } from "zod";

const dbAny = prisma as any;

const updateSchema = z.object({
  jobNumber: z.string().min(1).optional(),
  customer: z.string().min(1).optional(),
  date: z.string().optional(),
  status: z.enum(["OPEN", "COMPLETED", "INVOICED"]).optional(),
  notes: z.string().optional().nullable(),
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const role = request.headers.get("x-user-role");
    const userId = request.headers.get("x-user-id");

    const job = await dbAny.job.findUnique({
      where: { id },
      include: {
        technician: { select: { id: true, name: true } },
        parts: {
          include: { item: { select: { id: true, name: true, partNumber: true, unitOfMeasure: true } } },
          orderBy: { createdAt: "asc" },
        },
      },
    });

    if (!job) return NextResponse.json({ error: "Job not found" }, { status: 404 });

    // Techs can only see their own jobs
    if (role === "TECH" && job.technicianId !== userId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Strip unit costs from tech role
    if (role === "TECH") {
      job.parts = job.parts.map((p: any) => ({ ...p, unitCost: undefined }));
    }

    return NextResponse.json(job);
  } catch (err) {
    console.error("Job GET error:", err);
    return NextResponse.json({ error: "Failed to fetch job" }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const role = request.headers.get("x-user-role");
    const userId = request.headers.get("x-user-id");

    const job = await dbAny.job.findUnique({ where: { id }, select: { technicianId: true } });
    if (!job) return NextResponse.json({ error: "Job not found" }, { status: 404 });

    // Techs can only update their own jobs, and cannot change status
    if (role === "TECH" && job.technicianId !== userId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const data = updateSchema.parse(body);

    // Techs cannot change status
    if (role === "TECH" && data.status) {
      return NextResponse.json({ error: "Technicians cannot change job status" }, { status: 403 });
    }

    const updated = await dbAny.job.update({
      where: { id },
      data: {
        ...(data.jobNumber && { jobNumber: data.jobNumber.trim() }),
        ...(data.customer && { customer: data.customer.trim() }),
        ...(data.date && { date: new Date(data.date) }),
        ...(data.status && { status: data.status }),
        ...(data.notes !== undefined && { notes: data.notes }),
      },
    });
    return NextResponse.json(updated);
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.errors }, { status: 400 });
    }
    console.error("Job PATCH error:", err);
    return NextResponse.json({ error: "Failed to update job" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const role = request.headers.get("x-user-role");
    const userId = request.headers.get("x-user-id");

    const job = await dbAny.job.findUnique({
      where: { id },
      include: { parts: true, technician: { select: { id: true } } },
    });
    if (!job) return NextResponse.json({ error: "Job not found" }, { status: 404 });

    // Only owner or admins can delete
    if (role === "TECH" && job.technicianId !== userId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Restore stock for all parts before deleting
    for (const part of job.parts) {
      await dbAny.item.update({
        where: { id: part.itemId },
        data: { quantityOnHand: { increment: part.quantity } },
      });
      await dbAny.inventoryTransaction.create({
        data: {
          itemId: part.itemId,
          type: "add",
          quantity: part.quantity,
          notes: `Job ${job.jobNumber} deleted — stock restored`,
        },
      });
    }

    await dbAny.job.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Job DELETE error:", err);
    return NextResponse.json({ error: "Failed to delete job" }, { status: 500 });
  }
}
