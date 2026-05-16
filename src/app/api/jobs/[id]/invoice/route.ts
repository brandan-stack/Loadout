import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { appendJobHistory } from "@/lib/jobs/server";
import { serializeJobDetail, type JobVisibility } from "@/lib/jobs/presenter";
import { jobDetailSelect } from "@/lib/jobs/selects";
import { hasJobInvoiceMetadata, normalizeJobStatus } from "@/lib/jobs/workflow";
import { canViewFinancialValue, requireUserAccess } from "@/lib/permissions";

const dbAny = prisma as any;

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
      select: {
        id: true,
        status: true,
        technicianId: true,
        invoiceNumber: true,
        invoiceDate: true,
        invoicedByName: true,
      },
    });

    if (!job) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    if (access.access.role === "TECH" && job.technicianId !== access.access.userId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (!access.access.canInvoiceJobs) {
      return NextResponse.json({ error: "You do not have permission to delete invoices." }, { status: 403 });
    }

    const hasInvoiceMetadata = hasJobInvoiceMetadata({
      status: normalizeJobStatus(job.status),
      invoiceNumber: job.invoiceNumber,
      invoiceDate: job.invoiceDate,
      invoicedByName: job.invoicedByName,
    });
    if (!hasInvoiceMetadata) {
      return NextResponse.json({ error: "This job does not have invoice data to remove." }, { status: 400 });
    }

    const updatedJob = await dbAny.$transaction(async (tx: any) => {
      await tx.job.update({
        where: { id },
        data: {
          status: "COMPLETED",
          invoiceNumber: null,
          invoiceDate: null,
          invoicedByUserId: null,
          invoicedByName: null,
          latestActivityAt: new Date(),
        },
      });

      await appendJobHistory(tx, {
        organizationId: access.access.organizationId,
        jobId: id,
        actorUserId: access.access.userId,
        actorName: access.access.name,
        actionType: "invoice_deleted",
        actionLabel: "Invoice deleted, job returned to completed",
        details: "Invoice metadata removed and job returned to completed.",
      });

      return tx.job.findUnique({
        where: { id },
        select: jobDetailSelect,
      });
    });

    return NextResponse.json(serializeJobDetail(updatedJob, getJobVisibility(access.access)));
  } catch (error) {
    console.error("Delete invoice error:", error);
    return NextResponse.json({ error: "Failed to delete invoice" }, { status: 500 });
  }
}