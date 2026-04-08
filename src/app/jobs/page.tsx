import { redirect } from "next/navigation";
import { JobsPageClient } from "@/components/jobs/jobs-page-client";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";

export default async function JobsPage() {
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  const jobs = await prisma.job.findMany({
    where: {
      organizationId: session.organizationId,
      ...(session.role === "TECH" ? { technicianId: session.userId } : {}),
    },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      jobNumber: true,
      customer: true,
      date: true,
      status: true,
      technician: {
        select: {
          id: true,
          name: true,
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
      currentUserRole={session.role}
      initialJobs={jobs.map((job) => ({
        ...job,
        date: job.date.toISOString(),
      }))}
    />
  );
}
