import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { appendJobHistory } from "@/lib/jobs/server";
import { serializeJobDetail, serializeJobSummary, type JobVisibility } from "@/lib/jobs/presenter";
import { jobDetailSelect, jobSummarySelect } from "@/lib/jobs/selects";
import { canViewFinancialValue, requireUserAccess } from "@/lib/permissions";
import { z } from "zod";

const dbAny = prisma as any;

const createSchema = z.object({
  jobNumber: z.string().min(1, "Job number is required"),
  title: z.string().optional().nullable(),
  description: z.string().optional(),
  customer: z.string().min(1, "Customer is required"),
  siteName: z.string().optional().nullable(),
  date: z.string().optional(),
  billingTotal: z.number().min(0).optional(),
  notes: z.string().optional(),
  customerSummary: z.string().optional().nullable(),
});

function normalizeOptionalText(value: unknown) {
  if (typeof value !== "string") {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function getJobVisibility(access: any): JobVisibility {
  return {
    showBaseCosts:
      canViewFinancialValue(access.financialVisibilityMode, "base", access) ||
      canViewFinancialValue(access.financialVisibilityMode, "job_costing", access),
    showMargin: canViewFinancialValue(access.financialVisibilityMode, "margin", access),
    showTotal:
      canViewFinancialValue(access.financialVisibilityMode, "total", access) ||
      canViewFinancialValue(access.financialVisibilityMode, "job_costing", access),
  };
}

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

    const visibility = getJobVisibility(access.access);
    const jobs = await dbAny.job.findMany({
      where,
      orderBy: { latestActivityAt: "desc" },
      select: includeParts ? jobDetailSelect : jobSummarySelect,
    });

    return NextResponse.json(
      jobs.map((job: any) => (includeParts ? serializeJobDetail(job, visibility) : serializeJobSummary(job, visibility)))
    );
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
    const data = createSchema.parse({
      ...body,
      title: body?.title === undefined ? undefined : normalizeOptionalText(body.title),
      description: body?.description === undefined ? undefined : normalizeOptionalText(body.description),
      siteName: body?.siteName === undefined ? undefined : normalizeOptionalText(body.siteName),
      notes: body?.notes === undefined ? undefined : normalizeOptionalText(body.notes),
      customerSummary: body?.customerSummary === undefined ? undefined : normalizeOptionalText(body.customerSummary),
    });

    const visibility = getJobVisibility(access.access);

    const job = await dbAny.$transaction(async (tx: any) => {
      const createdJob = await tx.job.create({
        data: {
          organizationId: access.access.organizationId,
          jobNumber: data.jobNumber.trim(),
          title: data.title ?? null,
          description: data.description ?? null,
          customer: data.customer.trim(),
          siteName: data.siteName ?? null,
          technicianId: access.access.userId,
          createdByUserId: access.access.userId,
          createdByName: access.access.name,
          date: data.date ? new Date(data.date) : new Date(),
          billingTotal: data.billingTotal ?? null,
          notes: data.notes ?? null,
          customerSummary: data.customerSummary ?? null,
          latestActivityAt: new Date(),
        },
        select: { id: true },
      });

      await appendJobHistory(tx, {
        organizationId: access.access.organizationId,
        jobId: createdJob.id,
        actorUserId: access.access.userId,
        actorName: access.access.name,
        actionType: "job_created",
        actionLabel: "Job created",
        details: `${data.jobNumber.trim()} created for ${data.customer.trim()}`,
      });

      return tx.job.findUnique({
        where: { id: createdJob.id },
        select: jobDetailSelect,
      });
    });

    return NextResponse.json(serializeJobDetail(job, visibility), { status: 201 });
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
