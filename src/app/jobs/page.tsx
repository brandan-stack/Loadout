"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCurrentUser } from "@/hooks/useCurrentUser";

interface Job {
  id: string;
  jobNumber: string;
  customer: string;
  date: string;
  status: string;
  technician: { id: string; name: string };
  _count: { parts: number };
}

export default function JobsPage() {
  const { user, loading: userLoading } = useCurrentUser();
  const router = useRouter();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ jobNumber: "", customer: "", date: new Date().toISOString().slice(0, 10), notes: "" });
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => { fetchJobs(); }, []);

  async function fetchJobs() {
    try {
      const res = await fetch("/api/jobs");
      const data = await res.json();
      setJobs(Array.isArray(data) ? data : []);
    } catch { /* ignore */ } finally { setLoading(false); }
  }

  async function handleCreate() {
    if (!form.jobNumber.trim()) { setFormError("Job number is required"); return; }
    if (!form.customer.trim()) { setFormError("Customer name is required"); return; }
    setSaving(true); setFormError("");
    try {
      const res = await fetch("/api/jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (res.ok) {
        const job = await res.json();
        setShowForm(false);
        setForm({ jobNumber: "", customer: "", date: new Date().toISOString().slice(0, 10), notes: "" });
        // Use router.push for client-side navigation (keeps session state)
        router.push(`/jobs/${job.id}`);
      } else {
        const d = await res.json();
        setFormError(d.error || "Failed to create job");
        setSaving(false);
      }
    } catch { setFormError("Failed to create job"); setSaving(false); }
  }

  const filtered = jobs.filter(
    (j) =>
      j.jobNumber.toLowerCase().includes(search.toLowerCase()) ||
      j.customer.toLowerCase().includes(search.toLowerCase()) ||
      j.technician.name.toLowerCase().includes(search.toLowerCase())
  );

  if (loading || userLoading) {
    return <div className="flex justify-center items-center min-h-screen"><p className="text-slate-400 animate-pulse">Loading…</p></div>;
  }

  return (
    <main className="mx-auto px-4 sm:px-6 lg:px-8 py-8 max-w-4xl form-screen">

      {/* ─── Header ─── */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1
            className="font-bold text-white leading-none"
            style={{ fontSize: "24px", letterSpacing: "-0.02em" }}
          >
            Jobs
          </h1>
          <p className="text-xs text-slate-500 mt-1.5 uppercase tracking-widest font-medium">
            {user?.role === "TECH" ? "Your work orders" : "All work orders"}
          </p>
        </div>
        {user?.role !== "OFFICE" && (
          <button
            onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold text-white transition-all hover:brightness-110 active:scale-[0.97]"
            style={{
              background: showForm
                ? "rgba(71,85,105,0.7)"
                : "linear-gradient(135deg, #5b5ef4 0%, #818cf8 100%)",
              boxShadow: showForm ? "none" : "0 3px 14px rgba(91,94,244,0.32)",
            }}
          >
            {showForm ? "✕ Cancel" : "+ New Job"}
          </button>
        )}
      </div>

      {showForm && (
        <div
          className="rounded-2xl p-5 mb-6 space-y-4"
          style={{ background: "rgba(12,17,36,0.95)", border: "1px solid rgba(255,255,255,0.08)" }}
        >
          <h2 className="font-semibold text-sm text-slate-200">New Job</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">Job Number *</label>
              <input
                className="w-full rounded-xl text-slate-100 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                style={{ background: "rgba(15,23,42,0.6)", border: "1px solid rgba(148,163,184,0.12)" }}
                placeholder="e.g. JOB-2026-001"
                value={form.jobNumber}
                onChange={(e) => setForm({ ...form, jobNumber: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">Customer *</label>
              <input
                className="w-full rounded-xl text-slate-100 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                style={{ background: "rgba(15,23,42,0.6)", border: "1px solid rgba(148,163,184,0.12)" }}
                placeholder="Customer name"
                value={form.customer}
                onChange={(e) => setForm({ ...form, customer: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">Date</label>
              <input
                type="date"
                className="w-full rounded-xl text-slate-100 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                style={{ background: "rgba(15,23,42,0.6)", border: "1px solid rgba(148,163,184,0.12)" }}
                value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">Notes</label>
              <input
                className="w-full rounded-xl text-slate-100 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                style={{ background: "rgba(15,23,42,0.6)", border: "1px solid rgba(148,163,184,0.12)" }}
                placeholder="Optional notes"
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
              />
            </div>
          </div>
          {formError && <p className="text-red-400 text-xs">{formError}</p>}
          <div className="flex gap-2">
            <button
              onClick={handleCreate}
              disabled={saving}
              className="rounded-xl text-white px-5 py-2 text-sm font-semibold disabled:opacity-50 transition-all"
              style={{
                background: "linear-gradient(135deg, #5b5ef4 0%, #818cf8 100%)",
                boxShadow: "0 3px 14px rgba(91,94,244,0.32)",
              }}
            >
              {saving ? "Creating…" : "Create & Open Job"}
            </button>
            <button
              onClick={() => { setShowForm(false); setFormError(""); }}
              className="rounded-xl px-4 py-2 text-sm font-medium text-slate-400 hover:text-slate-200 transition-colors"
              style={{ border: "1px solid rgba(255,255,255,0.08)" }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <input
        className="w-full rounded-xl text-slate-100 px-4 py-2 text-sm mb-6 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
        style={{ background: "rgba(15,23,42,0.6)", border: "1px solid rgba(148,163,184,0.12)" }}
        placeholder="Search job #, customer, or technician…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      {filtered.length === 0 ? (
        <div
          className="rounded-2xl py-16 flex flex-col items-center text-center"
          style={{
            background: "rgba(12,17,36,0.85)",
            border: "1px solid rgba(255,255,255,0.06)",
          }}
        >
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl mb-5"
            style={{
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.07)",
            }}
          >
            🔧
          </div>
          {search ? (
            <>
              <p className="font-semibold text-slate-300 mb-1">No jobs match &ldquo;{search}&rdquo;</p>
              <p className="text-sm text-slate-500">Try a different search</p>
            </>
          ) : (
            <>
              <p className="font-semibold text-slate-200 mb-1.5">No jobs yet</p>
              <p className="text-sm text-slate-500">Create your first job to start logging parts</p>
            </>
          )}
        </div>
      ) : (
        <div
          className="rounded-2xl overflow-hidden"
          style={{ border: "1px solid rgba(255,255,255,0.06)" }}
        >
          {filtered.map((job, idx) => (
            <Link
              key={job.id}
              href={`/jobs/${job.id}`}
              className="flex items-center gap-4 px-5 py-4 transition-colors hover:bg-white/[0.03] group"
              style={{
                background: "rgba(12,17,36,0.85)",
                borderBottom: idx < filtered.length - 1 ? "1px solid rgba(255,255,255,0.05)" : "none",
              }}
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-sm font-semibold text-slate-100 group-hover:text-white transition-colors">{job.jobNumber}</span>
                  <span
                    className={`text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-md ${
                      job.status === "OPEN"
                        ? "bg-amber-500/12 text-amber-400 border border-amber-500/20"
                        : job.status === "COMPLETED"
                        ? "bg-slate-700/60 text-slate-400 border border-slate-600/30"
                        : "bg-slate-700/60 text-slate-400 border border-slate-600/30"
                    }`}
                  >
                    {job.status}
                  </span>
                </div>
                <p className="text-sm text-slate-400 truncate">{job.customer}</p>
                <p className="text-xs text-slate-600 mt-0.5">
                  {job.technician.name} · {new Date(job.date).toLocaleDateString()}
                </p>
              </div>
              <div className="shrink-0 text-right">
                <p className="text-sm font-semibold text-slate-300">{job._count.parts}</p>
                <p className="text-[10px] text-slate-600">parts</p>
              </div>
              <svg className="shrink-0 text-slate-700 group-hover:text-slate-500 transition-colors" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M9 18l6-6-6-6"/></svg>
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}
