export const JOB_STATUS_VALUES = ["OPEN", "COMPLETED", "INVOICED"] as const;

export type JobStatus = (typeof JOB_STATUS_VALUES)[number];

const LEGACY_JOB_STATUS_ALIASES: Record<string, JobStatus> = {
  OPEN: "OPEN",
  CLOSED: "COMPLETED",
  COMPLETE: "COMPLETED",
  COMPLETED: "COMPLETED",
  INVOICED: "INVOICED",
};

export const JOB_STATUS_LABELS: Record<JobStatus, string> = {
  OPEN: "Open",
  COMPLETED: "Completed",
  INVOICED: "Invoiced",
};

export type JobPricingPart = {
  quantity: number;
  unitCost?: number | null;
  markupPercent?: number | null;
  unitSell?: number | null;
};

export type JobInvoiceFields = {
  billingTotal?: number | null;
};

export function normalizeJobStatus(value: string | null | undefined): JobStatus {
  const normalized = typeof value === "string" ? value.trim().toUpperCase() : "";

  if (normalized in LEGACY_JOB_STATUS_ALIASES) {
    return LEGACY_JOB_STATUS_ALIASES[normalized];
  }

  if (JOB_STATUS_VALUES.includes(normalized as JobStatus)) {
    return normalized as JobStatus;
  }

  return "OPEN";
}

export function getJobStatusLabel(status: string | null | undefined) {
  return JOB_STATUS_LABELS[normalizeJobStatus(status)];
}

function normalizeCurrency(value: number | null | undefined) {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function normalizePercent(value: number | null | undefined) {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

export function roundCurrency(value: number) {
  return Math.round(value * 100) / 100;
}

export function getComputedUnitSell(part: Pick<JobPricingPart, "unitCost" | "markupPercent" | "unitSell">) {
  const unitCost = normalizeCurrency(part.unitCost);
  const explicitUnitSell = normalizeCurrency(part.unitSell);

  if (explicitUnitSell > 0 || unitCost === 0) {
    return roundCurrency(explicitUnitSell);
  }

  return roundCurrency(unitCost * (1 + normalizePercent(part.markupPercent) / 100));
}

export function getLineCost(part: Pick<JobPricingPart, "quantity" | "unitCost">) {
  return roundCurrency(Math.max(0, part.quantity) * normalizeCurrency(part.unitCost));
}

export function getLineSell(part: JobPricingPart) {
  return roundCurrency(Math.max(0, part.quantity) * getComputedUnitSell(part));
}

function hasCustomSellPricing(parts: JobPricingPart[]) {
  return parts.some((part) => {
    const unitCost = normalizeCurrency(part.unitCost);
    const unitSell = getComputedUnitSell(part);
    const markupPercent = normalizePercent(part.markupPercent);

    return Math.abs(unitSell - unitCost) > 0.009 || markupPercent > 0.009;
  });
}

export function calculateJobTotals(parts: JobPricingPart[], invoice?: JobInvoiceFields) {
  const totalCost = roundCurrency(parts.reduce((sum, part) => sum + getLineCost(part), 0));
  const savedLineSell = roundCurrency(parts.reduce((sum, part) => sum + getLineSell(part), 0));
  const legacyBillingTotal = normalizeCurrency(invoice?.billingTotal);
  const useLegacyBillingTotal = parts.length > 0 && legacyBillingTotal > 0 && !hasCustomSellPricing(parts);
  const totalSell = roundCurrency(
    useLegacyBillingTotal ? legacyBillingTotal : parts.length > 0 ? savedLineSell : legacyBillingTotal
  );

  return {
    partsCount: parts.length,
    totalCost,
    totalSell,
    subtotal: totalSell,
    margin: roundCurrency(totalSell - totalCost),
    useLegacyBillingTotal,
  };
}

export function canEditJobParts(status: JobStatus | string) {
  const normalizedStatus = normalizeJobStatus(status);

  return normalizedStatus === "OPEN" || normalizedStatus === "COMPLETED";
}

export function canTransitionJobStatus(currentStatus: JobStatus | string, nextStatus: JobStatus | string) {
  const normalizedCurrentStatus = normalizeJobStatus(currentStatus);
  const normalizedNextStatus = normalizeJobStatus(nextStatus);

  if (normalizedCurrentStatus === normalizedNextStatus) {
    return true;
  }

  return (
    (normalizedCurrentStatus === "OPEN" && normalizedNextStatus === "COMPLETED") ||
    (normalizedCurrentStatus === "COMPLETED" && (normalizedNextStatus === "OPEN" || normalizedNextStatus === "INVOICED")) ||
    (normalizedCurrentStatus === "INVOICED" && normalizedNextStatus === "COMPLETED")
  );
}

export function getJobStatusTransitionError(currentStatus: JobStatus | string, nextStatus: JobStatus | string) {
  const normalizedCurrentStatus = normalizeJobStatus(currentStatus);
  const normalizedNextStatus = normalizeJobStatus(nextStatus);

  if (canTransitionJobStatus(normalizedCurrentStatus, normalizedNextStatus)) {
    return null;
  }

  if (normalizedCurrentStatus === "OPEN") {
    return "Open jobs can only move to Completed.";
  }

  if (normalizedCurrentStatus === "COMPLETED") {
    return "Completed jobs can move back to Open or forward to Invoiced.";
  }

  return "Invoiced jobs can only move back to Completed.";
}

export function getStatusChangeHistoryLabel(nextStatus: JobStatus | string) {
  switch (normalizeJobStatus(nextStatus)) {
    case "COMPLETED":
      return "Job marked completed";
    case "INVOICED":
      return "Job marked invoiced";
    case "OPEN":
    default:
      return "Job moved back to open";
  }
}

export function getJobDisplayTitle(job: { title?: string | null; description?: string | null; jobNumber: string }) {
  const title = job.title?.trim();
  if (title) {
    return title;
  }

  const description = job.description?.trim();
  if (description) {
    return description;
  }

  return job.jobNumber;
}

export function getInvoiceStatus(job: { status: JobStatus | string; invoiceNumber?: string | null }) {
  if (normalizeJobStatus(job.status) === "INVOICED") {
    return job.invoiceNumber?.trim() ? "INVOICED" : "INVOICED_PENDING_NUMBER";
  }

  return "NOT_INVOICED";
}

export function hasJobInvoiceMetadata(job: {
  status?: JobStatus | string | null;
  invoiceNumber?: string | null;
  invoiceDate?: string | Date | null;
  invoicedByName?: string | null;
}) {
  return Boolean(
    normalizeJobStatus(job.status) === "INVOICED" ||
      job.invoiceNumber?.trim() ||
      job.invoiceDate ||
      job.invoicedByName?.trim()
  );
}

export function buildPricingSnapshot(unitCost: number | null | undefined, markupPercent: number | null | undefined) {
  const normalizedUnitCost = roundCurrency(normalizeCurrency(unitCost));
  const normalizedMarkupPercent = roundCurrency(normalizePercent(markupPercent));

  return {
    unitCost: normalizedUnitCost,
    markupPercent: normalizedMarkupPercent,
    unitSell: roundCurrency(normalizedUnitCost * (1 + normalizedMarkupPercent / 100)),
  };
}