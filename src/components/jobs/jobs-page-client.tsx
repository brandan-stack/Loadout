"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { BriefcaseBusiness, CalendarDays, CircleCheck, Clock3, PackagePlus } from "lucide-react";
import type { UserRole } from "@/lib/auth";
import { TAB_DATA_CACHE_KEYS, invalidateCachedData, primeCachedData } from "@/lib/client-data-cache";
import { StatCard } from "@/components/cards/StatCard";
import { PageSection, PageShell } from "@/components/layout/page-shell";
import { SidePanel } from "@/components/panels/SidePanel";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { FilterTabs } from "@/components/ui/FilterTabs";
import { PageHeader } from "@/components/ui/PageHeader";
import { SearchBar } from "@/components/ui/SearchBar";

export interface Job {
  id: string;
  jobNumber: string;
  customer: string;
  date: string;
  status: string;
  technician: { id: string; name: string };
  _count: { parts: number };
}

interface JobsPageClientProps {
  currentUserRole: UserRole;
  initialJobs: Job[];
}

export function JobsPageClient({ currentUserRole, initialJobs }: JobsPageClientProps) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [showCreatePanel, setShowCreatePanel] = useState(false);
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [form, setForm] = useState({
    jobNumber: "",
    customer: "",
    date: new Date().toISOString().slice(0, 10),
    notes: "",
  });

  useEffect(() => {
    primeCachedData(TAB_DATA_CACHE_KEYS.jobs, initialJobs);
  }, [initialJobs]);

  const filteredJobs = useMemo(() => {
    return initialJobs.filter((job) => {
      if (statusFilter !== "all" && job.status !== statusFilter) {
        return false;
      }

      if (!search.trim()) {
        return true;
      }

      const query = search.trim().toLowerCase();
      return [job.jobNumber, job.customer, job.technician.name].some((value) =>
        value.toLowerCase().includes(query)
      );
    });
  }, [initialJobs, search, statusFilter]);

  const summary = useMemo(
    () => ({
      open: initialJobs.filter((job) => job.status === "OPEN").length,
      completed: initialJobs.filter((job) => job.status === "COMPLETED").length,
      invoiced: initialJobs.filter((job) => job.status === "INVOICED").length,
      parts: initialJobs.reduce((total, job) => total + job._count.parts, 0),
    }),
    [initialJobs]
  );

  const selectedJob = initialJobs.find((job) => job.id === selectedJobId) ?? null;

  async function handleCreate() {
    if (!form.jobNumber.trim()) {
      setFormError("Job number is required");
      return;
    }

    if (!form.customer.trim()) {
      setFormError("Customer name is required");
      return;
    }

    setSaving(true);
    setFormError("");

    try {
      const response = await fetch("/api/jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      if (response.ok) {
        const createdJob = await response.json();
        invalidateCachedData(TAB_DATA_CACHE_KEYS.jobs);
        router.push(`/jobs/${createdJob.id}`);
        return;
      }

      const payload = await response.json().catch(() => null);
      const error = payload && typeof payload === "object" && "error" in payload ? payload.error : null;
      setFormError(typeof error === "string" ? error : "Failed to create job");
    } catch {
      setFormError("Failed to create job");
    } finally {
      setSaving(false);
    }
  }

  return (
    <PageShell>
      <PageHeader
        eyebrow={<Badge tone="blue">Jobs Workspace</Badge>}
        title="Keep work orders moving"
        description="Technicians need the next job to be obvious. Search fast, scan status at a glance, and jump straight into the record that needs attention."
        actions={
          currentUserRole !== "OFFICE" ? (
            <Button variant="primary" onClick={() => setShowCreatePanel(true)}>
              New job
            </Button>
          ) : null
        }
      />

      <PageSection className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Open" value={String(summary.open)} hint="Live field work orders" trend={summary.open > 0 ? "Active" : "Clear"} tone={summary.open > 0 ? "orange" : "green"} icon={Clock3} />
        <StatCard label="Completed" value={String(summary.completed)} hint="Work finished and ready to close" trend="Ready" tone="green" icon={CircleCheck} />
        <StatCard label="Invoiced" value={String(summary.invoiced)} hint="Work that has moved to billing" trend="Closed" tone="blue" icon={CalendarDays} />
        <StatCard label="Parts logged" value={String(summary.parts)} hint="Total parts across visible jobs" trend={`${filteredJobs.length} jobs`} tone="teal" icon={PackagePlus} />
      </PageSection>

      <PageSection>
        <Card className="space-y-4">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-white">Job controls</h2>
              <p className="mt-2 text-sm leading-6 text-slate-300/78">Filter by status, search by customer or job number, and get to the next field action without extra clicks.</p>
            </div>
            <Badge tone="slate">{filteredJobs.length} showing</Badge>
          </div>
          <div className="grid gap-4 xl:grid-cols-[minmax(0,24rem)_minmax(0,1fr)]">
            <SearchBar value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search jobs" />
            <FilterTabs
              value={statusFilter}
              onChange={setStatusFilter}
              options={[
                { value: "all", label: "All", count: String(initialJobs.length) },
                { value: "OPEN", label: "Open", count: String(summary.open) },
                { value: "COMPLETED", label: "Completed", count: String(summary.completed) },
                { value: "INVOICED", label: "Invoiced", count: String(summary.invoiced) },
              ]}
            />
          </div>
        </Card>
      </PageSection>

      <PageSection className="grid gap-4 lg:grid-cols-2">
        {filteredJobs.length > 0 ? (
          filteredJobs.map((job) => (
            <Card key={job.id} className="space-y-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex flex-wrap items-center gap-3">
                    <h2 className="text-xl font-semibold tracking-[-0.04em] text-white">{job.jobNumber}</h2>
                    <JobStatusBadge status={job.status} />
                  </div>
                  <p className="mt-2 text-sm leading-6 text-slate-300/78">{job.customer}</p>
                  <p className="mt-2 text-xs uppercase tracking-[0.18em] text-slate-500">{job.technician.name} • {new Date(job.date).toLocaleDateString()}</p>
                </div>
                <span className="rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-2 text-sm font-semibold text-slate-100">
                  {job._count.parts} parts
                </span>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Customer</p>
                  <p className="mt-3 text-sm font-medium text-white">{job.customer}</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Date</p>
                  <p className="mt-3 text-sm font-medium text-white">{new Date(job.date).toLocaleDateString()}</p>
                </div>
              </div>

              <div className="flex flex-wrap gap-4">
                <Button variant="primary" href={`/jobs/${job.id}`}>Open job</Button>
                <Button variant="secondary" href={`/jobs/${job.id}`}>Quick add parts</Button>
                <Button variant="ghost" onClick={() => setSelectedJobId(job.id)}>View summary</Button>
              </div>
            </Card>
          ))
        ) : (
          <Card className="text-center lg:col-span-2">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.05] text-slate-200">
              <BriefcaseBusiness className="h-5 w-5" />
            </div>
            <h2 className="mt-4 text-lg font-semibold text-white">No jobs match the current view</h2>
            <p className="mt-3 text-sm leading-6 text-slate-300/78">Adjust the filters or search terms to surface a different work order.</p>
          </Card>
        )}
      </PageSection>

      <SidePanel
        open={showCreatePanel}
        onClose={() => setShowCreatePanel(false)}
        title="Create a new job"
        description="Keep setup tight so technicians can move straight into the work order."
        footer={
          <div className="flex flex-col gap-4 sm:flex-row">
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
          <label className="block space-y-2">
            <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Job number</span>
            <input value={form.jobNumber} onChange={(event) => setForm({ ...form, jobNumber: event.target.value })} className="w-full rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-3 text-sm text-white outline-none" />
          </label>
          <label className="block space-y-2">
            <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Customer</span>
            <input value={form.customer} onChange={(event) => setForm({ ...form, customer: event.target.value })} className="w-full rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-3 text-sm text-white outline-none" />
          </label>
          <label className="block space-y-2">
            <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Date</span>
            <input type="date" value={form.date} onChange={(event) => setForm({ ...form, date: event.target.value })} className="w-full rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-3 text-sm text-white outline-none" />
          </label>
          <label className="block space-y-2">
            <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Notes</span>
            <textarea value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} rows={4} className="w-full rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-3 text-sm text-white outline-none" />
          </label>
          {formError ? <p className="text-sm text-rose-300">{formError}</p> : null}
        </div>
      </SidePanel>

      <SidePanel
        open={selectedJob !== null}
        onClose={() => setSelectedJobId(null)}
        title={selectedJob?.jobNumber ?? "Job summary"}
        description={selectedJob?.customer}
        footer={
          selectedJob ? (
            <div className="flex flex-col gap-4 sm:flex-row">
              <Button className="flex-1" variant="primary" href={`/jobs/${selectedJob.id}`}>Open job</Button>
              <Button className="flex-1" variant="secondary" href={`/jobs/${selectedJob.id}`}>Add parts</Button>
            </div>
          ) : null
        }
      >
        {selectedJob ? (
          <div className="space-y-4">
            <JobStatusBadge status={selectedJob.status} />
            <Card className="space-y-4 bg-white/[0.04]">
              <DetailRow label="Technician" value={selectedJob.technician.name} />
              <DetailRow label="Date" value={new Date(selectedJob.date).toLocaleDateString()} />
              <DetailRow label="Parts logged" value={String(selectedJob._count.parts)} />
            </Card>
          </div>
        ) : null}
      </SidePanel>
    </PageShell>
  );
}

function JobStatusBadge({ status }: { status: string }) {
  const tone = status === "OPEN" ? "orange" : status === "COMPLETED" ? "green" : "blue";
  return <Badge tone={tone}>{status.toLowerCase()}</Badge>;
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">{label}</span>
      <span className="text-sm font-medium text-white">{value}</span>
    </div>
  );
}

export default JobsPageClient;