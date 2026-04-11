import { redirect } from "next/navigation";
import { JobDetailPageClient } from "@/components/jobs/job-detail-page-client";
import { prisma } from "@/lib/db";
import { canViewFinancialValue, requirePageAccess } from "@/lib/permissions";

export default async function JobDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const access = await requirePageAccess("canViewJobs");
  const showFinancials =
    canViewFinancialValue(access.financialVisibilityMode, "base") ||
    canViewFinancialValue(access.financialVisibilityMode, "total") ||
    canViewFinancialValue(access.financialVisibilityMode, "job_costing");

  const { id } = await params;

  const job = await prisma.job.findFirst({
    where: { id, organizationId: access.organizationId },
    select: {
      id: true,
      jobNumber: true,
      customer: true,
      date: true,
      status: true,
      notes: true,
      technicianId: true,
      technician: { select: { id: true, name: true } },
      parts: {
        orderBy: { createdAt: "asc" },
        select: {
          id: true,
          quantity: true,
          unitCost: true,
          notes: true,
          item: { select: { id: true, name: true, partNumber: true, unitOfMeasure: true } },
        },
      },
    },
  });

  let initialJobError: string | null = null;
  let initialJob = null;
  let initialItems: Array<{
    id: string;
    name: string;
    manufacturer?: string;
    partNumber?: string;
    modelNumber?: string;
    description?: string;
    quantityOnHand: number;
    unitOfMeasure: string;
  }> = [];

  if (!job) {
    initialJobError = "Job not found. It may have been deleted or the link is incorrect.";
  } else if (access.role === "TECH" && job.technicianId !== access.userId) {
    initialJobError = "You don't have permission to view this job.";
  } else {
    const canEditJob = job.status !== "INVOICED" && access.canEditJobs && (access.role !== "TECH" || job.technicianId === access.userId);
    initialJob = {
      ...job,
      date: job.date.toISOString(),
      notes: job.notes ?? undefined,
      parts: job.parts.map((part) => ({
        ...part,
        unitCost: showFinancials ? part.unitCost : 0,
        notes: part.notes ?? undefined,
        item: {
          ...part.item,
          partNumber: part.item.partNumber ?? undefined,
        },
      })),
    };

    if (canEditJob) {
      const items = await prisma.item.findMany({
        where: { organizationId: access.organizationId },
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          name: true,
          manufacturer: true,
          partNumber: true,
          modelNumber: true,
          description: true,
          quantityOnHand: true,
          unitOfMeasure: true,
        },
      });

      initialItems = items.map((item) => ({
        ...item,
        manufacturer: item.manufacturer ?? undefined,
        partNumber: item.partNumber ?? undefined,
        modelNumber: item.modelNumber ?? undefined,
        description: item.description ?? undefined,
      }));
    }
  }

  const canEditJob = job
    ? job.status !== "INVOICED" && access.canEditJobs && (access.role !== "TECH" || job.technicianId === access.userId)
    : false;

  return (
    <JobDetailPageClient
      currentUserId={access.userId}
      canEditJob={canEditJob}
      canChangeStatus={access.canCloseJobs || access.canInvoiceJobs}
      showFinancials={showFinancials}
      jobId={id}
      initialJob={initialJob}
      initialItems={initialItems}
      initialJobError={initialJobError}
    />
  );
}