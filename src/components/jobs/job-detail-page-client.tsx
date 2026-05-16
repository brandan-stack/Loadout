"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  CalendarClock,
  ClipboardList,
  FolderCheck,
  PackagePlus,
  PencilLine,
  ReceiptText,
  RotateCcw,
  Trash2,
  UserRound,
  Wrench,
} from "lucide-react";
import { TAB_DATA_CACHE_KEYS, invalidateCachedData, primeCachedData } from "@/lib/client-data-cache";
import { cn } from "@/lib/cn";
import type { SerializedJobDetail, SerializedJobHistoryEntry, SerializedJobPart } from "@/lib/jobs/presenter";
import {
  canEditJobParts,
  getComputedUnitSell,
  getJobStatusLabel,
  hasJobInvoiceMetadata,
  normalizeJobStatus,
} from "@/lib/jobs/workflow";
import { PageSection, PageShell } from "@/components/layout/page-shell";
import { SidePanel } from "@/components/panels/SidePanel";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ConfirmationDialog } from "@/components/ui/ConfirmationDialog";
import { PageHeader } from "@/components/ui/PageHeader";

type InventoryOption = {
  id: string;
  name: string;
  manufacturer?: string;
  partNumber?: string;
  modelNumber?: string;
  description?: string;
  quantityOnHand: number;
  unitOfMeasure: string;
  lastUnitCost?: number;
  marginPercent?: number;
};

type JobDraft = {
  jobNumber: string;
  title: string;
  description: string;
  customer: string;
  siteName: string;
  date: string;
  notes: string;
  customerSummary: string;
  billingTotal: string;
};

type InvoiceDraft = {
  invoiceNumber: string;
  invoiceDate: string;
};

type PartDraft = {
  itemId: string;
  quantity: string;
  unitCost: string;
  markupPercent: string;
  notes: string;
};

type PendingDialog =
  | {
      kind: "delete-invoice" | "delete-job";
    }
  | {
      kind: "delete-part";
      part: SerializedJobPart;
    }
  | null;

interface JobDetailPageClientProps {
  canManageJob: boolean;
  canCloseJobs: boolean;
  canInvoiceJobs: boolean;
  canDeleteJobs: boolean;
  canEditBillingTotal: boolean;
  showBaseCosts: boolean;
  showMargin: boolean;
  showTotal: boolean;
  jobId: string;
  initialJob: SerializedJobDetail | null;
  initialItems: InventoryOption[];
  initialJobError: string | null;
}

const fieldClassName =
  "w-full rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-3 text-sm text-white outline-none placeholder:text-slate-500";

function buildJobDraft(job: SerializedJobDetail | null): JobDraft {
  return {
    jobNumber: job?.jobNumber ?? "",
    title: job?.title ?? "",
    description: job?.description ?? "",
    customer: job?.customer ?? "",
    siteName: job?.siteName ?? "",
    date: job?.date ? job.date.slice(0, 10) : new Date().toISOString().slice(0, 10),
    notes: job?.notes ?? "",
    customerSummary: job?.customerSummary ?? "",
    billingTotal: typeof job?.billingTotal === "number" ? String(job.billingTotal) : "",
  };
}

function buildInvoiceDraft(job: SerializedJobDetail | null): InvoiceDraft {
  return {
    invoiceNumber: job?.invoiceNumber ?? "",
    invoiceDate: job?.invoiceDate ? job.invoiceDate.slice(0, 10) : new Date().toISOString().slice(0, 10),
  };
}

function buildPartDraft(part?: SerializedJobPart | null): PartDraft {
  return {
    itemId: part?.itemId ?? "",
    quantity: part ? String(part.quantity) : "1",
    unitCost: typeof part?.unitCost === "number" ? String(part.unitCost) : "",
    markupPercent: typeof part?.markupPercent === "number" ? String(part.markupPercent) : "0",
    notes: part?.notes ?? "",
  };
}

function parseOptionalDecimal(value: string) {
  const trimmed = value.trim();
  if (!trimmed) {
    return undefined;
  }

  const parsed = Number.parseFloat(trimmed);
  if (!Number.isFinite(parsed) || parsed < 0) {
    return null;
  }

  return parsed;
}

function parseOptionalInteger(value: string) {
  const trimmed = value.trim();
  if (!trimmed) {
    return undefined;
  }

  const parsed = Number.parseInt(trimmed, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return null;
  }

  return parsed;
}

async function readError(response: Response, fallback: string) {
  const payload = await response.json().catch(() => null);
  const message = payload && typeof payload === "object" && "error" in payload ? payload.error : null;
  return typeof message === "string" ? message : fallback;
}

