"use client";

import { useDeferredValue, useEffect, useMemo, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import {
  CalendarClock,
  FolderCheck,
  FolderOpen,
  PackagePlus,
  ReceiptText,
  SearchX,
  Sparkles,
  TriangleAlert,
  UserRound,
} from "lucide-react";
import { TAB_DATA_CACHE_KEYS, invalidateCachedData, primeCachedData } from "@/lib/client-data-cache";
import { cn } from "@/lib/cn";
import { canViewFinancialValue, type FinancialVisibilityMode, type PriceVisibilitySnapshot } from "@/lib/financial-visibility";
import {
  buildJobFilterOptions,
  filterJobCollection,
  getVisiblePartsCount,
  summarizeJobCollection,
  type JobActivityFilter,
} from "@/lib/jobs/collection";
import type { SerializedJobSummary } from "@/lib/jobs/presenter";
import { getJobStatusLabel, hasJobInvoiceMetadata, normalizeJobStatus, type JobStatus } from "@/lib/jobs/workflow";
import { PageSection, PageShell } from "@/components/layout/page-shell";
import { SidePanel } from "@/components/panels/SidePanel";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ConfirmationDialog } from "@/components/ui/ConfirmationDialog";
import { PageHeader } from "@/components/ui/PageHeader";
import { SearchBar } from "@/components/ui/SearchBar";

interface JobsPageClientProps {
  canCreateJobs: boolean;
  canEditJobs: boolean;
  canCloseJobs: boolean;
  canInvoiceJobs: boolean;
  initialJobs: SerializedJobSummary[];
  financialVisibilityMode: FinancialVisibilityMode;
  priceVisibility: PriceVisibilitySnapshot;
}

type PendingDialog =
  | {
      kind: "delete-invoice" | "delete-job";
      job: SerializedJobSummary;
    }
  | null;

const ACTIVITY_FILTER_OPTIONS: Array<{ value: JobActivityFilter; label: string }> = [
  { value: "all", label: "All activity" },
  { value: "today", label: "Updated today" },
  { value: "week", label: "Updated this week" },
  { value: "month", label: "Updated this month" },
];

const STATUS_META: Record<
  JobStatus,
  { label: string; description: string; icon: typeof FolderOpen; tone: "orange" | "green" | "blue" }
> = {
  OPEN: {
    label: "Open",
    description: "Live field work that still needs parts, notes, or completion.",
    icon: FolderOpen,
    tone: "orange",
  },
  COMPLETED: {
    label: "Completed",
    description: "Finished work that is ready for billing and final review.",
    icon: FolderCheck,
    tone: "green",
  },
  INVOICED: {
    label: "Invoiced",
    description: "Work that has cleared the field workflow and moved into billing.",
    icon: ReceiptText,
    tone: "blue",
  },
};

