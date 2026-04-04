import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireRequestContext } from "@/lib/request-context";
import { z } from "zod";

const dbAny = prisma as any;

const createSchema = z.object({
  jobNumber: z.string().min(1, "Job number is required"),
  customer: z.string().min(1, "Customer is required"),
  date: z.string().optional(),
  notes: z.string().optional(),
});

export async function GET(request: NextRequest) {
  try {
    const auth = requireRequestContext(request);
    if (!auth.ok) {
      return auth.response;
    }

    const includeParts = request.nextUrl.searchParams.get("includeParts") === "1";

    // Techs only see their own jobs
    const where = {
      organizationId: auth.context.organizationId,
      ...(auth.context.role === "TECH" ? { technicianId: auth.context.userId } : {}),
    };

    const includeClause = includeParts
      ? {
          technician: { select: { id: true, name: true } },
          parts: {
            include: {
              item: { select: { id: true, name: true, partNumber: true, unitOfMeasure: true } },
            },
          },
        }
      : {
          technician: { select: { id: true, name: true } },
          _count: { select: { parts: true } },
        };

    const jobs = await dbAny.job.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: includeClause,
    });
    return NextResponse.json(jobs);
  } catch (err) {
    console.error("Jobs GET error:", err);
    return NextResponse.json({ error: "Failed to fetch jobs" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = requireRequestContext(request);
    if (!auth.ok) {
      return auth.response;
    }

    const body = await request.json();
    const data = createSchema.parse(body);

    const job = await dbAny.job.create({
      data: {
        organizationId: auth.context.organizationId,
        jobNumber: data.jobNumber.trim(),
        customer: data.customer.trim(),
        technicianId: auth.context.userId,
        date: data.date ? new Date(data.date) : new Date(),
        notes: data.notes?.trim() || null,
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
