"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { UserRole } from "@/lib/auth";
import { GlassBubbleCard } from "@/components/ui/glass-bubble-card";

interface JobPart {
  id: string;
  quantity: number;
  unitCost: number;
  notes?: string | null;
  item: { id: string; name: string; partNumber?: string | null; unitOfMeasure: string };
}

export interface JobsReportJob {
  id: string;
  jobNumber: string;
  customer: string;
  date: string;
  status: string;
  notes?: string | null;
  technician: { id: string; name: string };
  parts: JobPart[];
}

interface JobsReportPageClientProps {
  currentUserRole: UserRole;
  initialJobs: JobsReportJob[];
}

const STATUS_COLOR: Record<string, string> = {
  OPEN: "bg-amber-900/60 text-amber-300",
  COMPLETED: "bg-slate-700/60 text-slate-300",
  INVOICED: "bg-slate-700 text-slate-300",
};

export function JobsReportPageClient({ currentUserRole, initialJobs }: JobsReportPageClientProps) {
  const [jobs] = useState<JobsReportJob[]>(initialJobs);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  function toggleExpand(id: string) {
    setExpanded(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  const filtered = useMemo(() => {
    return jobs.filter(j => {
      if (statusFilter !== "ALL" && j.status !== statusFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        if (!j.jobNumber.toLowerCase().includes(q) &&
            !j.customer.toLowerCase().includes(q) &&
            !j.technician.name.toLowerCase().includes(q)) return false;
      }
      if (dateFrom) {
        const from = new Date(dateFrom).getTime();
        if (new Date(j.date).getTime() < from) return false;
      }
      if (dateTo) {
        const to = new Date(dateTo).getTime() + 86400000;
        if (new Date(j.date).getTime() > to) return false;
      }
      return true;
    });
  }, [jobs, statusFilter, search, dateFrom, dateTo]);

  const grandTotal = useMemo(
    () => filtered.reduce((sum, j) => sum + (j.parts || []).reduce((s, p) => s + p.unitCost * p.quantity, 0), 0),
    [filtered]
  );

  // Only admin/office can see this report
  if (currentUserRole === "TECH") {
    return (
      <main className="mx-auto w-full max-w-[1280px] px-4 sm:px-6 lg:px-8 py-8 form-screen">
        <GlassBubbleCard>
          <p className="text-slate-400">Access restricted.</p>
        </GlassBubbleCard>
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-[1280px] px-4 sm:px-6 lg:px-8 py-8 form-screen">
      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
        <Link href="/reports" className="text-slate-400 hover:text-slate-200 text-sm">← Reports</Link>
        <h1 className="text-2xl sm:text-3xl font-bold">Parts by Job</h1>
      </div>
      <p className="text-slate-500 text-sm mb-5">Material cost summary for all jobs. Use for billing and ordering analysis.</p>

      {/* Filters */}
      <GlassBubbleCard className="mb-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <input
            className="rounded-xl text-slate-100 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
            style={{ background: "rgba(15,23,42,0.6)", border: "1px solid rgba(148,163,184,0.12)" }}
            placeholder="Search job #, customer, tech…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          <select
            className="rounded-xl text-slate-100 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
            style={{ background: "rgba(15,23,42,0.6)", border: "1px solid rgba(148,163,184,0.12)" }}
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
          >
            <option value="ALL">All Statuses</option>
            <option value="OPEN">Open</option>
            <option value="COMPLETED">Completed</option>
            <option value="INVOICED">Invoiced</option>
          </select>
          <input
            type="date"
            className="rounded-xl text-slate-100 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
            style={{ background: "rgba(15,23,42,0.6)", border: "1px solid rgba(148,163,184,0.12)" }}
            value={dateFrom}
            onChange={e => setDateFrom(e.target.value)}
            placeholder="From date"
          />
          <input
            type="date"
            className="rounded-xl text-slate-100 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
            style={{ background: "rgba(15,23,42,0.6)", border: "1px solid rgba(148,163,184,0.12)" }}
            value={dateTo}
            onChange={e => setDateTo(e.target.value)}
            placeholder="To date"
          />
        </div>
      </GlassBubbleCard>

      {/* Summary row */}
      <div className="flex gap-4 mb-5 flex-wrap">
        <div className="rounded-xl border border-slate-700 bg-slate-900 px-4 py-3">
          <p className="text-xs text-slate-400">Jobs Shown</p>
          <p className="text-xl font-bold">{filtered.length}</p>
        </div>
        <div className="rounded-xl border border-white/10 bg-slate-900 px-4 py-3">
          <p className="text-xs text-slate-400">Total Material Cost</p>
          <p className="text-xl font-bold text-slate-100">${grandTotal.toFixed(2)}</p>
        </div>
      </div>

      {/* Job rows */}
      {filtered.length === 0 ? (
        <GlassBubbleCard>
          <p className="text-slate-400 text-center py-8">No jobs match your filters.</p>
        </GlassBubbleCard>
      ) : (
        <div className="space-y-2">
          {filtered.map(job => {
            const jobTotal = (job.parts || []).reduce((s, p) => s + p.unitCost * p.quantity, 0);
            const isOpen = expanded.has(job.id);
            return (
              <div key={job.id} className="rounded-2xl border border-slate-700 bg-slate-900 overflow-hidden">
                <button
                  className="w-full text-left p-4 flex items-center gap-3 hover:bg-slate-800/50 transition-colors"
                  onClick={() => toggleExpand(job.id)}
                >
                  <span className="text-slate-400 text-sm w-4">{isOpen ? "▼" : "▶"}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-bold text-slate-100">{job.jobNumber}</span>
                      <span className="text-slate-400 text-sm">— {job.customer}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_COLOR[job.status] ?? "bg-slate-700 text-slate-300"}`}>
                        {job.status}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {job.technician.name} · {new Date(job.date).toLocaleDateString()}
                      · {(job.parts || []).length} part{(job.parts || []).length !== 1 ? "s" : ""}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-bold text-slate-100">${jobTotal.toFixed(2)}</p>
                  </div>
                </button>

                {isOpen && (
                  <div className="border-t border-slate-700 px-4 pb-4 pt-3">
                    {(job.parts || []).length === 0 ? (
                      <p className="text-xs text-slate-500 italic">No parts logged for this job.</p>
                    ) : (
                      <>
                        <div className="space-y-3 sm:hidden">
                          {(job.parts || []).map(p => (
                            <div key={p.id} className="rounded-xl border border-slate-700/70 bg-slate-950/40 p-3">
                              <p className="font-medium text-slate-200">{p.item.name}</p>
                              {p.item.partNumber && <p className="mt-1 text-xs text-slate-500">{p.item.partNumber}</p>}
                              {p.notes && <p className="mt-1 text-xs italic text-slate-400">{p.notes}</p>}
                              <div className="mt-3 grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
                                <div>
                                  <p className="text-[10px] uppercase tracking-wider text-slate-500">Qty</p>
                                  <p className="mt-0.5 text-slate-200">{p.quantity} {p.item.unitOfMeasure}</p>
                                </div>
                                <div>
                                  <p className="text-[10px] uppercase tracking-wider text-slate-500">Unit Cost</p>
                                  <p className="mt-0.5 text-slate-200">${p.unitCost.toFixed(2)}</p>
                                </div>
                                <div>
                                  <p className="text-[10px] uppercase tracking-wider text-slate-500">Total</p>
                                  <p className="mt-0.5 font-medium text-slate-100">${(p.unitCost * p.quantity).toFixed(2)}</p>
                                </div>
                              </div>
                            </div>
                          ))}
                          <div className="pt-1 text-right">
                            <p className="text-xs font-semibold text-slate-400">Job Total</p>
                            <p className="mt-0.5 text-lg font-bold text-slate-100">${jobTotal.toFixed(2)}</p>
                          </div>
                        </div>
                        <div className="hidden overflow-x-auto sm:block">
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="border-b border-slate-700 text-xs text-slate-400">
                                <th className="pb-2 text-left">Part</th>
                                <th className="pb-2 text-right">Qty</th>
                                <th className="pb-2 text-right">Unit Cost</th>
                                <th className="pb-2 text-right">Total</th>
                              </tr>
                            </thead>
                            <tbody>
                              {(job.parts || []).map(p => (
                                <tr key={p.id} className="border-b border-slate-800 last:border-0">
                                  <td className="py-1.5 text-slate-200">
                                    {p.item.name}
                                    {p.item.partNumber && <span className="ml-1 text-xs text-slate-500">({p.item.partNumber})</span>}
                                    {p.notes && <span className="ml-1 text-xs italic text-slate-400">- {p.notes}</span>}
                                  </td>
                                  <td className="text-right text-slate-300">{p.quantity} {p.item.unitOfMeasure}</td>
                                  <td className="text-right text-slate-300">${p.unitCost.toFixed(2)}</td>
                                  <td className="text-right font-medium text-slate-100">${(p.unitCost * p.quantity).toFixed(2)}</td>
                                </tr>
                              ))}
                              <tr>
                                <td colSpan={3} className="pt-3 text-right text-xs font-semibold text-slate-400">Job Total</td>
                                <td className="pt-3 text-right font-bold text-slate-100">${jobTotal.toFixed(2)}</td>
                              </tr>
                            </tbody>
                          </table>
                        </div>
                      </>
                    )}
                    <div className="mt-3">
                      <Link href={`/jobs/${job.id}`}
                        className="text-xs text-indigo-300 hover:text-indigo-200 underline">
                        Open Job →
                      </Link>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </main>
  );
}

export default JobsReportPageClient;
