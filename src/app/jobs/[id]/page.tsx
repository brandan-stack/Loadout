import { JobDetailPageClient } from "@/components/jobs/job-detail-page-client";
import { prisma } from "@/lib/db";
import { serializeJobDetail } from "@/lib/jobs/presenter";
import { jobDetailSelect } from "@/lib/jobs/selects";
import { canViewFinancialValue, requirePageAccess } from "@/lib/permissions";

export default async function JobDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const access = await requirePageAccess("canViewJobs");
  const showBaseCosts =
    canViewFinancialValue(access.financialVisibilityMode, "base", access) ||
    canViewFinancialValue(access.financialVisibilityMode, "job_costing", access);
  const showMargin = canViewFinancialValue(access.financialVisibilityMode, "margin", access);
  const showTotal =
    canViewFinancialValue(access.financialVisibilityMode, "total", access) ||
    canViewFinancialValue(access.financialVisibilityMode, "job_costing", access);

  const { id } = await params;

  const job = await prisma.job.findFirst({
    where: { id, organizationId: access.organizationId },
    select: jobDetailSelect,
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
    lastUnitCost?: number;
    marginPercent?: number;
  }> = [];

  if (!job) {
    initialJobError = "Job not found. It may have been deleted or the link is incorrect.";
  } else if (access.role === "TECH" && job.technicianId !== access.userId) {
    initialJobError = "You don't have permission to view this job.";
  } else {
    const canManageJob = access.canEditJobs && (access.role !== "TECH" || job.technicianId === access.userId);
    initialJob = serializeJobDetail(job, {
      showBaseCosts,
      showMargin,
      showTotal,
    });

    if (canManageJob) {
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
          lastUnitCost: true,
          marginPercent: true,
        },
      });

      initialItems = items.map((item) => ({
        ...item,
        manufacturer: item.manufacturer ?? undefined,
        partNumber: item.partNumber ?? undefined,
        modelNumber: item.modelNumber ?? undefined,
        description: item.description ?? undefined,
        lastUnitCost: item.lastUnitCost ?? undefined,
        marginPercent: item.marginPercent ?? undefined,
      }));
    }
  }

  const canManageJob = job
    ? access.canEditJobs && (access.role !== "TECH" || job.technicianId === access.userId)
    : false;

  return (
    <JobDetailPageClient
      canManageJob={canManageJob}
      canCloseJobs={access.canCloseJobs}
      canInvoiceJobs={access.canInvoiceJobs}
      canDeleteJobs={canManageJob}
      canEditBillingTotal={canManageJob && showTotal}
      showBaseCosts={showBaseCosts}
      showMargin={showMargin}
      showTotal={showTotal}
      jobId={id}
      initialJob={initialJob}
      initialItems={initialItems}
      initialJobError={initialJobError}
    />
  );
}