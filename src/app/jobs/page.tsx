import { JobsPageClient } from "@/components/jobs/jobs-page-client";
import { prisma } from "@/lib/db";
import { requirePageAccess } from "@/lib/permissions";

export default async function JobsPage() {
  const access = await requirePageAccess("canViewJobs");
  const dbAny = prisma as any;

  const jobs = await dbAny.job.findMany({
    where: {
      organizationId: access.organizationId,
      ...(access.role === "TECH" ? { technicianId: access.userId } : {}),
    },
    orderBy: { latestActivityAt: "desc" },
    select: {
      id: true,
      jobNumber: true,
      description: true,
      customer: true,
      date: true,
      status: true,
      latestActivityAt: true,
      technician: {
        select: {
          id: true,
          name: true,
        },
      },
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
      _count: {
        select: {
          parts: true,
        },
      },
    },
  });

  return (
    <JobsPageClient
      canCreateJobs={access.canCreateJobs}
      initialJobs={jobs.map((job: any) => ({
        ...job,
        description: job.description ?? undefined,
        date: job.date.toISOString(),
        latestActivityAt: job.latestActivityAt.toISOString(),
        needsPartsAttention: job.parts.some(
          (part: any) => part.item.quantityOnHand < part.quantity || part.item.quantityOnHand <= part.item.lowStockRedThreshold
        ),
      }))}
    />
  );
}