export function JobDetailPageClient({
  canManageJob,
  canCloseJobs,
  canInvoiceJobs,
  canDeleteJobs,
  canEditBillingTotal,
  showBaseCosts,
  showMargin,
  showTotal,
  jobId,
  initialJob,
  initialItems,
  initialJobError,
}: JobDetailPageClientProps) {
  const router = useRouter();
  const [job, setJob] = useState<SerializedJobDetail | null>(initialJob);
  const [jobError, setJobError] = useState(initialJobError ?? "");
  const [bannerError, setBannerError] = useState("");
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [editJobOpen, setEditJobOpen] = useState(false);
  const [addPartOpen, setAddPartOpen] = useState(false);
  const [invoicePanelOpen, setInvoicePanelOpen] = useState(false);
  const [editingPartId, setEditingPartId] = useState<string | null>(null);
  const [dialogState, setDialogState] = useState<PendingDialog>(null);
  const [jobDraft, setJobDraft] = useState<JobDraft>(() => buildJobDraft(initialJob));
  const [invoiceDraft, setInvoiceDraft] = useState<InvoiceDraft>(() => buildInvoiceDraft(initialJob));
  const [addPartDraft, setAddPartDraft] = useState<PartDraft>(() => buildPartDraft());
  const [editPartDraft, setEditPartDraft] = useState<PartDraft>(() => buildPartDraft());

  useEffect(() => {
    setJob(initialJob);
    setJobError(initialJobError ?? "");
  }, [initialJob, initialJobError]);

  useEffect(() => {
    setJobDraft(buildJobDraft(job));
    setInvoiceDraft(buildInvoiceDraft(job));
  }, [job]);

  const editingPart = useMemo(() => job?.parts.find((part) => part.id === editingPartId) ?? null, [editingPartId, job]);
  const addPartItem = useMemo(() => initialItems.find((item) => item.id === addPartDraft.itemId) ?? null, [addPartDraft.itemId, initialItems]);
  const normalizedStatus = normalizeJobStatus(job?.status);
  const canEditDetails = Boolean(job && canManageJob && normalizedStatus !== "INVOICED");
  const canModifyParts = Boolean(job && canManageJob && canEditJobParts(job.status));
  const hasInvoice = Boolean(job && hasJobInvoiceMetadata(job));

  useEffect(() => {
    if (editingPart) {
      setEditPartDraft(buildPartDraft(editingPart));
    }
  }, [editingPart]);

  useEffect(() => {
    if (job) {
      primeCachedData(TAB_DATA_CACHE_KEYS.jobs, [job]);
    }
  }, [job]);

  useEffect(() => {
    if (!canModifyParts || typeof window === "undefined" || window.location.hash !== "#parts") {
      return;
    }

    setAddPartOpen(true);
    window.history.replaceState(null, "", `${window.location.pathname}${window.location.search}`);
  }, [canModifyParts]);

  async function withBusy<T>(key: string, action: () => Promise<T>) {
    setBusyAction(key);
    setBannerError("");
    try {
      return await action();
    } finally {
      setBusyAction(null);
    }
  }

  async function refreshJob() {
    const response = await fetch(`/api/jobs/${jobId}`, { cache: "no-store" });
    if (!response.ok) {
      throw new Error(await readError(response, "Failed to refresh job"));
    }

    const payload = (await response.json()) as SerializedJobDetail;
    setJob(payload);
    setJobError("");
    invalidateCachedData(TAB_DATA_CACHE_KEYS.jobs);
    return payload;
  }

  async function patchJob(body: Record<string, unknown>) {
    const response = await fetch(`/api/jobs/${jobId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      throw new Error(await readError(response, "Failed to update job"));
    }

    const payload = (await response.json()) as SerializedJobDetail;
    setJob(payload);
    invalidateCachedData(TAB_DATA_CACHE_KEYS.jobs);
    return payload;
  }

  async function handleSaveJob() {
    const trimmedJobNumber = jobDraft.jobNumber.trim();
    if (!trimmedJobNumber) {
      setBannerError("Job number is required.");
      return;
    }

    const trimmedCustomer = jobDraft.customer.trim();
    if (!trimmedCustomer && job?.customer.trim()) {
      setBannerError("Customer is required.");
      return;
    }

    const billingTotal = parseOptionalDecimal(jobDraft.billingTotal);
    if (billingTotal === null) {
      setBannerError("Billing total must be a valid positive number.");
      return;
    }

    try {
      await withBusy("save-job", async () => {
        await patchJob({
          jobNumber: trimmedJobNumber,
          title: jobDraft.title,
          description: jobDraft.description,
          customer: trimmedCustomer || undefined,
          siteName: jobDraft.siteName,
          date: jobDraft.date || undefined,
          notes: jobDraft.notes,
          customerSummary: jobDraft.customerSummary,
          billingTotal: canEditBillingTotal ? billingTotal ?? null : undefined,
        });
        setEditJobOpen(false);
      });
    } catch (error) {
      setBannerError(error instanceof Error ? error.message : "Failed to save job");
    }
  }

  async function handleStatusChange(nextStatus: "OPEN" | "COMPLETED") {
    try {
      await withBusy(`status-${nextStatus.toLowerCase()}`, async () => {
        await patchJob({ status: nextStatus });
      });
    } catch (error) {
      setBannerError(error instanceof Error ? error.message : "Failed to update job status");
    }
  }

  async function handleInvoiceJob() {
    const invoiceDate = invoiceDraft.invoiceDate.trim();

    try {
      await withBusy("status-invoiced", async () => {
        await patchJob({
          status: "INVOICED",
          invoiceNumber: invoiceDraft.invoiceNumber,
          invoiceDate: invoiceDate || undefined,
        });
        setInvoicePanelOpen(false);
      });
    } catch (error) {
      setBannerError(error instanceof Error ? error.message : "Failed to mark job invoiced");
    }
  }

  async function handleDeleteInvoice() {
    try {
      await withBusy("delete-invoice", async () => {
        const response = await fetch(`/api/jobs/${jobId}/invoice`, { method: "DELETE" });
        if (!response.ok) {
          throw new Error(await readError(response, "Failed to delete invoice"));
        }

        const payload = (await response.json()) as SerializedJobDetail;
        setJob(payload);
        invalidateCachedData(TAB_DATA_CACHE_KEYS.jobs);
        setDialogState(null);
      });
    } catch (error) {
      setBannerError(error instanceof Error ? error.message : "Failed to delete invoice");
    }
  }

  async function handleDeleteJob() {
    try {
      await withBusy("delete-job", async () => {
        const response = await fetch(`/api/jobs/${jobId}`, { method: "DELETE" });
        if (!response.ok) {
          throw new Error(await readError(response, "Failed to delete job"));
        }

        invalidateCachedData(TAB_DATA_CACHE_KEYS.jobs);
        router.push("/jobs");
        router.refresh();
      });
    } catch (error) {
      setBannerError(error instanceof Error ? error.message : "Failed to delete job");
    }
  }

  function handleAddPartItemChange(itemId: string) {
    const item = initialItems.find((entry) => entry.id === itemId);
    setAddPartDraft((current) => ({
      ...current,
      itemId,
      unitCost: item?.lastUnitCost !== undefined ? String(item.lastUnitCost) : "",
      markupPercent: String(item?.marginPercent ?? 0),
    }));
  }

  async function handleAddPart() {
    const quantity = parseOptionalInteger(addPartDraft.quantity);
    const unitCost = parseOptionalDecimal(addPartDraft.unitCost);
    const markupPercent = parseOptionalDecimal(addPartDraft.markupPercent);

    if (!addPartDraft.itemId) {
      setBannerError("Select an inventory item before adding a part.");
      return;
    }

    if (quantity === null || quantity === undefined) {
      setBannerError("Quantity must be a whole number greater than zero.");
      return;
    }

    if (unitCost === null) {
      setBannerError("Unit cost must be a valid positive number.");
      return;
    }

    if (markupPercent === null) {
      setBannerError("Markup must be a valid positive number.");
      return;
    }

    try {
      await withBusy("add-part", async () => {
        const response = await fetch(`/api/jobs/${jobId}/parts`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            itemId: addPartDraft.itemId,
            quantity,
            unitCost,
            markupPercent,
            notes: addPartDraft.notes.trim() || undefined,
          }),
        });

        if (!response.ok) {
          throw new Error(await readError(response, "Failed to add part"));
        }

        await refreshJob();
        setAddPartDraft(buildPartDraft());
        setAddPartOpen(false);
      });
    } catch (error) {
      setBannerError(error instanceof Error ? error.message : "Failed to add part");
    }
  }

  async function handleSavePart() {
    if (!editingPart) {
      return;
    }

    const quantity = parseOptionalInteger(editPartDraft.quantity);
    const unitCost = parseOptionalDecimal(editPartDraft.unitCost);
    const markupPercent = parseOptionalDecimal(editPartDraft.markupPercent);

    if (quantity === null || quantity === undefined) {
      setBannerError("Quantity must be a whole number greater than zero.");
      return;
    }

    if (unitCost === null) {
      setBannerError("Unit cost must be a valid positive number.");
      return;
    }

    if (markupPercent === null) {
      setBannerError("Markup must be a valid positive number.");
      return;
    }

    try {
      await withBusy(`save-part-${editingPart.id}`, async () => {
        const response = await fetch(`/api/jobs/${jobId}/parts/${editingPart.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            quantity,
            unitCost,
            markupPercent,
            notes: editPartDraft.notes.trim() || null,
          }),
        });

        if (!response.ok) {
          throw new Error(await readError(response, "Failed to update part"));
        }

        await refreshJob();
        setEditingPartId(null);
      });
    } catch (error) {
      setBannerError(error instanceof Error ? error.message : "Failed to update part");
    }
  }

  async function handleDeletePart(part: SerializedJobPart) {
    try {
      await withBusy(`delete-part-${part.id}`, async () => {
        const response = await fetch(`/api/jobs/${jobId}/parts/${part.id}`, { method: "DELETE" });
        if (!response.ok) {
          throw new Error(await readError(response, "Failed to remove part"));
        }

        await refreshJob();
        setDialogState(null);
      });
    } catch (error) {
      setBannerError(error instanceof Error ? error.message : "Failed to remove part");
    }
  }

  function scrollToBillingSummary() {
    document.getElementById("billing-summary")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  const statusTone = normalizedStatus === "OPEN" ? "orange" : normalizedStatus === "COMPLETED" ? "green" : "blue";
  const canMarkCompleted = normalizedStatus === "OPEN" && canCloseJobs;
  const canMoveBackToOpen = normalizedStatus === "COMPLETED" && canCloseJobs;
  const canMarkInvoiced = normalizedStatus === "COMPLETED" && canInvoiceJobs;
  const canDeleteInvoice = canInvoiceJobs && hasInvoice;

  return (
    <PageShell contentClassName="space-y-8">
      <PageHeader
        eyebrow={<Badge tone="blue">Job Workspace</Badge>}
        title={job?.displayTitle ?? "Job"}
        description="Track the full service lifecycle, preserve saved parts and pricing, and keep status changes explicit from open through completed and invoiced."
        actions={
          <>
            <Button variant="secondary" href="/jobs">
              <ArrowLeft className="h-4 w-4" />
              Back to Jobs
            </Button>
            {canModifyParts ? (
              <Button variant="secondary" onClick={() => setAddPartOpen(true)}>
                <PackagePlus className="h-4 w-4" />
                Add Part
              </Button>
            ) : null}
            {canEditDetails ? (
              <Button variant="secondary" onClick={() => setEditJobOpen(true)}>
                <PencilLine className="h-4 w-4" />
                Edit Job
              </Button>
            ) : null}
            {canMarkCompleted ? (
              <Button variant="primary" onClick={() => void handleStatusChange("COMPLETED")} disabled={busyAction === "status-completed"}>
                <FolderCheck className="h-4 w-4" />
                Mark Completed
              </Button>
            ) : null}
            {canMarkInvoiced ? (
              <Button variant="primary" onClick={() => setInvoicePanelOpen(true)} disabled={busyAction === "status-invoiced"}>
                <ReceiptText className="h-4 w-4" />
                Mark Invoiced
              </Button>
            ) : null}
          </>
        }
      />

      {jobError && !job ? (
        <Card className="border-rose-400/20 bg-rose-500/[0.08] text-rose-100">{jobError}</Card>
      ) : null}

      {bannerError ? <Card className="border-rose-400/20 bg-rose-500/[0.08] text-rose-100">{bannerError}</Card> : null}

      {job ? (
        <>
          <PageSection>
            <Card className="overflow-hidden border-white/12 p-0">
              <div className="grid gap-0 xl:grid-cols-[minmax(0,1.35fr)_minmax(22rem,1fr)]">
                <div className="border-b border-white/10 bg-[radial-gradient(circle_at_top_left,rgba(56,189,248,0.16),transparent_32%),linear-gradient(180deg,rgba(9,14,24,0.96),rgba(9,14,24,0.84))] px-5 py-6 sm:px-6 sm:py-7 xl:border-b-0 xl:border-r">
                  <div className="flex flex-wrap items-center gap-3">
                    <Badge tone={statusTone}>{getJobStatusLabel(job.status)}</Badge>
                    <Badge tone="slate">{job.jobNumber}</Badge>
                    {job.needsPartsAttention ? <Badge tone="orange">Needs parts attention</Badge> : null}
                    {job.invoiceStatus === "INVOICED_PENDING_NUMBER" ? <Badge tone="red">Invoice number missing</Badge> : null}
                  </div>
                  <div className="mt-5 space-y-3">
                    <h2 className="text-3xl font-semibold tracking-[-0.05em] text-white">{job.displayTitle}</h2>
                    <p className="text-sm leading-6 text-slate-300/78 sm:text-base">{job.description || "No extended description recorded for this job yet."}</p>
                    <div className="flex flex-wrap gap-3 pt-2">
                      <SummaryChip label="Customer" value={job.customer || "No customer recorded"} icon={UserRound} />
                      <SummaryChip label="Technician" value={job.technician.name} icon={Wrench} />
                      <SummaryChip label="Service date" value={formatDate(job.date)} icon={CalendarClock} />
                    </div>
                  </div>
                </div>

                <div className="grid gap-3 px-5 py-6 sm:grid-cols-2 sm:px-6 sm:py-7">
                  <SummaryMetric label="Latest activity" value={formatDateTime(job.latestActivityAt)} />
                  <SummaryMetric label="Created" value={formatDateTime(job.createdAt)} />
                  <SummaryMetric label="Completed by" value={job.completedByName || (job.completedAt ? "Recorded" : "Not completed")} />
                  <SummaryMetric label="Invoice" value={job.invoiceNumber || (hasInvoice ? "Pending number" : "Not invoiced")} />
                </div>
              </div>
            </Card>
          </PageSection>

          <PageSection>
            <Card className="border-white/12 bg-[radial-gradient(circle_at_top,rgba(20,184,166,0.08),transparent_40%),linear-gradient(180deg,rgba(15,23,42,0.92),rgba(15,23,42,0.76))]">
              <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Status-aware actions</p>
                  <h2 className="mt-3 text-xl font-semibold tracking-[-0.04em] text-white">Keep the workflow obvious at every stage</h2>
                  <p className="mt-2 text-sm leading-6 text-slate-300/76">Status moves only change lifecycle state. Parts, pricing, totals, notes, and history stay attached to the same job record.</p>
                </div>
                <div className="flex flex-wrap gap-3">
                  {canModifyParts ? (
                    <Button variant="secondary" onClick={() => setAddPartOpen(true)}>
                      Add Part
                    </Button>
                  ) : null}
                  {canEditDetails ? (
                    <Button variant="secondary" onClick={() => setEditJobOpen(true)}>
                      Edit Job
                    </Button>
                  ) : null}
                  {canMarkCompleted ? (
                    <Button variant="primary" onClick={() => void handleStatusChange("COMPLETED")} disabled={busyAction === "status-completed"}>
                      Mark Completed
                    </Button>
                  ) : null}
                  {canMoveBackToOpen ? (
                    <Button variant="secondary" onClick={() => void handleStatusChange("OPEN")} disabled={busyAction === "status-open"}>
                      <RotateCcw className="h-4 w-4" />
                      Move Back to Open
                    </Button>
                  ) : null}
                  {canMarkInvoiced ? (
                    <Button variant="primary" onClick={() => setInvoicePanelOpen(true)} disabled={busyAction === "status-invoiced"}>
                      Mark Invoiced
                    </Button>
                  ) : null}
                  {hasInvoice ? (
                    <Button variant="secondary" onClick={scrollToBillingSummary}>
                      View Summary
                    </Button>
                  ) : null}
                  {canDeleteInvoice ? (
                    <Button variant="secondary" onClick={() => setDialogState({ kind: "delete-invoice" })}>
                      Delete Invoice
                    </Button>
                  ) : null}
                  {canDeleteJobs ? (
                    <Button variant="ghost" className="text-rose-200 hover:border-rose-400/20 hover:bg-rose-500/10 hover:text-rose-100" onClick={() => setDialogState({ kind: "delete-job" })}>
                      Delete Job
                    </Button>
                  ) : null}
                </div>
              </div>
            </Card>
          </PageSection>

          <PageSection className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <WorkflowMetricCard label="Parts logged" value={String(job.parts.length)} detail="Saved part lines attached to this job" />
            <WorkflowMetricCard label="Subtotal cost" value={showBaseCosts ? formatCurrency(job.totals.totalCost) : "Hidden"} detail="Saved cost carried across workflow stages" />
            <WorkflowMetricCard label="Invoice total" value={showTotal ? formatCurrency(job.totals.totalSell) : "Hidden"} detail="Final sell total from saved job pricing" />
            <WorkflowMetricCard label="Margin" value={showMargin ? formatCurrency(job.totals.margin) : "Hidden"} detail="Margin across all current part lines" />
          </PageSection>

          <PageSection className="grid gap-6 xl:grid-cols-[minmax(0,1.45fr)_minmax(20rem,0.95fr)]">
            <div className="space-y-6">
              <Card className="space-y-5 border-white/12">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Parts</p>
                    <h2 className="mt-3 text-xl font-semibold tracking-[-0.04em] text-white">Parts and pricing stay attached to the job</h2>
                    <p className="mt-2 text-sm leading-6 text-slate-300/76">Every quantity, unit cost, markup, sell price, line total, and part note is read from saved job data and carried through open, completed, and invoiced states.</p>
                  </div>
                  {canModifyParts ? (
                    <Button variant="secondary" onClick={() => setAddPartOpen(true)}>
                      <PackagePlus className="h-4 w-4" />
                      Add Part
                    </Button>
                  ) : null}
                </div>

                {job.parts.length > 0 ? (
                  <div className="space-y-4">
                    {job.parts.map((part) => (
                      <PartCard
                        key={part.id}
                        part={part}
                        canModify={canModifyParts}
                        showBaseCosts={showBaseCosts}
                        showMargin={showMargin}
                        showTotal={showTotal}
                        busy={busyAction === `save-part-${part.id}` || busyAction === `delete-part-${part.id}`}
                        onEdit={() => setEditingPartId(part.id)}
                        onDelete={() => setDialogState({ kind: "delete-part", part })}
                      />
                    ))}
                  </div>
                ) : (
                  <EmptyStateCard
                    title="No parts logged yet"
                    description="This job can still move through the workflow, but the parts section is ready for fast stock-driven additions as soon as work starts."
                    action={
                      canModifyParts ? (
                        <Button variant="primary" onClick={() => setAddPartOpen(true)}>
                          Add first part
                        </Button>
                      ) : null
                    }
                  />
                )}
              </Card>

              <Card className="space-y-5 border-white/12">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">History</p>
                  <h2 className="mt-3 text-xl font-semibold tracking-[-0.04em] text-white">Activity timeline</h2>
                </div>
                {job.history.length > 0 ? (
                  <div className="space-y-4">
                    {job.history.map((entry) => (
                      <HistoryRow key={entry.id} entry={entry} />
                    ))}
                  </div>
                ) : (
                  <EmptyStateCard title="No history recorded yet" description="This job has not recorded workflow activity yet." />
                )}
              </Card>
            </div>

            <div className="space-y-6">
              <div id="billing-summary">
                <Card className="space-y-5 border-white/12">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Totals</p>
                    <h2 className="mt-3 text-xl font-semibold tracking-[-0.04em] text-white">Saved billing snapshot</h2>
                  </div>
                  <div className="space-y-3">
                    <DetailRow label="Subtotal cost" value={showBaseCosts ? formatCurrency(job.totals.totalCost) : "Hidden"} />
                    <DetailRow label="Subtotal sell" value={showTotal ? formatCurrency(job.totals.subtotal) : "Hidden"} />
                    <DetailRow label="Margin" value={showMargin ? formatCurrency(job.totals.margin) : "Hidden"} />
                    <DetailRow label="Invoice total" value={showTotal ? formatCurrency(job.totals.totalSell) : "Hidden"} />
                    <DetailRow label="Billing total override" value={showTotal ? formatCurrency(job.billingTotal) : "Hidden"} />
                  </div>
                  {job.totals.useLegacyBillingTotal ? (
                    <div className="rounded-[1.2rem] border border-sky-400/20 bg-sky-500/[0.08] p-4 text-sm leading-6 text-sky-100">
                      This job is currently using its saved billing total as the final sell total because the parts do not carry custom sell pricing yet.
                    </div>
                  ) : null}
                </Card>
              </div>

              <Card className="space-y-5 border-white/12">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Notes</p>
                  <h2 className="mt-3 text-xl font-semibold tracking-[-0.04em] text-white">Internal and customer-facing notes</h2>
                </div>
                <NoteBlock label="Customer summary" value={job.customerSummary || "No customer summary recorded yet."} />
                <NoteBlock label="Internal notes" value={job.notes || "No internal notes recorded yet."} />
                <DetailRow label="Site / location" value={job.siteName || "No site recorded"} />
                <DetailRow label="Invoice number" value={job.invoiceNumber || (hasInvoice ? "Pending number" : "Not invoiced")} />
                <DetailRow label="Invoice date" value={formatDate(job.invoiceDate)} />
                <DetailRow label="Invoiced by" value={job.invoicedByName || "Not invoiced"} />
              </Card>
            </div>
          </PageSection>
        </>
      ) : null}

      <SidePanel
        open={editJobOpen}
        onClose={() => setEditJobOpen(false)}
        title={job ? `Edit ${job.jobNumber}` : "Edit job"}
        description="Update the job record without breaking the lifecycle. Saved parts, totals, and history stay connected to this job."
        footer={
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button className="flex-1" variant="primary" onClick={() => void handleSaveJob()} disabled={busyAction === "save-job"}>
              {busyAction === "save-job" ? "Saving..." : "Save job"}
            </Button>
            <Button className="flex-1" variant="secondary" onClick={() => setEditJobOpen(false)}>
              Cancel
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          <Field label="Job number">
            <input value={jobDraft.jobNumber} onChange={(event) => setJobDraft((current) => ({ ...current, jobNumber: event.target.value }))} className={fieldClassName} />
          </Field>
          <Field label="Work order title">
            <input value={jobDraft.title} onChange={(event) => setJobDraft((current) => ({ ...current, title: event.target.value }))} className={fieldClassName} placeholder="Optional title" />
          </Field>
          <Field label="Description">
            <textarea value={jobDraft.description} onChange={(event) => setJobDraft((current) => ({ ...current, description: event.target.value }))} rows={4} className={fieldClassName} placeholder="Work description or service summary" />
          </Field>
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Customer">
              <input value={jobDraft.customer} onChange={(event) => setJobDraft((current) => ({ ...current, customer: event.target.value }))} className={fieldClassName} placeholder="Customer name" />
            </Field>
            <Field label="Site / location">
              <input value={jobDraft.siteName} onChange={(event) => setJobDraft((current) => ({ ...current, siteName: event.target.value }))} className={fieldClassName} placeholder="Optional site" />
            </Field>
          </div>
          <Field label="Service date">
            <input type="date" value={jobDraft.date} onChange={(event) => setJobDraft((current) => ({ ...current, date: event.target.value }))} className={fieldClassName} />
          </Field>
          {canEditBillingTotal ? (
            <Field label="Billing total">
              <input value={jobDraft.billingTotal} onChange={(event) => setJobDraft((current) => ({ ...current, billingTotal: event.target.value }))} className={fieldClassName} placeholder="Optional saved billing total" />
            </Field>
          ) : null}
          <Field label="Customer summary">
            <textarea value={jobDraft.customerSummary} onChange={(event) => setJobDraft((current) => ({ ...current, customerSummary: event.target.value }))} rows={4} className={fieldClassName} placeholder="What the customer should see or hear" />
          </Field>
          <Field label="Internal notes">
            <textarea value={jobDraft.notes} onChange={(event) => setJobDraft((current) => ({ ...current, notes: event.target.value }))} rows={5} className={fieldClassName} placeholder="Internal technician notes" />
          </Field>
        </div>
      </SidePanel>

      <SidePanel
        open={addPartOpen}
        onClose={() => setAddPartOpen(false)}
        title="Add part"
        description="Log a part against this job and preserve its quantity, cost, markup, sell price, notes, and stock movement from the saved record."
        footer={
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button className="flex-1" variant="primary" onClick={() => void handleAddPart()} disabled={busyAction === "add-part"}>
              {busyAction === "add-part" ? "Adding..." : "Add part"}
            </Button>
            <Button className="flex-1" variant="secondary" onClick={() => setAddPartOpen(false)}>
              Cancel
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          <Field label="Inventory item">
            <select value={addPartDraft.itemId} onChange={(event) => handleAddPartItemChange(event.target.value)} className={fieldClassName}>
              <option value="">Select an item</option>
              {initialItems.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name} {item.partNumber ? `(${item.partNumber})` : ""}
                </option>
              ))}
            </select>
          </Field>
          {addPartItem ? (
            <Card className="space-y-3 bg-white/[0.03]">
              <DetailRow label="Part number" value={addPartItem.partNumber || "No part number"} />
              <DetailRow label="Stock on hand" value={`${addPartItem.quantityOnHand} ${addPartItem.unitOfMeasure}`} />
              <DetailRow label="Default unit cost" value={formatCurrency(addPartItem.lastUnitCost)} />
              <DetailRow label="Default markup" value={formatPercent(addPartItem.marginPercent)} />
            </Card>
          ) : null}
          <div className="grid gap-4 md:grid-cols-3">
            <Field label="Quantity">
              <input value={addPartDraft.quantity} onChange={(event) => setAddPartDraft((current) => ({ ...current, quantity: event.target.value }))} className={fieldClassName} />
            </Field>
            <Field label="Unit cost">
              <input value={addPartDraft.unitCost} onChange={(event) => setAddPartDraft((current) => ({ ...current, unitCost: event.target.value }))} className={fieldClassName} />
            </Field>
            <Field label="Markup %">
              <input value={addPartDraft.markupPercent} onChange={(event) => setAddPartDraft((current) => ({ ...current, markupPercent: event.target.value }))} className={fieldClassName} />
            </Field>
          </div>
          <Field label="Part notes">
            <textarea value={addPartDraft.notes} onChange={(event) => setAddPartDraft((current) => ({ ...current, notes: event.target.value }))} rows={4} className={fieldClassName} placeholder="Optional line notes" />
          </Field>
          <Card className="space-y-3 bg-white/[0.03]">
            <DetailRow label="Estimated unit sell" value={formatCurrency(getComputedUnitSell({ unitCost: parseOptionalDecimal(addPartDraft.unitCost) ?? 0, markupPercent: parseOptionalDecimal(addPartDraft.markupPercent) ?? 0 }))} />
          </Card>
        </div>
      </SidePanel>

      <SidePanel
        open={editingPart !== null}
        onClose={() => setEditingPartId(null)}
        title={editingPart ? `Edit ${editingPart.name}` : "Edit part"}
        description="Update saved quantity, pricing, and notes without breaking the job totals or lifecycle."
        footer={
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button className="flex-1" variant="primary" onClick={() => void handleSavePart()} disabled={!editingPart || busyAction === `save-part-${editingPart?.id ?? ""}`}>
              {editingPart && busyAction === `save-part-${editingPart.id}` ? "Saving..." : "Save part"}
            </Button>
            <Button className="flex-1" variant="secondary" onClick={() => setEditingPartId(null)}>
              Cancel
            </Button>
          </div>
        }
      >
        {editingPart ? (
          <div className="space-y-4">
            <Card className="space-y-3 bg-white/[0.03]">
              <DetailRow label="Part" value={editingPart.name} />
              <DetailRow label="Part number" value={editingPart.partNumber || "No part number"} />
              <DetailRow label="Stock on hand" value={`${editingPart.inventoryQuantityOnHand ?? 0} ${editingPart.unitOfMeasure}`} />
            </Card>
            <div className="grid gap-4 md:grid-cols-3">
              <Field label="Quantity">
                <input value={editPartDraft.quantity} onChange={(event) => setEditPartDraft((current) => ({ ...current, quantity: event.target.value }))} className={fieldClassName} />
              </Field>
              <Field label="Unit cost">
                <input value={editPartDraft.unitCost} onChange={(event) => setEditPartDraft((current) => ({ ...current, unitCost: event.target.value }))} className={fieldClassName} />
              </Field>
              <Field label="Markup %">
                <input value={editPartDraft.markupPercent} onChange={(event) => setEditPartDraft((current) => ({ ...current, markupPercent: event.target.value }))} className={fieldClassName} />
              </Field>
            </div>
            <Field label="Line notes">
              <textarea value={editPartDraft.notes} onChange={(event) => setEditPartDraft((current) => ({ ...current, notes: event.target.value }))} rows={4} className={fieldClassName} placeholder="Optional line notes" />
            </Field>
            <Card className="space-y-3 bg-white/[0.03]">
              <DetailRow label="Estimated unit sell" value={formatCurrency(getComputedUnitSell({ unitCost: parseOptionalDecimal(editPartDraft.unitCost) ?? 0, markupPercent: parseOptionalDecimal(editPartDraft.markupPercent) ?? 0 }))} />
            </Card>
          </div>
        ) : null}
      </SidePanel>

      <SidePanel
        open={invoicePanelOpen}
        onClose={() => setInvoicePanelOpen(false)}
        title="Mark job invoiced"
        description="Save invoice metadata and move the job from Completed into Invoiced without changing its parts, pricing, totals, or notes."
        footer={
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button className="flex-1" variant="primary" onClick={() => void handleInvoiceJob()} disabled={busyAction === "status-invoiced"}>
              {busyAction === "status-invoiced" ? "Saving..." : "Mark invoiced"}
            </Button>
            <Button className="flex-1" variant="secondary" onClick={() => setInvoicePanelOpen(false)}>
              Cancel
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          <Field label="Invoice number">
            <input value={invoiceDraft.invoiceNumber} onChange={(event) => setInvoiceDraft((current) => ({ ...current, invoiceNumber: event.target.value }))} className={fieldClassName} placeholder="Optional invoice number" />
          </Field>
          <Field label="Invoice date">
            <input type="date" value={invoiceDraft.invoiceDate} onChange={(event) => setInvoiceDraft((current) => ({ ...current, invoiceDate: event.target.value }))} className={fieldClassName} />
          </Field>
          <Card className="space-y-3 bg-white/[0.03]">
            <DetailRow label="Current status" value={getJobStatusLabel(job?.status)} />
            <DetailRow label="Invoice total" value={showTotal ? formatCurrency(job?.totals.totalSell) : "Hidden"} />
          </Card>
        </div>
      </SidePanel>

      <ConfirmationDialog
        open={dialogState?.kind === "delete-invoice"}
        title="Delete invoice?"
        description="This will remove invoice status and return the job to Completed. Job details, parts, and pricing will be kept."
        confirmLabel="Delete Invoice"
        busy={busyAction === "delete-invoice"}
        onClose={() => setDialogState(null)}
        onConfirm={() => {
          void handleDeleteInvoice();
        }}
      />

      <ConfirmationDialog
        open={dialogState?.kind === "delete-job"}
        title="Delete job?"
        description="This permanently removes the whole job and all related job data. Parts, pricing snapshots, notes, and history attached to the job will be removed."
        confirmLabel="Delete Job"
        busy={busyAction === "delete-job"}
        onClose={() => setDialogState(null)}
        onConfirm={() => {
          void handleDeleteJob();
        }}
      />

      <ConfirmationDialog
        open={dialogState?.kind === "delete-part"}
        title="Remove part?"
        description="This removes the part line from the job, restores its stock, and updates the saved totals and history."
        confirmLabel="Remove Part"
        busy={dialogState?.kind === "delete-part" ? busyAction === `delete-part-${dialogState.part.id}` : false}
        onClose={() => setDialogState(null)}
        onConfirm={() => {
          if (dialogState?.kind === "delete-part") {
            void handleDeletePart(dialogState.part);
          }
        }}
      />
    </PageShell>
  );
}

