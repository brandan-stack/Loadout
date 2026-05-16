import { JobsPageClient } from "@/components/jobs/jobs-page-client";
import { prisma } from "@/lib/db";
import { serializeJobSummary } from "@/lib/jobs/presenter";
import { jobSummarySelect } from "@/lib/jobs/selects";
import { canViewFinancialValue, requirePageAccess } from "@/lib/permissions";

export default async function JobsPage() {
  const access = await requirePageAccess("canViewJobs");
  const dbAny = prisma as any;
  const visibility = {
    showBaseCosts:
      canViewFinancialValue(access.financialVisibilityMode, "base", access) ||
      canViewFinancialValue(access.financialVisibilityMode, "job_costing", access),
    showMargin: canViewFinancialValue(access.financialVisibilityMode, "margin", access),
    showTotal:
      canViewFinancialValue(access.financialVisibilityMode, "total", access) ||
      canViewFinancialValue(access.financialVisibilityMode, "job_costing", access),
  };

  const jobs = await dbAny.job.findMany({
    where: {
      organizationId: access.organizationId,
      ...(access.role === "TECH" ? { technicianId: access.userId } : {}),
    },
    orderBy: { latestActivityAt: "desc" },
    select: jobSummarySelect,
  });

  return (
    <JobsPageClient
      canCreateJobs={access.canCreateJobs}
      canEditJobs={access.canEditJobs}
      canCloseJobs={access.canCloseJobs}
      canInvoiceJobs={access.canInvoiceJobs}
      initialJobs={jobs.map((job: any) => serializeJobSummary(job, visibility))}
      financialVisibilityMode={access.financialVisibilityMode}
      priceVisibility={{
        canViewBasePrice: access.canViewBasePrice,
        canViewMarginPrice: access.canViewMarginPrice,
        canViewTotalPrice: access.canViewTotalPrice,
      }}
    />
  );
}
