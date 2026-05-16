import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { appendJobHistory } from "@/lib/jobs/server";
import { serializeJobDetail, type JobVisibility } from "@/lib/jobs/presenter";
import { jobDetailSelect } from "@/lib/jobs/selects";
import {
  getJobStatusLabel,
  getJobStatusTransitionError,
  getStatusChangeHistoryLabel,
  JOB_STATUS_VALUES,
  normalizeJobStatus,
  type JobStatus,
} from "@/lib/jobs/workflow";
import { canViewFinancialValue, requireUserAccess } from "@/lib/permissions";
import { z } from "zod";

const dbAny = prisma as any;

const updateSchema = z.object({
  jobNumber: z.string().min(1).optional(),
  title: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
  customer: z.string().min(1).optional(),
  siteName: z.string().optional().nullable(),
  date: z.string().optional(),
  status: z.enum(JOB_STATUS_VALUES).optional(),
  billingTotal: z.number().min(0).nullable().optional(),
  notes: z.string().optional().nullable(),
  customerSummary: z.string().optional().nullable(),
  invoiceNumber: z.string().optional().nullable(),
  invoiceDate: z.string().optional().nullable(),
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

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const access = await requireUserAccess(request);
    if (!access.ok) {
      return access.response;
    }

    const job = await dbAny.job.findFirst({
      where: { id, organizationId: access.access.organizationId },
      select: jobDetailSelect,
    });

    if (!job) return NextResponse.json({ error: "Job not found" }, { status: 404 });

    // Techs can only see their own jobs
    if (access.access.role === "TECH" && job.technicianId !== access.access.userId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    return NextResponse.json(serializeJobDetail(job, getJobVisibility(access.access)));
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
    const access = await requireUserAccess(request);
    if (!access.ok) {
      return access.response;
    }

    const job = await dbAny.job.findFirst({
      where: { id, organizationId: access.access.organizationId },
      select: {
        id: true,
        jobNumber: true,
        title: true,
        description: true,
        customer: true,
        siteName: true,
        notes: true,
        customerSummary: true,
        technicianId: true,
        status: true,
        billingTotal: true,
        invoiceNumber: true,
        invoiceDate: true,
      },
    });
    if (!job) return NextResponse.json({ error: "Job not found" }, { status: 404 });

    // Techs can only update their own jobs, and cannot change status
    if (access.access.role === "TECH" && job.technicianId !== access.access.userId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (!access.access.canEditJobs && !access.access.canCloseJobs && !access.access.canInvoiceJobs) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const currentStatus = normalizeJobStatus(job.status);

    const body = await request.json();
    const data = updateSchema.parse({
      ...body,
      title: body?.title === undefined ? undefined : normalizeOptionalText(body.title),
      description: body?.description === undefined ? undefined : normalizeOptionalText(body.description),
      siteName: body?.siteName === undefined ? undefined : normalizeOptionalText(body.siteName),
      notes: body?.notes === undefined ? undefined : normalizeOptionalText(body.notes),
      customerSummary: body?.customerSummary === undefined ? undefined : normalizeOptionalText(body.customerSummary),
      invoiceNumber: body?.invoiceNumber === undefined ? undefined : normalizeOptionalText(body.invoiceNumber),
      invoiceDate: body?.invoiceDate === undefined ? undefined : normalizeOptionalText(body.invoiceDate),
    });

    // Techs cannot change status
    if (access.access.role === "TECH" && data.status) {
      return NextResponse.json({ error: "Technicians cannot change job status" }, { status: 403 });
    }

    if (
      (
        data.jobNumber ||
        data.title !== undefined ||
        data.description !== undefined ||
        data.customer ||
        data.siteName !== undefined ||
        data.date ||
        data.notes !== undefined ||
        data.customerSummary !== undefined ||
        data.billingTotal !== undefined
      ) &&
      !access.access.canEditJobs
    ) {
      return NextResponse.json({ error: "You do not have permission to edit jobs" }, { status: 403 });
    }

    const nextStatus = data.status as JobStatus | undefined;

    if (nextStatus) {
      if (nextStatus === "INVOICED" && !access.access.canInvoiceJobs) {
        return NextResponse.json({ error: "You do not have permission to invoice jobs" }, { status: 403 });
      }

      if ((nextStatus === "OPEN" || nextStatus === "COMPLETED") && !access.access.canCloseJobs) {
        return NextResponse.json({ error: "You do not have permission to move this job" }, { status: 403 });
      }

      if (currentStatus === "INVOICED" && nextStatus === "COMPLETED") {
        return NextResponse.json({ error: "Use Delete invoice to return an invoiced job to Completed." }, { status: 400 });
      }

      const transitionError = getJobStatusTransitionError(currentStatus, nextStatus);
      if (transitionError) {
        return NextResponse.json({ error: transitionError }, { status: 400 });
      }
    }

    const updated = await dbAny.$transaction(async (tx: any) => {
      const updateData: Record<string, unknown> = {
        latestActivityAt: new Date(),
      };

      if (!nextStatus && currentStatus !== job.status) {
        updateData.status = currentStatus;
      }

      if (data.jobNumber) {
        updateData.jobNumber = data.jobNumber.trim();
      }
      if (data.title !== undefined) {
        updateData.title = data.title;
      }
      if (data.description !== undefined) {
        updateData.description = data.description;
      }
      if (data.customer) {
        updateData.customer = data.customer.trim();
      }
      if (data.siteName !== undefined) {
        updateData.siteName = data.siteName;
      }
      if (data.date) {
        updateData.date = new Date(data.date);
      }
      if (data.billingTotal !== undefined) {
        updateData.billingTotal = data.billingTotal;
      }
      if (data.notes !== undefined) {
        updateData.notes = data.notes;
      }
      if (data.customerSummary !== undefined) {
        updateData.customerSummary = data.customerSummary;
      }

      if (nextStatus) {
        updateData.status = nextStatus;

        if (nextStatus === "COMPLETED") {
          updateData.completedAt = new Date();
          updateData.completedByUserId = access.access.userId;
          updateData.completedByName = access.access.name;
        }

        if (nextStatus === "OPEN") {
          updateData.invoiceNumber = null;
          updateData.invoiceDate = null;
          updateData.invoicedByUserId = null;
          updateData.invoicedByName = null;
        }

        if (nextStatus === "INVOICED") {
          updateData.invoiceNumber = data.invoiceNumber ?? null;
          updateData.invoiceDate = data.invoiceDate ? new Date(data.invoiceDate) : new Date();
          updateData.invoicedByUserId = access.access.userId;
          updateData.invoicedByName = access.access.name;
        }
      }

      await tx.job.update({
        where: { id },
        data: updateData,
      });

      const editedFields = [
        data.jobNumber !== undefined ? "job number" : null,
        data.title !== undefined ? "title" : null,
        data.description !== undefined ? "description" : null,
        data.customer !== undefined ? "customer" : null,
        data.siteName !== undefined ? "site" : null,
        data.date !== undefined ? "date" : null,
        data.billingTotal !== undefined ? "billing total" : null,
        data.notes !== undefined ? "notes" : null,
        data.customerSummary !== undefined ? "customer summary" : null,
        !nextStatus && data.invoiceNumber !== undefined ? "invoice number" : null,
        !nextStatus && data.invoiceDate !== undefined ? "invoice date" : null,
      ].filter(Boolean);

      if (nextStatus) {
        await appendJobHistory(tx, {
          organizationId: access.access.organizationId,
          jobId: id,
          actorUserId: access.access.userId,
          actorName: access.access.name,
          actionType: `status_${String(nextStatus).toLowerCase()}`,
          actionLabel: getStatusChangeHistoryLabel(nextStatus),
          details:
            nextStatus === "INVOICED"
              ? `Invoice ${data.invoiceNumber ?? "pending number"}`
              : `Status moved to ${getJobStatusLabel(nextStatus).toLowerCase()}`,
        });
      } else if (editedFields.length > 0) {
        await appendJobHistory(tx, {
          organizationId: access.access.organizationId,
          jobId: id,
          actorUserId: access.access.userId,
          actorName: access.access.name,
          actionType: "job_updated",
          actionLabel: "Job details updated",
          details: `Updated ${editedFields.join(", ")}`,
        });
      }

      return tx.job.findUnique({
        where: { id },
        select: jobDetailSelect,
      });
    });

    return NextResponse.json(serializeJobDetail(updated, getJobVisibility(access.access)));
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
    const access = await requireUserAccess(request);
    if (!access.ok) {
      return access.response;
    }

    const job = await dbAny.job.findFirst({
      where: { id, organizationId: access.access.organizationId },
      include: {
        parts: {
          include: {
            item: { select: { quantityOnHand: true } },
          },
        },
        technician: { select: { id: true } },
      },
    });
    if (!job) return NextResponse.json({ error: "Job not found" }, { status: 404 });

    // Only owner or admins can delete
    if (access.access.role === "TECH" && job.technicianId !== access.access.userId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (!access.access.canEditJobs) {
      return NextResponse.json({ error: "You do not have permission to delete jobs." }, { status: 403 });
    }

    await dbAny.$transaction(async (tx: any) => {
      for (const part of job.parts) {
        const nextQuantityOnHand = (part.item?.quantityOnHand ?? 0) + part.quantity;

        await tx.item.update({
          where: { id: part.itemId },
          data: {
            quantityOnHand: nextQuantityOnHand,
            quantityUsedTotal: { decrement: part.quantity },
            lastMovementAt: new Date(),
            lastMovementType: "return_from_job",
          },
        });

        await tx.inventoryTransaction.create({
          data: {
            organizationId: access.access.organizationId,
            itemId: part.itemId,
            actorUserId: access.access.userId,
            jobId: job.id,
            type: "add",
            quantity: part.quantity,
            quantityDelta: part.quantity,
            balanceAfter: nextQuantityOnHand,
            jobNumberSnapshot: job.jobNumber,
            costSnapshot: part.unitCost ?? 0,
            notes: `Job ${job.jobNumber} deleted — stock restored`,
            syncedAt: new Date(),
          },
        });
      }

      await tx.job.delete({ where: { id } });
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Job DELETE error:", err);
    return NextResponse.json({ error: "Failed to delete job" }, { status: 500 });
  }
}