export function JobsPageClient({
  canCreateJobs,
  canEditJobs,
  canCloseJobs,
  canInvoiceJobs,
  initialJobs,
  financialVisibilityMode,
  priceVisibility,
}: JobsPageClientProps) {
  const router = useRouter();
  const [jobs, setJobs] = useState<SerializedJobSummary[]>(initialJobs);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<JobStatus>("OPEN");
  const [customerFilter, setCustomerFilter] = useState("ALL");
  const [technicianFilter, setTechnicianFilter] = useState("ALL");
  const [activityFilter, setActivityFilter] = useState<JobActivityFilter>("all");
  const [showCreatePanel, setShowCreatePanel] = useState(false);
  const [showSummaryPanel, setShowSummaryPanel] = useState(false);
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [pendingJobId, setPendingJobId] = useState<string | null>(null);
  const [dialogState, setDialogState] = useState<PendingDialog>(null);
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    jobNumber: "",
    title: "",
    customer: "",
    date: new Date().toISOString().slice(0, 10),
    notes: "",
  });

  const deferredSearch = useDeferredValue(search);

  useEffect(() => {
    setJobs(initialJobs);
  }, [initialJobs]);

  useEffect(() => {
    primeCachedData(TAB_DATA_CACHE_KEYS.jobs, jobs);
  }, [jobs]);

  const canShowBase =
    canViewFinancialValue(financialVisibilityMode, "base", priceVisibility) ||
    canViewFinancialValue(financialVisibilityMode, "job_costing", priceVisibility);
  const canShowMargin = canViewFinancialValue(financialVisibilityMode, "margin", priceVisibility);
  const canShowTotal =
    canViewFinancialValue(financialVisibilityMode, "total", priceVisibility) ||
    canViewFinancialValue(financialVisibilityMode, "job_costing", priceVisibility);

  const summary = useMemo(() => summarizeJobCollection(jobs), [jobs]);
  const filterOptions = useMemo(() => buildJobFilterOptions(jobs), [jobs]);

  const visibleJobs = useMemo(
    () =>
      filterJobCollection(jobs, {
        status: statusFilter,
        query: deferredSearch,
        customer: customerFilter === "ALL" ? undefined : customerFilter,
        technician: technicianFilter === "ALL" ? undefined : technicianFilter,
        activity: activityFilter,
      }),
    [jobs, statusFilter, deferredSearch, customerFilter, technicianFilter, activityFilter]
  );

  const visibleParts = useMemo(() => getVisiblePartsCount(visibleJobs), [visibleJobs]);
  const visibleAttention = useMemo(
    () => visibleJobs.filter((job) => job.needsPartsAttention || job.invoiceStatus === "INVOICED_PENDING_NUMBER").length,
    [visibleJobs]
  );

  useEffect(() => {
    if (visibleJobs.length === 0) {
      setSelectedJobId(null);
      return;
    }

    if (!selectedJobId || !visibleJobs.some((job) => job.id === selectedJobId)) {
      setSelectedJobId(visibleJobs[0].id);
    }
  }, [selectedJobId, visibleJobs]);

  const selectedJob = jobs.find((job) => job.id === selectedJobId) ?? null;
  const activeFolderMeta = STATUS_META[statusFilter];

  async function patchJob(jobId: string, body: Record<string, unknown>) {
    const response = await fetch(`/api/jobs/${jobId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const payload = await response.json().catch(() => null);
    if (!response.ok) {
      const error = payload && typeof payload === "object" && "error" in payload ? payload.error : null;
      throw new Error(typeof error === "string" ? error : "Failed to update job");
    }

    return payload as SerializedJobSummary;
  }

  function replaceJob(nextJob: SerializedJobSummary) {
    setJobs((current) => current.map((job) => (job.id === nextJob.id ? nextJob : job)));
  }

  async function handleStatusChange(jobId: string, nextStatus: JobStatus) {
    setPendingJobId(jobId);
    setFormError("");

    try {
      const updatedJob = await patchJob(jobId, { status: nextStatus });
      replaceJob(updatedJob);
      invalidateCachedData(TAB_DATA_CACHE_KEYS.jobs);
      setSelectedJobId(updatedJob.id);
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "Failed to update job status");
    } finally {
      setPendingJobId(null);
    }
  }

  async function handleDeleteInvoice(job: SerializedJobSummary) {
    setPendingJobId(job.id);
    setFormError("");

    try {
      const response = await fetch(`/api/jobs/${job.id}/invoice`, { method: "DELETE" });
      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        const error = payload && typeof payload === "object" && "error" in payload ? payload.error : null;
        throw new Error(typeof error === "string" ? error : "Failed to delete invoice");
      }

      replaceJob(payload as SerializedJobSummary);
      invalidateCachedData(TAB_DATA_CACHE_KEYS.jobs);
      setSelectedJobId(job.id);
      setDialogState(null);
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "Failed to delete invoice");
    } finally {
      setPendingJobId(null);
    }
  }

  async function handleDeleteJob(job: SerializedJobSummary) {
    setPendingJobId(job.id);
    setFormError("");

    try {
      const response = await fetch(`/api/jobs/${job.id}`, { method: "DELETE" });
      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        const error = payload && typeof payload === "object" && "error" in payload ? payload.error : null;
        throw new Error(typeof error === "string" ? error : "Failed to delete job");
      }

      setJobs((current) => current.filter((entry) => entry.id !== job.id));
      invalidateCachedData(TAB_DATA_CACHE_KEYS.jobs);
      setDialogState(null);
      if (selectedJobId === job.id) {
        setShowSummaryPanel(false);
      }
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "Failed to delete job");
    } finally {
      setPendingJobId(null);
    }
  }

  async function handleCreate() {
    if (!form.jobNumber.trim()) {
      setFormError("Job number is required.");
      return;
    }

    if (!form.customer.trim()) {
      setFormError("Customer is required.");
      return;
    }

    setSaving(true);
    setFormError("");

    try {
      const response = await fetch("/api/jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jobNumber: form.jobNumber,
          title: form.title,
          customer: form.customer,
          date: form.date,
          notes: form.notes,
        }),
      });

      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        const error = payload && typeof payload === "object" && "error" in payload ? payload.error : null;
        throw new Error(typeof error === "string" ? error : "Failed to create job");
      }

      invalidateCachedData(TAB_DATA_CACHE_KEYS.jobs);
      router.push(`/jobs/${(payload as SerializedJobSummary).id}`);
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "Failed to create job");
    } finally {
      setSaving(false);
    }
  }

  function openSummary(jobId: string) {
    setSelectedJobId(jobId);
    setShowSummaryPanel(true);
  }

  return (
    <PageShell contentClassName="space-y-8">
      <PageHeader
        eyebrow={<Badge tone="blue">Jobs Workflow</Badge>}
        title="Move every job cleanly from field work to invoice"
        description="Track open, completed, and invoiced work from one premium workflow board. Counts stay aligned, actions stay obvious, and every job carries its parts, pricing, and totals all the way through."
        actions={
          canCreateJobs ? (
            <Button variant="primary" size="lg" onClick={() => setShowCreatePanel(true)}>
              <Sparkles className="h-4 w-4" />
              New Job
            </Button>
          ) : null
        }
      />

      <PageSection>
        <Card className="overflow-hidden border-white/12 p-0">
          <div className="grid gap-0 xl:grid-cols-[minmax(0,1.35fr)_minmax(22rem,1fr)]">
            <div className="border-b border-white/10 bg-[radial-gradient(circle_at_top_left,rgba(56,189,248,0.16),transparent_35%),linear-gradient(180deg,rgba(9,14,24,0.94),rgba(9,14,24,0.82))] px-5 py-6 sm:px-6 sm:py-7 xl:border-b-0 xl:border-r">
              <div className="flex flex-wrap items-center gap-3">
                <Badge tone={activeFolderMeta.tone}>{activeFolderMeta.label} Folder</Badge>
                <span className="rounded-full border border-white/10 bg-white/[0.05] px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-slate-300">
                  {visibleJobs.length} visible
                </span>
              </div>
              <div className="mt-5 max-w-2xl space-y-3">
                <h2 className="text-2xl font-semibold tracking-[-0.05em] text-white sm:text-[2rem]">{activeFolderMeta.description}</h2>
                <p className="text-sm leading-6 text-slate-300/78 sm:text-base">
                  Search fast, slice by customer or technician, and keep the next job action obvious without losing totals, parts, or billing context.
                </p>
              </div>
            </div>

            <div className="grid gap-4 px-5 py-6 sm:grid-cols-2 sm:px-6 sm:py-7">
              <HeroSignal label="Visible parts" value={String(visibleParts)} detail="Parts logged in the current folder" icon={PackagePlus} />
              <HeroSignal label="Needs attention" value={String(visibleAttention)} detail="Low-stock pressure or invoice follow-up" icon={TriangleAlert} />
              <HeroSignal label="Technician filter" value={technicianFilter === "ALL" ? "All" : technicianFilter} detail="Narrow the queue by owner when dispatch needs a tighter view" icon={UserRound} compact />
              <HeroSignal label="Recent activity" value={ACTIVITY_FILTER_OPTIONS.find((option) => option.value === activityFilter)?.label ?? "All activity"} detail="Keep the queue focused on what changed most recently" icon={CalendarClock} compact />
            </div>
          </div>
        </Card>
      </PageSection>

      <PageSection className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <WorkflowStatCard label="Open jobs" value={String(summary.open)} detail="Live field work" tone="orange" />
        <WorkflowStatCard label="Completed jobs" value={String(summary.completed)} detail="Ready for billing" tone="green" />
        <WorkflowStatCard label="Invoiced jobs" value={String(summary.invoiced)} detail="Cleared into billing" tone="blue" />
        <WorkflowStatCard label="Parts logged" value={String(visibleParts)} detail="Across the current folder" tone="teal" />
      </PageSection>

      <PageSection>
        <Card className="space-y-5 border-white/12 bg-[radial-gradient(circle_at_top,rgba(14,165,233,0.08),transparent_35%),linear-gradient(180deg,rgba(15,23,42,0.9),rgba(15,23,42,0.72))]">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
            <div>
              <h2 className="text-lg font-semibold tracking-[-0.03em] text-white">Workflow folders</h2>
              <p className="mt-2 text-sm leading-6 text-slate-300/76">Folders and filters all read from the same job collection, so counts, cards, and status moves stay in sync.</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-slate-300">
              <span className="font-semibold text-white">{visibleJobs.length}</span> jobs in view
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-3">
            {(Object.keys(STATUS_META) as JobStatus[]).map((status) => {
              const meta = STATUS_META[status];
              const count = status === "OPEN" ? summary.open : status === "COMPLETED" ? summary.completed : summary.invoiced;

              return (
                <FolderSegment
                  key={status}
                  label={meta.label}
                  description={meta.description}
                  count={count}
                  icon={meta.icon}
                  tone={meta.tone}
                  active={statusFilter === status}
                  onClick={() => setStatusFilter(status)}
                />
              );
            })}
          </div>

          <div className="grid gap-3 xl:grid-cols-[minmax(0,1.2fr)_repeat(3,minmax(0,0.8fr))]">
            <SearchBar value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search by job number, work order, customer, technician, or status" />
            <FilterSelect value={customerFilter} onChange={setCustomerFilter} label="Customer">
              <option value="ALL">All customers</option>
              {filterOptions.customers.map((customer) => (
                <option key={customer} value={customer}>
                  {customer}
                </option>
              ))}
            </FilterSelect>
            <FilterSelect value={technicianFilter} onChange={setTechnicianFilter} label="Technician">
              <option value="ALL">All technicians</option>
              {filterOptions.technicians.map((technician) => (
                <option key={technician} value={technician}>
                  {technician}
                </option>
              ))}
            </FilterSelect>
            <FilterSelect value={activityFilter} onChange={(value) => setActivityFilter(value as JobActivityFilter)} label="Recent activity">
              {ACTIVITY_FILTER_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </FilterSelect>
          </div>

          {formError ? <Card className="border-rose-400/20 bg-rose-500/[0.08] text-rose-100">{formError}</Card> : null}
        </Card>
      </PageSection>

      <PageSection>
        {visibleJobs.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
            {visibleJobs.map((job) => (
              <JobWorkflowCard
                key={job.id}
                job={job}
                canShowBase={canShowBase}
                canShowMargin={canShowMargin}
                canShowTotal={canShowTotal}
                canCloseJobs={canCloseJobs}
                canInvoiceJobs={canInvoiceJobs}
                canDeleteJobs={canEditJobs}
                busy={pendingJobId === job.id}
                onOpenSummary={() => openSummary(job.id)}
                onStatusChange={handleStatusChange}
                onDeleteInvoice={() => setDialogState({ kind: "delete-invoice", job })}
                onDeleteJob={() => setDialogState({ kind: "delete-job", job })}
              />
            ))}
          </div>
        ) : (
          <Card className="overflow-hidden border-white/12 p-0">
            <div className="flex flex-col items-center justify-center gap-4 bg-[radial-gradient(circle_at_top,rgba(14,165,233,0.12),transparent_38%),linear-gradient(180deg,rgba(9,14,24,0.94),rgba(9,14,24,0.82))] px-6 py-14 text-center">
              <div className="inline-flex h-14 w-14 items-center justify-center rounded-[1.4rem] border border-white/10 bg-white/[0.06] text-slate-100">
                <SearchX className="h-5 w-5" />
              </div>
              <div className="space-y-3">
                <h2 className="text-xl font-semibold tracking-[-0.04em] text-white">No jobs match this folder view</h2>
                <p className="max-w-xl text-sm leading-6 text-slate-300/76">Clear one of the filters or switch folders. The workflow board keeps counts stable, so an empty view means the queue is genuinely clear for this slice.</p>
              </div>
              <div className="flex flex-wrap items-center justify-center gap-3">
                <Button
                  variant="secondary"
                  onClick={() => {
                    setSearch("");
                    setCustomerFilter("ALL");
                    setTechnicianFilter("ALL");
                    setActivityFilter("all");
                  }}
                >
                  Reset filters
                </Button>
                {canCreateJobs ? (
                  <Button variant="primary" onClick={() => setShowCreatePanel(true)}>
                    New Job
                  </Button>
                ) : null}
              </div>
            </div>
          </Card>
        )}
      </PageSection>

      <SidePanel
        open={showCreatePanel}
        onClose={() => setShowCreatePanel(false)}
        title="Create a new job"
        description="Set up the work order with the fields technicians actually need, then move straight into parts, notes, and completion."
        footer={
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button className="flex-1" variant="primary" onClick={handleCreate} disabled={saving}>
              {saving ? "Creating..." : "Create job"}
            </Button>
            <Button className="flex-1" variant="secondary" onClick={() => setShowCreatePanel(false)}>
              Cancel
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          <Field label="Job number">
            <input
              value={form.jobNumber}
              onChange={(event) => setForm((current) => ({ ...current, jobNumber: event.target.value }))}
              className={fieldClassName}
            />
          </Field>
          <Field label="Work order title">
            <input
              value={form.title}
              onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
              className={fieldClassName}
              placeholder="Optional title or quick summary"
            />
          </Field>
          <Field label="Customer">
            <input
              value={form.customer}
              onChange={(event) => setForm((current) => ({ ...current, customer: event.target.value }))}
              className={fieldClassName}
            />
          </Field>
          <Field label="Service date">
            <input
              type="date"
              value={form.date}
              onChange={(event) => setForm((current) => ({ ...current, date: event.target.value }))}
              className={fieldClassName}
            />
          </Field>
          <Field label="Internal notes">
            <textarea
              value={form.notes}
              onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))}
              rows={5}
              className={fieldClassName}
              placeholder="Optional setup notes for the crew"
            />
          </Field>
          {formError ? <p className="text-sm text-rose-300">{formError}</p> : null}
        </div>
      </SidePanel>

      <SidePanel
        open={showSummaryPanel && selectedJob !== null}
        onClose={() => setShowSummaryPanel(false)}
        title={selectedJob ? `${selectedJob.jobNumber} summary` : "Job summary"}
        description={selectedJob ? selectedJob.displayTitle : undefined}
        footer={
          selectedJob ? (
            <div className="flex flex-col gap-3">
              <Button variant="primary" href={`/jobs/${selectedJob.id}`}>
                Open job
              </Button>
              <div className="flex flex-col gap-3 sm:flex-row">
                {normalizeJobStatus(selectedJob.status) === "OPEN" && canCloseJobs ? (
                  <Button className="flex-1" variant="secondary" onClick={() => handleStatusChange(selectedJob.id, "COMPLETED")} disabled={pendingJobId === selectedJob.id}>
                    Mark completed
                  </Button>
                ) : null}
                {normalizeJobStatus(selectedJob.status) === "COMPLETED" && canCloseJobs ? (
                  <Button className="flex-1" variant="secondary" onClick={() => handleStatusChange(selectedJob.id, "OPEN")} disabled={pendingJobId === selectedJob.id}>
                    Move back to open
                  </Button>
                ) : null}
                {normalizeJobStatus(selectedJob.status) === "COMPLETED" && canInvoiceJobs ? (
                  <Button className="flex-1" variant="secondary" onClick={() => handleStatusChange(selectedJob.id, "INVOICED")} disabled={pendingJobId === selectedJob.id}>
                    Mark invoiced
                  </Button>
                ) : null}
                {canInvoiceJobs && hasJobInvoiceMetadata(selectedJob) ? (
                  <Button className="flex-1" variant="secondary" onClick={() => setDialogState({ kind: "delete-invoice", job: selectedJob })} disabled={pendingJobId === selectedJob.id}>
                    Delete invoice
                  </Button>
                ) : null}
              </div>
            </div>
          ) : null
        }
      >
        {selectedJob ? (
          <div className="space-y-5">
            <div className="flex flex-wrap items-center gap-3">
              <StatusPill status={selectedJob.status} />
              {selectedJob.needsPartsAttention ? <Badge tone="orange">Needs parts attention</Badge> : null}
              {selectedJob.invoiceStatus === "INVOICED_PENDING_NUMBER" ? <Badge tone="red">Invoice number missing</Badge> : null}
            </div>

            <Card className="space-y-4 bg-white/[0.03]">
              <SummaryDetailRow label="Customer" value={selectedJob.customer || "No customer recorded"} />
              <SummaryDetailRow label="Technician" value={selectedJob.technician.name} />
              <SummaryDetailRow label="Service date" value={formatDate(selectedJob.date)} />
              <SummaryDetailRow label="Latest activity" value={formatDateTime(selectedJob.latestActivityAt)} />
              <SummaryDetailRow label="Parts logged" value={String(selectedJob.partsCount)} />
              <SummaryDetailRow label="Status" value={getJobStatusLabel(selectedJob.status)} />
            </Card>

            <div className="grid gap-3 sm:grid-cols-2">
              <MetricTile label="Subtotal cost" value={canShowBase ? formatCurrency(selectedJob.totals.totalCost) : "Hidden"} />
              <MetricTile label="Invoice total" value={canShowTotal ? formatCurrency(selectedJob.totals.totalSell) : "Hidden"} />
            </div>

            <Card className="space-y-4 bg-white/[0.03]">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Customer summary</p>
                <p className="mt-2 text-sm leading-6 text-slate-200/86">{selectedJob.customerSummary || "No customer summary recorded yet."}</p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Internal notes</p>
                <p className="mt-2 text-sm leading-6 text-slate-200/86">{selectedJob.notes || "No internal notes recorded yet."}</p>
              </div>
            </Card>
          </div>
        ) : null}
      </SidePanel>

      <ConfirmationDialog
        open={dialogState?.kind === "delete-invoice"}
        title="Delete invoice?"
        description="This will remove invoice status and return the job to Completed. Job details, parts, and pricing will be kept."
        confirmLabel="Delete Invoice"
        busy={dialogState ? pendingJobId === dialogState.job.id : false}
        onClose={() => setDialogState(null)}
        onConfirm={() => {
          if (dialogState?.kind === "delete-invoice") {
            void handleDeleteInvoice(dialogState.job);
          }
        }}
      />

      <ConfirmationDialog
        open={dialogState?.kind === "delete-job"}
        title="Delete job?"
        description="This permanently removes the entire job and all related job data. Parts, pricing snapshots, notes, and history attached to the job will be removed."
        confirmLabel="Delete Job"
        busy={dialogState ? pendingJobId === dialogState.job.id : false}
        onClose={() => setDialogState(null)}
        onConfirm={() => {
          if (dialogState?.kind === "delete-job") {
            void handleDeleteJob(dialogState.job);
          }
        }}
      />
    </PageShell>
  );
}

function JobWorkflowCard({
  job,
  canShowBase,
  canShowMargin,
  canShowTotal,
  canCloseJobs,
  canInvoiceJobs,
  canDeleteJobs,
  busy,
  onOpenSummary,
  onStatusChange,
  onDeleteInvoice,
  onDeleteJob,
}: {
  job: SerializedJobSummary;
  canShowBase: boolean;
  canShowMargin: boolean;
  canShowTotal: boolean;
  canCloseJobs: boolean;
  canInvoiceJobs: boolean;
  canDeleteJobs: boolean;
  busy: boolean;
  onOpenSummary: () => void;
  onStatusChange: (jobId: string, status: JobStatus) => void;
  onDeleteInvoice: () => void;
  onDeleteJob: () => void;
}) {
  const normalizedStatus = normalizeJobStatus(job.status);
  const attentionTone = job.invoiceStatus === "INVOICED_PENDING_NUMBER" ? "red" : "orange";
  const attentionLabel = job.invoiceStatus === "INVOICED_PENDING_NUMBER" ? "Invoice number missing" : "Needs parts attention";
  const canDeleteInvoice = canInvoiceJobs && hasJobInvoiceMetadata(job);

  return (
    <Card className="flex h-full flex-col gap-5 border-white/12 p-5 transition-transform duration-200 hover:-translate-y-0.5 hover:border-sky-400/20">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-3">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">{job.jobNumber}</p>
            <StatusPill status={job.status} />
            {job.needsPartsAttention || job.invoiceStatus === "INVOICED_PENDING_NUMBER" ? <Badge tone={attentionTone}>{attentionLabel}</Badge> : null}
          </div>
          <h3 className="mt-3 text-xl font-semibold tracking-[-0.04em] text-white">{job.displayTitle}</h3>
          <p className="mt-2 text-sm leading-6 text-slate-300/78">{job.customer || "No customer recorded"}</p>
        </div>
        <div className="rounded-[1.2rem] border border-white/10 bg-white/[0.04] px-3 py-2 text-right">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Parts</p>
          <p className="mt-2 text-lg font-semibold text-white">{job.partsCount}</p>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <InfoCell label="Customer" value={job.customer || "No customer"} />
        <InfoCell label="Technician" value={job.technician.name} />
        <InfoCell label="Service date" value={formatDate(job.date)} />
        <InfoCell label="Latest activity" value={formatDateTime(job.latestActivityAt)} />
      </div>

      <div className={cn("grid gap-3", canShowBase || canShowMargin || canShowTotal ? "sm:grid-cols-3" : "sm:grid-cols-2")}>
        <MetricTile label="Parts logged" value={String(job.partsCount)} />
        {canShowBase ? <MetricTile label="Total cost" value={formatCurrency(job.totals.totalCost)} /> : null}
        {canShowMargin ? <MetricTile label="Margin" value={formatCurrency(job.totals.margin)} /> : null}
        {canShowTotal ? <MetricTile label="Invoice total" value={formatCurrency(job.totals.totalSell)} /> : null}
      </div>

      <div className="mt-auto space-y-3 border-t border-white/10 pt-4">
        <div className="flex flex-wrap gap-3">
          <Button variant="primary" href={`/jobs/${job.id}`}>
            Open job
          </Button>
          {normalizedStatus === "OPEN" ? (
            <Button variant="secondary" href={`/jobs/${job.id}#parts`}>
              Quick add parts
            </Button>
          ) : null}
          {normalizedStatus === "OPEN" && canCloseJobs ? (
            <Button variant="secondary" onClick={() => onStatusChange(job.id, "COMPLETED")} disabled={busy}>
              {busy ? "Updating..." : "Mark completed"}
            </Button>
          ) : null}
          {normalizedStatus === "COMPLETED" && canInvoiceJobs ? (
            <Button variant="secondary" onClick={() => onStatusChange(job.id, "INVOICED")} disabled={busy}>
              {busy ? "Updating..." : "Mark invoiced"}
            </Button>
          ) : null}
          {normalizedStatus === "COMPLETED" && canCloseJobs ? (
            <Button variant="ghost" onClick={() => onStatusChange(job.id, "OPEN")} disabled={busy}>
              Move back to open
            </Button>
          ) : null}
          <Button variant="ghost" onClick={onOpenSummary}>
            Open summary
          </Button>
        </div>

        <div className="flex flex-wrap gap-3 border-t border-white/10 pt-3">
          {canDeleteInvoice ? (
            <Button variant="secondary" onClick={onDeleteInvoice} disabled={busy}>
              Delete invoice
            </Button>
          ) : null}
          {canDeleteJobs ? (
            <Button variant="ghost" className="text-rose-200 hover:border-rose-400/20 hover:bg-rose-500/10 hover:text-rose-100" onClick={onDeleteJob} disabled={busy}>
              Delete job
            </Button>
          ) : null}
        </div>
      </div>
    </Card>
  );
}

