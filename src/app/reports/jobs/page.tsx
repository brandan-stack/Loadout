import { redirect } from "next/navigation";
import { JobsReportPageClient } from "@/components/reports/jobs-report-page-client";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";

export default async function JobsReportPage() {
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  const jobs = session.role === "TECH"
    ? []
    : await prisma.job.findMany({
        where: {
          organizationId: session.organizationId,
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
      currentUserRole={session.role}
      initialJobs={jobs.map((job) => ({
        ...job,
        date: job.date.toISOString(),
        notes: job.notes ?? undefined,
        parts: job.parts.map((part) => ({
          ...part,
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