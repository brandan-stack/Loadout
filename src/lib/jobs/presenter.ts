import {
  calculateJobTotals,
  getComputedUnitSell,
  getInvoiceStatus,
  getJobDisplayTitle,
  normalizeJobStatus,
  getLineCost,
  getLineSell,
} from "@/lib/jobs/workflow";

export type JobVisibility = {
  showBaseCosts: boolean;
  showMargin: boolean;
  showTotal: boolean;
};

export type SerializedJobHistoryEntry = {
  id: string;
  actionType: string;
  actionLabel: string;
  details?: string;
  actorName?: string;
  createdAt?: string;
};

export type SerializedJobPart = {
  id: string;
  itemId?: string;
  name: string;
  partNumber?: string;
  unitOfMeasure: string;
  quantity: number;
  unitCost?: number;
  markupPercent?: number;
  unitSell?: number;
  lineCost?: number;
  lineTotal?: number;
  notes?: string;
  createdAt?: string;
  lastActivityAt?: string;
  inventoryQuantityOnHand?: number;
};

export type SerializedJobTotals = {
  totalCost?: number;
  totalSell?: number;
  subtotal?: number;
  margin?: number;
  useLegacyBillingTotal: boolean;
  partsCount?: number;
};

export type SerializedJobSummary = {
  id: string;
  jobNumber: string;
  title?: string;
  displayTitle: string;
  description?: string;
  customer: string;
  siteName?: string;
  createdByName?: string;
  technician: {
    id?: string;
    name: string;
  };
  status: string;
  billingTotal?: number;
  invoiceStatus: string;
  invoiceNumber?: string;
  invoiceDate?: string;
  date?: string;
  createdAt?: string;
  latestActivityAt?: string;
  partsCount: number;
  totals: SerializedJobTotals;
  needsPartsAttention: boolean;
  customerSummary?: string;
  notes?: string;
};

export type SerializedJobDetail = SerializedJobSummary & {
  completedAt?: string;
  completedByName?: string;
  invoicedByName?: string;
  parts: SerializedJobPart[];
  history: SerializedJobHistoryEntry[];
  totals: SerializedJobTotals;
};

function toIsoString(value: Date | string | null | undefined) {
  if (!value) {
    return undefined;
  }

  if (typeof value === "string") {
    return value;
  }

  return value.toISOString();
}

export function serializeJobHistoryEntry(entry: any): SerializedJobHistoryEntry {
  return {
    id: entry.id,
    actionType: entry.actionType,
    actionLabel: entry.actionLabel,
    details: entry.details ?? undefined,
    actorName: entry.actorName ?? undefined,
    createdAt: toIsoString(entry.createdAt),
  };
}

export function serializeJobPart(part: any, visibility: JobVisibility): SerializedJobPart {
  const unitSell = getComputedUnitSell(part);

  return {
    id: part.id,
    itemId: part.itemId ?? part.item?.id,
    name: part.itemNameSnapshot ?? part.item?.name ?? "Unknown part",
    partNumber: part.itemPartNumberSnapshot ?? part.item?.partNumber ?? undefined,
    unitOfMeasure: part.item?.unitOfMeasure ?? "each",
    quantity: part.quantity,
    unitCost: visibility.showBaseCosts ? part.unitCost ?? 0 : undefined,
    markupPercent: visibility.showMargin ? part.markupPercent ?? 0 : undefined,
    unitSell: visibility.showTotal ? unitSell : undefined,
    lineCost: visibility.showBaseCosts ? getLineCost(part) : undefined,
    lineTotal: visibility.showTotal ? getLineSell(part) : undefined,
    notes: part.notes ?? undefined,
    createdAt: toIsoString(part.createdAt),
    lastActivityAt: toIsoString(part.lastActivityAt),
    inventoryQuantityOnHand: part.item?.quantityOnHand,
  };
}

export function serializeJobSummary(job: any, visibility: JobVisibility): SerializedJobSummary {
  const normalizedStatus = normalizeJobStatus(job.status);
  const totals = calculateJobTotals(job.parts ?? [], job);
  const partsCount = job._count?.parts ?? job.parts?.length ?? 0;

  return {
    id: job.id,
    jobNumber: job.jobNumber,
    title: job.title ?? undefined,
    displayTitle: getJobDisplayTitle(job),
    description: job.description ?? undefined,
    customer: job.customer,
    siteName: job.siteName ?? undefined,
    createdByName: job.createdByName ?? undefined,
    technician: {
      id: job.technician?.id,
      name: job.technician?.name ?? "Unassigned",
    },
    status: normalizedStatus,
    billingTotal: visibility.showTotal ? job.billingTotal ?? undefined : undefined,
    invoiceStatus: getInvoiceStatus({ status: normalizedStatus, invoiceNumber: job.invoiceNumber }),
    invoiceNumber: job.invoiceNumber ?? undefined,
    invoiceDate: toIsoString(job.invoiceDate),
    date: toIsoString(job.date),
    createdAt: toIsoString(job.createdAt),
    latestActivityAt: toIsoString(job.latestActivityAt),
    partsCount,
    totals: {
      totalCost: visibility.showBaseCosts ? totals.totalCost : undefined,
      totalSell: visibility.showTotal ? totals.totalSell : undefined,
      subtotal: visibility.showTotal ? totals.subtotal : undefined,
      margin: visibility.showMargin ? totals.margin : undefined,
      useLegacyBillingTotal: totals.useLegacyBillingTotal,
    },
    needsPartsAttention: Boolean(
      job.parts?.some(
        (part: any) =>
          typeof part.item?.quantityOnHand === "number" &&
          (part.item.quantityOnHand < part.quantity || part.item.quantityOnHand <= (part.item.lowStockRedThreshold ?? -1))
      )
    ),
    customerSummary: job.customerSummary ?? undefined,
    notes: job.notes ?? undefined,
  };
}

export function serializeJobDetail(job: any, visibility: JobVisibility): SerializedJobDetail {
  const summary = serializeJobSummary(job, visibility);
  const parts = (job.parts ?? []).map((part: any) => serializeJobPart(part, visibility));
  const totals = calculateJobTotals(job.parts ?? [], job);

  return {
    ...summary,
    completedAt: toIsoString(job.completedAt),
    completedByName: job.completedByName ?? undefined,
    invoicedByName: job.invoicedByName ?? undefined,
    parts,
    history: (job.history ?? []).map((entry: any) => serializeJobHistoryEntry(entry)),
    totals: {
      totalCost: visibility.showBaseCosts ? totals.totalCost : undefined,
      totalSell: visibility.showTotal ? totals.totalSell : undefined,
      subtotal: visibility.showTotal ? totals.subtotal : undefined,
      margin: visibility.showMargin ? totals.margin : undefined,
      useLegacyBillingTotal: totals.useLegacyBillingTotal,
      partsCount: totals.partsCount,
    },
  };
}