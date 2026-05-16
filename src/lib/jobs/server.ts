import { buildPricingSnapshot, type JobStatus } from "@/lib/jobs/workflow";

export async function appendJobHistory(
  tx: any,
  entry: {
    organizationId: string;
    jobId: string;
    actorUserId?: string | null;
    actorName?: string | null;
    actionType: string;
    actionLabel: string;
    details?: string | null;
  }
) {
  return tx.jobHistory.create({
    data: {
      organizationId: entry.organizationId,
      jobId: entry.jobId,
      actorUserId: entry.actorUserId ?? null,
      actorName: entry.actorName ?? null,
      actionType: entry.actionType,
      actionLabel: entry.actionLabel,
      details: entry.details ?? null,
    },
  });
}

export async function touchJob(tx: any, jobId: string, status?: JobStatus) {
  return tx.job.update({
    where: { id: jobId },
    data: {
      latestActivityAt: new Date(),
      ...(status ? { status } : {}),
    },
  });
}

export function createJobPartSnapshot(values: {
  unitCost?: number | null;
  markupPercent?: number | null;
  itemName?: string | null;
  itemPartNumber?: string | null;
  jobDescription?: string | null;
}) {
  const pricing = buildPricingSnapshot(values.unitCost, values.markupPercent);

  return {
    ...pricing,
    costSnapshot: pricing.unitCost,
    itemNameSnapshot: values.itemName ?? null,
    itemPartNumberSnapshot: values.itemPartNumber ?? null,
    jobDescriptionSnapshot: values.jobDescription ?? null,
  };
}