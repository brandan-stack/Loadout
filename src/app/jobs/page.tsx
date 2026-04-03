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

const STATUS_COLOR: Record<string, string> = {
  OPEN: "bg-amber-900/60 text-amber-300",
  COMPLETED: "bg-teal-900/60 text-teal-300",
  INVOICED: "bg-slate-700 text-slate-300",
};

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
    <main className="container mx-auto px-3 py-4 sm:p-4 max-w-4xl form-screen">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-3xl font-bold">Jobs</h1>
          <p className="text-slate-500 text-sm mt-1">
            {user?.role === "TECH" ? "Your work orders" : "All work orders"}
          </p>
        </div>
        {user?.role !== "OFFICE" && (
          <button
            onClick={() => setShowForm(!showForm)}
            className="rounded-xl bg-teal-700 hover:bg-teal-600 text-white px-4 py-2 text-sm font-semibold"
          >
            + New Job
          </button>
        )}
      </div>

      {showForm && (
        <div className="bg-slate-900 border border-slate-700 rounded-2xl p-5 mb-5 space-y-4">
          <h2 className="font-bold text-slate-200">New Job</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">Job Number *</label>
              <input
                className="w-full rounded-xl bg-slate-800 border border-slate-600 text-slate-100 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                placeholder="e.g. JOB-2026-001"
                value={form.jobNumber}
                onChange={(e) => setForm({ ...form, jobNumber: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">Customer *</label>
              <input
                className="w-full rounded-xl bg-slate-800 border border-slate-600 text-slate-100 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                placeholder="Customer name"
                value={form.customer}
                onChange={(e) => setForm({ ...form, customer: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">Date</label>
              <input
                type="date"
                className="w-full rounded-xl bg-slate-800 border border-slate-600 text-slate-100 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">Notes</label>
              <input
                className="w-full rounded-xl bg-slate-800 border border-slate-600 text-slate-100 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
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
              className="rounded-xl bg-teal-600 hover:bg-teal-500 text-white px-5 py-2 text-sm font-semibold disabled:opacity-50"
            >
              {saving ? "Creating…" : "Create & Open Job"}
            </button>
            <button
              onClick={() => { setShowForm(false); setFormError(""); }}
              className="rounded-xl bg-slate-700 hover:bg-slate-600 text-slate-200 px-4 py-2 text-sm"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <input
        className="w-full rounded-xl bg-slate-800 border border-slate-700 text-slate-100 px-4 py-2.5 text-sm mb-4 focus:outline-none focus:ring-2 focus:ring-teal-500"
        placeholder="Search job #, customer, or technician…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      {filtered.length === 0 ? (
        <div className="text-center py-16 text-slate-500">
          <p className="text-4xl mb-3">🔧</p>
          <p className="font-semibold">No jobs yet</p>
          <p className="text-sm mt-1">Create your first job to start logging parts</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((job) => (
            <Link
              key={job.id}
              href={`/jobs/${job.id}`}
              className="flex items-center justify-between bg-slate-900 border border-slate-700 hover:border-teal-600 rounded-2xl px-4 py-4 transition-colors group"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-bold text-slate-100 group-hover:text-teal-300 text-sm">{job.jobNumber}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_COLOR[job.status] ?? "bg-slate-700 text-slate-300"}`}>
                    {job.status}
                  </span>
                </div>
                <p className="text-sm text-slate-300 truncate">{job.customer}</p>
                <p className="text-xs text-slate-500 mt-0.5">
                  {job.technician.name} · {new Date(job.date).toLocaleDateString()}
                </p>
              </div>
              <div className="text-right ml-4 shrink-0">
                <p className="text-sm font-semibold text-slate-300">{job._count.parts} parts</p>
                <p className="text-xs text-slate-500 mt-0.5">→</p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}
