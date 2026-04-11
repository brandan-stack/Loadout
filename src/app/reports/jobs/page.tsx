import { JobsReportPageClient } from "@/components/reports/jobs-report-page-client";
import { prisma } from "@/lib/db";
import { canViewFinancialValue, requirePageAccess } from "@/lib/permissions";

export default async function JobsReportPage() {
  const access = await requirePageAccess("canViewReports");
  const showFinancials =
    canViewFinancialValue(access.financialVisibilityMode, "base") ||
    canViewFinancialValue(access.financialVisibilityMode, "total") ||
    canViewFinancialValue(access.financialVisibilityMode, "job_costing");

  const jobs = access.role === "TECH"
    ? await prisma.job.findMany({
        where: {
          organizationId: access.organizationId,
          technicianId: access.userId,
        },
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          jobNumber: true,
          customer: true,
          date: true,
          status: true,
          notes: true,
          technician: { select: { id: true, name: true } },
          parts: {
            select: {
              id: true,
              quantity: true,
              unitCost: true,
              notes: true,
              item: { select: { id: true, name: true, partNumber: true, unitOfMeasure: true } },
            },
          },
        },
      })
    : await prisma.job.findMany({
        where: {
          organizationId: access.organizationId,
        },
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          jobNumber: true,
          customer: true,
          date: true,
          status: true,
          notes: true,
          technician: { select: { id: true, name: true } },
          parts: {
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

  return (
    <JobsReportPageClient
      showFinancials={showFinancials}
      initialJobs={jobs.map((job) => ({
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
      }))}
    />
  );
}