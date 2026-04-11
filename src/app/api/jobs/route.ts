import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUserAccess } from "@/lib/permissions";
import { z } from "zod";

const dbAny = prisma as any;

const createSchema = z.object({
  jobNumber: z.string().min(1, "Job number is required"),
  description: z.string().optional(),
  customer: z.string().min(1, "Customer is required"),
  date: z.string().optional(),
  notes: z.string().optional(),
});

export async function GET(request: NextRequest) {
  try {
    const access = await requireUserAccess(request);
    if (!access.ok) {
      return access.response;
    }

    if (!access.access.canViewJobs) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const includeParts = request.nextUrl.searchParams.get("includeParts") === "1";

    const where = {
      organizationId: access.access.organizationId,
      ...(access.access.role === "TECH" ? { technicianId: access.access.userId } : {}),
    };

    const jobs = includeParts
      ? await dbAny.job.findMany({
          where,
          orderBy: { latestActivityAt: "desc" },
          select: {
            id: true,
            jobNumber: true,
            description: true,
            customer: true,
            date: true,
            status: true,
            notes: true,
            latestActivityAt: true,
            technician: { select: { id: true, name: true } },
            parts: {
              select: {
                id: true,
                quantity: true,
                unitCost: true,
                notes: true,
                item: {
                  select: {
                    id: true,
                    name: true,
                    partNumber: true,
                    unitOfMeasure: true,
                    quantityOnHand: true,
                    lowStockRedThreshold: true,
                  },
                },
              },
            },
          },
        })
        : await dbAny.job.findMany({
          where,
          orderBy: { latestActivityAt: "desc" },
          select: {
            id: true,
            jobNumber: true,
            description: true,
            customer: true,
            date: true,
            status: true,
            latestActivityAt: true,
            technician: { select: { id: true, name: true } },
            parts: {
              select: {
                quantity: true,
                item: {
                  select: {
                    quantityOnHand: true,
                    lowStockRedThreshold: true,
                  },
                },
              },
            },
            _count: { select: { parts: true } },
          },
        });

    return NextResponse.json(jobs);
  } catch (err) {
    console.error("Jobs GET error:", err);
    return NextResponse.json({ error: "Failed to fetch jobs" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const access = await requireUserAccess(request);
    if (!access.ok) {
      return access.response;
    }

    if (!access.access.canCreateJobs) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const data = createSchema.parse(body);

    const job = await dbAny.job.create({
      data: {
        organizationId: access.access.organizationId,
        jobNumber: data.jobNumber.trim(),
        description: data.description?.trim() || null,
        customer: data.customer.trim(),
        technicianId: access.access.userId,
        date: data.date ? new Date(data.date) : new Date(),
        notes: data.notes?.trim() || null,
        latestActivityAt: new Date(),
      },
      include: {
        technician: { select: { id: true, name: true } },
      },
    });
    return NextResponse.json(job, { status: 201 });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.errors }, { status: 400 });
    }
    if (
      typeof err === "object" && err !== null &&
      "code" in err && (err as { code: string }).code === "P2002"
    ) {
      return NextResponse.json({ error: "A job with that number already exists" }, { status: 409 });
    }
    console.error("Jobs POST error:", err);
    return NextResponse.json({ error: "Failed to create job" }, { status: 500 });
  }
}
