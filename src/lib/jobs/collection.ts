import type { SerializedJobSummary } from "@/lib/jobs/presenter";
import { getJobStatusLabel, normalizeJobStatus, type JobStatus } from "@/lib/jobs/workflow";

export const JOB_ACTIVITY_FILTER_VALUES = ["all", "today", "week", "month"] as const;

export type JobActivityFilter = (typeof JOB_ACTIVITY_FILTER_VALUES)[number];

type JobCollectionEntry = Pick<
  SerializedJobSummary,
  "id" | "jobNumber" | "displayTitle" | "customer" | "status" | "latestActivityAt" | "createdAt" | "date" | "partsCount" | "needsPartsAttention"
> & {
  technician: {
    name: string;
  };
};

const DAY_IN_MS = 24 * 60 * 60 * 1000;

function toTimestamp(value?: string) {
  if (!value) {
    return 0;
  }

  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) ? timestamp : 0;
}

function getSortTimestamp(job: Pick<JobCollectionEntry, "latestActivityAt" | "createdAt" | "date">) {
  return toTimestamp(job.latestActivityAt) || toTimestamp(job.createdAt) || toTimestamp(job.date);
}

function matchesRecentActivity(job: Pick<JobCollectionEntry, "latestActivityAt" | "createdAt" | "date">, filter: JobActivityFilter) {
  if (filter === "all") {
    return true;
  }

  const timestamp = getSortTimestamp(job);
  if (timestamp === 0) {
    return false;
  }

  const age = Date.now() - timestamp;

  if (filter === "today") {
    return age <= DAY_IN_MS;
  }

  if (filter === "week") {
    return age <= 7 * DAY_IN_MS;
  }

  return age <= 30 * DAY_IN_MS;
}

export function dedupeJobCollection<T extends { id: string }>(jobs: T[]) {
  const seen = new Set<string>();

  return jobs.filter((job) => {
    if (seen.has(job.id)) {
      return false;
    }

    seen.add(job.id);
    return true;
  });
}

export function sortJobsByLatestActivity<T extends Pick<JobCollectionEntry, "latestActivityAt" | "createdAt" | "date">>(jobs: T[]) {
  return [...jobs].sort((left, right) => getSortTimestamp(right) - getSortTimestamp(left));
}

export function summarizeJobCollection<T extends { id: string; status: string; partsCount?: number; needsPartsAttention?: boolean }>(jobs: T[]) {
  return dedupeJobCollection(jobs).reduce(
    (summary, job) => {
      const status = normalizeJobStatus(job.status);

      if (status === "OPEN") {
        summary.open += 1;
      } else if (status === "COMPLETED") {
        summary.completed += 1;
      } else {
        summary.invoiced += 1;
      }

      summary.parts += job.partsCount ?? 0;
      if (job.needsPartsAttention) {
        summary.attention += 1;
      }

      return summary;
    },
    { open: 0, completed: 0, invoiced: 0, parts: 0, attention: 0 }
  );
}

export function getVisiblePartsCount<T extends { partsCount?: number }>(jobs: T[]) {
  return jobs.reduce((total, job) => total + (job.partsCount ?? 0), 0);
}

export function buildJobFilterOptions<T extends Pick<JobCollectionEntry, "id" | "customer" | "technician">>(jobs: T[]) {
  const dedupedJobs = dedupeJobCollection(jobs);
  const collator = new Intl.Collator("en-US", { sensitivity: "base" });
  const customers = Array.from(new Set(dedupedJobs.map((job) => job.customer.trim()).filter(Boolean))).sort(collator.compare);
  const technicians = Array.from(new Set(dedupedJobs.map((job) => job.technician.name.trim()).filter(Boolean))).sort(collator.compare);

  return {
    customers,
    technicians,
  };
}

function getJobSearchText(job: JobCollectionEntry) {
  return [
    job.jobNumber,
    job.displayTitle,
    job.customer,
    job.technician.name,
    getJobStatusLabel(job.status),
  ]
    .join(" ")
    .toLowerCase();
}

export function filterJobCollection<T extends JobCollectionEntry>(
  jobs: T[],
  filters: {
    status: JobStatus;
    query?: string;
    customer?: string;
    technician?: string;
    activity?: JobActivityFilter;
  }
) {
  const query = filters.query?.trim().toLowerCase() ?? "";
  const customer = filters.customer?.trim().toLowerCase() ?? "";
  const technician = filters.technician?.trim().toLowerCase() ?? "";
  const activity = filters.activity ?? "all";

  return sortJobsByLatestActivity(dedupeJobCollection(jobs)).filter((job) => {
    if (normalizeJobStatus(job.status) !== filters.status) {
      return false;
    }

    if (customer && job.customer.trim().toLowerCase() !== customer) {
      return false;
    }

    if (technician && job.technician.name.trim().toLowerCase() !== technician) {
      return false;
    }

    if (!matchesRecentActivity(job, activity)) {
      return false;
    }

    if (!query) {
      return true;
    }

    return getJobSearchText(job).includes(query);
  });
}