function WorkflowStatCard({ label, value, detail, tone }: { label: string; value: string; detail: string; tone: "orange" | "green" | "blue" | "teal" }) {
  return (
    <Card className="border-white/12 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.05),transparent_38%),linear-gradient(180deg,rgba(15,23,42,0.92),rgba(15,23,42,0.76))]">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">{label}</p>
          <p className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-white">{value}</p>
        </div>
        <div
          className={cn(
            "h-12 w-12 rounded-2xl border",
            tone === "orange"
              ? "border-amber-400/20 bg-amber-400/10"
              : tone === "green"
                ? "border-emerald-400/20 bg-emerald-400/10"
                : tone === "blue"
                  ? "border-sky-400/20 bg-sky-400/10"
                  : "border-teal-400/20 bg-teal-400/10"
          )}
        />
      </div>
      <p className="mt-3 text-sm leading-6 text-slate-300/72">{detail}</p>
    </Card>
  );
}

function HeroSignal({
  label,
  value,
  detail,
  icon: Icon,
  compact = false,
}: {
  label: string;
  value: string;
  detail: string;
  icon: typeof PackagePlus;
  compact?: boolean;
}) {
  return (
    <div className="rounded-[1.6rem] border border-white/10 bg-white/[0.04] p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">{label}</p>
          <p className={cn("mt-3 font-semibold tracking-[-0.04em] text-white", compact ? "text-lg" : "text-2xl")}>{value}</p>
        </div>
        <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.05] text-slate-200">
          <Icon className="h-4 w-4" />
        </span>
      </div>
      <p className="mt-3 text-sm leading-6 text-slate-300/72">{detail}</p>
    </div>
  );
}

