import type { InventoryItem } from "../hooks/useItems";

export type JobUsageLine = {
  id: string;
  ts: number;
  jobId: string;
  jobName: string;
  jobNumber?: string;

  itemId: string;
  itemName: string;
  partNumber?: string;

  qty: number;
  locationId?: string; // optional
  note?: string;
  submittedByUserId?: string;
  submittedByName?: string;
  unitPrice?: number;
  marginPercent?: number;
  estimatedSellPrice?: number;
  lineCost?: number;
  lineEstimatedSell?: number;
  photoDataUrl?: string;
  manufacturer?: string;
  model?: string;
  serial?: string;
  description?: string;
};

export type Job = {
  id: string;
  name: string;
  customer?: string;
  po?: string;
  createdAt: number;
  closedAt?: number;
  completedAt?: number;
  notifiedAt?: number;
  notifyTargets?: Array<"sales" | "invoice" | "quote">;
  status: "open" | "closed" | "completed";
  notes?: string;
};

const JOBS_KEY = "inventory.jobs.v1";
const USAGE_KEY = "inventory.jobUsage.v1";

function newId() {
  return Math.random().toString(36).slice(2, 10) + "-" + Date.now().toString(36);
}

function load<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}
function save<T>(key: string, value: T) {
  localStorage.setItem(key, JSON.stringify(value));
}

export function loadJobs(): Job[] {
  const jobs = load<Job[]>(JOBS_KEY, []);
  return Array.isArray(jobs) ? jobs : [];
}
export function saveJobs(jobs: Job[]) {
  save(JOBS_KEY, jobs);
}

export function loadJobUsage(): JobUsageLine[] {
  const lines = load<JobUsageLine[]>(USAGE_KEY, []);
  return Array.isArray(lines) ? lines : [];
}
export function saveJobUsage(lines: JobUsageLine[]) {
  save(USAGE_KEY, lines);
}

export function createJob(input: { name: string; customer?: string; po?: string; notes?: string }) {
  const jobs = loadJobs();
  const job: Job = {
    id: newId(),
    name: input.name.trim(),
    customer: input.customer?.trim() || "",
    po: input.po?.trim() || "",
    notes: input.notes?.trim() || "",
    createdAt: Date.now(),
    status: "open",
  };
  jobs.unshift(job);
  saveJobs(jobs);
  return job;
}

export function closeJob(jobId: string) {
  const jobs = loadJobs().map((j) =>
    j.id === jobId ? { ...j, status: "closed" as const, closedAt: Date.now() } : j
  );
  saveJobs(jobs);
}

export function reopenJob(jobId: string) {
  const jobs = loadJobs().map((j) =>
    j.id === jobId
      ? {
          ...j,
          status: "open" as const,
          closedAt: undefined,
          completedAt: undefined,
          notifiedAt: undefined,
          notifyTargets: undefined,
        }
      : j
  );
  saveJobs(jobs);
}

export function submitJob(jobId: string, notifyTargets: Array<"sales" | "invoice" | "quote"> = ["sales", "invoice", "quote"]) {
  const now = Date.now();
  let submitted: Job | null = null;
  const jobs = loadJobs().map((j) => {
    if (j.id !== jobId) return j;
    submitted = {
      ...j,
      status: "completed" as const,
      closedAt: now,
      completedAt: now,
      notifiedAt: now,
      notifyTargets,
    };
    return submitted;
  });
  saveJobs(jobs);
  return submitted;
}

export function completeJob(jobId: string) {
  const now = Date.now();
  const jobs = loadJobs().map((j) =>
    j.id === jobId ? { ...j, status: "completed" as const, completedAt: now, closedAt: now } : j
  );
  saveJobs(jobs);
}

export function logJobUsage(opts: {
  job: Job;
  jobNumber?: string;
  item: InventoryItem;
  qty: number;
  locationId?: string;
  note?: string;
  submittedByUserId?: string;
  submittedByName?: string;
}) {
  const lines = loadJobUsage();
  const unitPrice = typeof opts.item.unitPrice === "number" ? opts.item.unitPrice : undefined;
  const marginPercent = typeof opts.item.marginPercent === "number" ? opts.item.marginPercent : undefined;
  const estimatedSellPrice =
    typeof unitPrice === "number" && typeof marginPercent === "number"
      ? unitPrice * (1 + marginPercent / 100)
      : undefined;
  const qty = Math.floor(Number(opts.qty) || 0);
  const line: JobUsageLine = {
    id: newId(),
    ts: Date.now(),
    jobId: opts.job.id,
    jobName: opts.job.name,
    jobNumber: opts.jobNumber || "",
    itemId: opts.item.id,
    itemName: opts.item.name,
    partNumber: opts.item.partNumber || "",
    qty,
    locationId: opts.locationId || "",
    note: opts.note || "",
    submittedByUserId: opts.submittedByUserId || "",
    submittedByName: opts.submittedByName || "",
    unitPrice,
    marginPercent,
    estimatedSellPrice,
    lineCost: typeof unitPrice === "number" ? unitPrice * qty : undefined,
    lineEstimatedSell: typeof estimatedSellPrice === "number" ? estimatedSellPrice * qty : undefined,
    photoDataUrl: opts.item.photoDataUrl || "",
    manufacturer: opts.item.manufacturer || "",
    model: opts.item.model || "",
    serial: opts.item.serial || "",
    description: opts.item.description || "",
  };
  lines.unshift(line);
  saveJobUsage(lines.slice(0, 1000));
  return line;
}

export function exportJobCSV(jobId: string) {
  const jobs = loadJobs();
  const job = jobs.find((j) => j.id === jobId);
  if (!job) return null;

  const lines = loadJobUsage().filter((l) => l.jobId === jobId);

  function esc(v: unknown) {
    const s = String(v ?? "");
    if (s.includes('"') || s.includes(",") || s.includes("\n")) return `"${s.replaceAll('"', '""')}"`;
    return s;
  }

  const out: string[] = [];
  out.push(["Job", "Customer", "PO", "Date", "Item", "Part#", "Qty", "Location", "Note"].join(","));
  for (const l of lines) {
    out.push(
      [
        esc(job.name),
        esc(job.customer),
        esc(job.po),
        esc(new Date(l.ts).toLocaleString()),
        esc(l.itemName),
        esc(l.partNumber),
        esc(l.qty),
        esc(l.locationId),
        esc(l.note),
      ].join(",")
    );
  }

  return {
    filename: `job_${job.name.replaceAll(" ", "_")}_${new Date().toISOString().slice(0, 10)}.csv`,
    csv: out.join("\n"),
  };
}