function PartCard({
  part,
  canModify,
  showBaseCosts,
  showMargin,
  showTotal,
  busy,
  onEdit,
  onDelete,
}: {
  part: SerializedJobPart;
  canModify: boolean;
  showBaseCosts: boolean;
  showMargin: boolean;
  showTotal: boolean;
  busy: boolean;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const hasStockPressure = typeof part.inventoryQuantityOnHand === "number" && part.inventoryQuantityOnHand <= 0;

  return (
    <div className="rounded-[1.5rem] border border-white/10 bg-white/[0.03] p-4">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-3">
            <h3 className="text-lg font-semibold tracking-[-0.03em] text-white">{part.name}</h3>
            {part.partNumber ? <Badge tone="slate">{part.partNumber}</Badge> : null}
            {hasStockPressure ? <Badge tone="orange">Check stock</Badge> : null}
          </div>
          <p className="mt-2 text-sm leading-6 text-slate-300/72">{part.notes || "No part notes recorded for this line."}</p>
        </div>
        <div className="flex flex-wrap gap-3">
          {canModify ? (
            <Button variant="secondary" onClick={onEdit} disabled={busy}>
              <PencilLine className="h-4 w-4" />
              Edit Part
            </Button>
          ) : null}
          {canModify ? (
            <Button variant="ghost" className="text-rose-200 hover:border-rose-400/20 hover:bg-rose-500/10 hover:text-rose-100" onClick={onDelete} disabled={busy}>
              <Trash2 className="h-4 w-4" />
              Remove
            </Button>
          ) : null}
        </div>
      </div>

      <div className={cn("mt-4 grid gap-3", showBaseCosts || showMargin || showTotal ? "sm:grid-cols-2 xl:grid-cols-5" : "sm:grid-cols-2 xl:grid-cols-3")}>
        <MiniMetric label="Quantity" value={`${part.quantity} ${part.unitOfMeasure}`} />
        <MiniMetric label="Stock on hand" value={typeof part.inventoryQuantityOnHand === "number" ? `${part.inventoryQuantityOnHand} ${part.unitOfMeasure}` : "Unknown"} />
        {showBaseCosts ? <MiniMetric label="Unit cost" value={formatCurrency(part.unitCost)} /> : null}
        {showMargin ? <MiniMetric label="Markup" value={formatPercent(part.markupPercent)} /> : null}
        {showTotal ? <MiniMetric label="Unit sell" value={formatCurrency(part.unitSell)} /> : null}
        {showBaseCosts ? <MiniMetric label="Line cost" value={formatCurrency(part.lineCost)} /> : null}
        {showTotal ? <MiniMetric label="Line total" value={formatCurrency(part.lineTotal)} /> : null}
      </div>

      <div className="mt-4 flex flex-wrap gap-4 text-xs font-medium uppercase tracking-[0.18em] text-slate-500">
        <span>Added {formatDateTime(part.createdAt)}</span>
        <span>Updated {formatDateTime(part.lastActivityAt)}</span>
      </div>
    </div>
  );
}

function HistoryRow({ entry }: { entry: SerializedJobHistoryEntry }) {
  const tone =
    entry.actionType.includes("invoice")
      ? "blue"
      : entry.actionType.includes("status") || entry.actionType.includes("completed")
        ? "green"
        : entry.actionType.includes("part") || entry.actionType.includes("quantity") || entry.actionType.includes("pricing")
          ? "teal"
          : "slate";

  return (
    <div className="flex gap-4 rounded-[1.4rem] border border-white/10 bg-white/[0.03] p-4">
      <span className={cn("mt-1 h-3 w-3 shrink-0 rounded-full", tone === "blue" ? "bg-sky-300" : tone === "green" ? "bg-emerald-300" : tone === "teal" ? "bg-teal-300" : "bg-slate-300")} />
      <div className="min-w-0 flex-1">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm font-semibold text-white">{entry.actionLabel}</p>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">{formatDateTime(entry.createdAt)}</p>
        </div>
        <p className="mt-2 text-sm leading-6 text-slate-300/76">{entry.details || "No additional details recorded."}</p>
        <p className="mt-3 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">{entry.actorName || "System"}</p>
      </div>
    </div>
  );
}

function SummaryChip({ label, value, icon: Icon }: { label: string; value: string; icon: typeof UserRound }) {
  return (
    <div className="inline-flex items-center gap-3 rounded-full border border-white/10 bg-white/[0.05] px-4 py-2 text-sm text-slate-100">
      <Icon className="h-4 w-4 text-slate-300" />
      <span className="text-slate-400">{label}</span>
      <span className="font-medium text-white">{value}</span>
    </div>
  );
}

function SummaryMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[1.35rem] border border-white/10 bg-white/[0.04] p-4">
      <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">{label}</p>
      <p className="mt-3 text-sm font-medium leading-6 text-white">{value}</p>
    </div>
  );
}