function FolderSegment({
  label,
  description,
  count,
  icon: Icon,
  tone,
  active,
  onClick,
}: {
  label: string;
  description: string;
  count: number;
  icon: typeof FolderOpen;
  tone: "orange" | "green" | "blue";
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-[1.6rem] border p-4 text-left transition-colors",
        active
          ? "border-sky-400/20 bg-sky-500/[0.08] shadow-[0_16px_32px_rgba(14,165,233,0.12)]"
          : "border-white/10 bg-white/[0.03] hover:bg-white/[0.06]"
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.05] text-white">
            <Icon className="h-5 w-5" />
          </span>
          <div>
            <p className="text-sm font-semibold text-white">{label}</p>
            <p className="mt-2 text-sm leading-6 text-slate-300/72">{description}</p>
          </div>
        </div>
        <Badge tone={tone}>{count}</Badge>
      </div>
    </button>
  );
}

function FilterSelect({
  label,
  value,
  onChange,
  children,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  children: ReactNode;
}) {
  return (
    <label className="flex min-h-12 flex-col justify-center rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-2">
      <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">{label}</span>
      <select value={value} onChange={(event) => onChange(event.target.value)} className="mt-1 bg-transparent text-sm text-slate-100 outline-none">
        {children}
      </select>
    </label>
  );
}

function StatusPill({ status }: { status: string }) {
  const normalizedStatus = normalizeJobStatus(status);
  const tone = normalizedStatus === "OPEN" ? "orange" : normalizedStatus === "COMPLETED" ? "green" : "blue";

  return <Badge tone={tone}>{getJobStatusLabel(normalizedStatus)}</Badge>;
}

function InfoCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[1.2rem] border border-white/10 bg-white/[0.03] p-3">
      <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">{label}</p>
      <p className="mt-2 text-sm font-medium text-white">{value}</p>
    </div>
  );
}

function MetricTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[1.2rem] border border-white/10 bg-white/[0.03] p-3">
      <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">{label}</p>
      <p className="mt-2 text-lg font-semibold tracking-[-0.03em] text-white">{value}</p>
    </div>
  );
}

function SummaryDetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">{label}</span>
      <span className="text-sm font-medium text-white">{value}</span>
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block space-y-2">
      <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">{label}</span>
      {children}
    </label>
  );
}

const fieldClassName =
  "w-full rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-3 text-sm text-white outline-none placeholder:text-slate-500";

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

export default JobsPageClient;
