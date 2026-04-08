import { redirect } from "next/navigation";
import { JobDetailPageClient } from "@/components/jobs/job-detail-page-client";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";

export default async function JobDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  const { id } = await params;

  const job = await prisma.job.findFirst({
    where: { id, organizationId: session.organizationId },
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
  } else if (session.role === "TECH" && job.technicianId !== session.userId) {
    initialJobError = "You don't have permission to view this job.";
  } else {
    initialJob = {
      ...job,
      date: job.date.toISOString(),
      notes: job.notes ?? undefined,
      parts: job.parts.map((part) => ({
        ...part,
        unitCost: session.role === "TECH" ? 0 : part.unitCost,
        notes: part.notes ?? undefined,
        item: {
          ...part.item,
          partNumber: part.item.partNumber ?? undefined,
        },
      })),
    };

    if (job.status !== "INVOICED" && (session.role !== "TECH" || job.technicianId === session.userId)) {
      const items = await prisma.item.findMany({
        where: { organizationId: session.organizationId },
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

  return (
    <JobDetailPageClient
      currentUserId={session.userId}
      currentUserRole={session.role}
      jobId={id}
      initialJob={initialJob}
      initialItems={initialItems}
      initialJobError={initialJobError}
    />
  );
}