function WorkflowMetricCard({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <Card className="border-white/12 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.05),transparent_38%),linear-gradient(180deg,rgba(15,23,42,0.92),rgba(15,23,42,0.76))]">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">{label}</p>
      <p className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-white">{value}</p>
      <p className="mt-3 text-sm leading-6 text-slate-300/72">{detail}</p>
    </Card>
  );
}

function MiniMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[1.2rem] border border-white/10 bg-slate-950/30 p-3">
      <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">{label}</p>
      <p className="mt-2 text-sm font-medium text-white">{value}</p>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">{label}</span>
      <span className="text-sm font-medium text-white">{value}</span>
    </div>
  );
}

function NoteBlock({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[1.2rem] border border-white/10 bg-white/[0.03] p-4">
      <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">{label}</p>
      <p className="mt-3 text-sm leading-6 text-slate-200/84">{value}</p>
    </div>
  );
}

function EmptyStateCard({ title, description, action }: { title: string; description: string; action?: React.ReactNode }) {
  return (
    <div className="rounded-[1.5rem] border border-dashed border-white/12 bg-white/[0.02] p-6 text-center">
      <div className="mx-auto inline-flex h-14 w-14 items-center justify-center rounded-[1.35rem] border border-white/10 bg-white/[0.04] text-slate-200">
        <ClipboardList className="h-5 w-5" />
      </div>
      <h3 className="mt-4 text-lg font-semibold tracking-[-0.03em] text-white">{title}</h3>
      <p className="mt-3 text-sm leading-6 text-slate-300/72">{description}</p>
      {action ? <div className="mt-5 flex justify-center">{action}</div> : null}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-2">
      <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">{label}</span>
      {children}
    </label>
  );
}

function formatCurrency(value?: number) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return "$0.00";
  }

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(value);
}

function formatPercent(value?: number) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return "0%";
  }

  return `${new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 }).format(value)}%`;
}

function formatDate(value?: string) {
  if (!value) {
    return "No date recorded";
  }

  return new Date(value).toLocaleDateString();
}

function formatDateTime(value?: string) {
  if (!value) {
    return "No activity recorded";
  }

  return new Date(value).toLocaleString();
}

export default JobDetailPageClient;
