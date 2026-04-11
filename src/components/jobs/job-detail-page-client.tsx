"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export interface JobDetailItem {
  id: string;
  name: string;
  manufacturer?: string | null;
  partNumber?: string | null;
  modelNumber?: string | null;
  description?: string | null;
  quantityOnHand: number;
  unitOfMeasure: string;
}

export interface JobPart {
  id: string;
  quantity: number;
  unitCost: number;
  notes?: string | null;
  item: { id: string; name: string; partNumber?: string | null; unitOfMeasure: string };
}

export interface JobDetail {
  id: string;
  jobNumber: string;
  customer: string;
  date: string;
  status: string;
  notes?: string | null;
  technician: { id: string; name: string };
  parts: JobPart[];
}

interface JobDetailPageClientProps {
  currentUserId: string;
  canEditJob: boolean;
  canChangeStatus: boolean;
  showFinancials: boolean;
  jobId: string;
  initialJob: JobDetail | null;
  initialItems: JobDetailItem[];
  initialJobError: string | null;
}

const STATUS_COLOR: Record<string, string> = {
  OPEN: "bg-amber-900/60 text-amber-300 border-amber-700",
  COMPLETED: "bg-slate-700/60 text-slate-300 border-slate-600",
  INVOICED: "bg-slate-700 text-slate-300 border-slate-600",
};

export function JobDetailPageClient({
  currentUserId,
  canEditJob,
  canChangeStatus,
  showFinancials,
  jobId,
  initialJob,
  initialItems,
  initialJobError,
}: JobDetailPageClientProps) {
  const router = useRouter();
  const [job, setJob] = useState<JobDetail | null>(initialJob);
  const [loading, setLoading] = useState(false);
  const [jobError, setJobError] = useState<string | null>(initialJobError);
  const [items, setItems] = useState<JobDetailItem[]>(initialItems);
  const [search, setSearch] = useState("");
  const [addForm, setAddForm] = useState({ itemId: "", quantity: 1, notes: "" });
  const [addError, setAddError] = useState("");
  const [adding, setAdding] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [statusUpdating, setStatusUpdating] = useState(false);

  async function fetchJob() {
    setJobError(null);
    try {
      const res = await fetch(`/api/jobs/${jobId}`);
      if (res.status === 404) {
        setJobError("Job not found. It may have been deleted or the link is incorrect.");
        setLoading(false);
        return;
      }
      if (res.status === 403) {
        setJobError("You don't have permission to view this job.");
        setLoading(false);
        return;
      }
      if (!res.ok) {
        setJobError("Failed to load job. Please try again.");
        setLoading(false);
        return;
      }
      setJob(await res.json());
    } catch {
      setJobError("Failed to load job. Please check your connection.");
    } finally {
      setLoading(false);
    }
  }

  async function fetchItems() {
    try {
      const res = await fetch("/api/items");
      const data = await res.json();
      setItems(Array.isArray(data) ? data : []);
    } catch { /* ignore */ }
  }

  async function handleAddPart() {
    if (!addForm.itemId) { setAddError("Select an item"); return; }
    if (addForm.quantity < 1) { setAddError("Quantity must be at least 1"); return; }
    setAdding(true); setAddError("");
    try {
      const res = await fetch(`/api/jobs/${jobId}/parts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(addForm),
      });
      if (res.ok) {
        setAddForm({ itemId: "", quantity: 1, notes: "" });
        setSearch("");
        fetchJob();
        fetchItems();
      } else {
        const d = await res.json();
        setAddError(d.error || "Failed to add part");
      }
    } catch { setAddError("Failed to add part"); }
    setAdding(false);
  }

  async function handleRemovePart(partId: string) {
    if (!confirm("Remove this part? Stock will be restored.")) return;
    setRemovingId(partId);
    try {
      await fetch(`/api/jobs/${jobId}/parts/${partId}`, { method: "DELETE" });
      fetchJob();
      fetchItems();
    } catch { /* ignore */ }
    setRemovingId(null);
  }

  async function handleStatusChange(status: string) {
    setStatusUpdating(true);
    try {
      await fetch(`/api/jobs/${jobId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      fetchJob();
    } catch { /* ignore */ }
    setStatusUpdating(false);
  }

  const filteredItems = items.filter(
    (item) =>
      item.name.toLowerCase().includes(search.toLowerCase()) ||
      (item.partNumber ?? "").toLowerCase().includes(search.toLowerCase()) ||
      (item.manufacturer ?? "").toLowerCase().includes(search.toLowerCase()) ||
      (item.modelNumber ?? "").toLowerCase().includes(search.toLowerCase()) ||
      (item.description ?? "").toLowerCase().includes(search.toLowerCase())
  ).slice(0, 20);

  const totalMaterialCost = job?.parts.reduce((sum, p) => sum + p.quantity * (p.unitCost ?? 0), 0) ?? 0;
  const canEdit = Boolean(job) && canEditJob;
  const partsGridTemplate = showFinancials ? "minmax(0,1fr) auto auto auto auto" : "minmax(0,1fr) auto auto";

  if (loading) {
    return (
      <main className="mx-auto w-full max-w-[1280px] px-4 sm:px-6 lg:px-8 py-8 form-screen">
        <p className="text-sm text-slate-400 animate-pulse">Loading job...</p>
      </main>
    );
  }

  if (jobError) {
    return (
      <main className="mx-auto w-full max-w-[1280px] px-4 sm:px-6 lg:px-8 py-8 form-screen">
        <button onClick={() => router.push("/jobs")} className="text-sm text-slate-500 hover:text-slate-200 mb-4 flex items-center gap-1">← Jobs</button>
        <div className="rounded-2xl border border-red-700/50 bg-red-900/20 p-6 text-center">
          <p className="text-2xl mb-3">⚠️</p>
          <p className="font-semibold text-red-300">{jobError}</p>
          <button
            onClick={() => { setLoading(true); fetchJob(); }}
            className="mt-4 rounded-xl bg-slate-700 hover:bg-slate-600 text-slate-200 px-4 py-2 text-sm"
          >
            Try Again
          </button>
        </div>
      </main>
    );
  }

  if (!job) return null;

  return (
    <main className="mx-auto w-full max-w-[1280px] px-4 sm:px-6 lg:px-8 py-8 form-screen">
      {/* Header */}
      <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <button onClick={() => router.push("/jobs")} className="text-sm text-slate-500 hover:text-slate-200 mb-2 flex items-center gap-1">← Jobs</button>
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-2xl font-bold text-slate-50">{job.jobNumber}</h1>
            <span className={`text-xs px-2.5 py-1 rounded-full border ${STATUS_COLOR[job.status] ?? "bg-slate-700 text-slate-300"}`}>
              {job.status}
            </span>
          </div>
          <p className="text-slate-300 mt-1 font-medium">{job.customer}</p>
          <p className="text-slate-500 text-sm">{job.technician.name} · {new Date(job.date).toLocaleDateString()}</p>
          {job.notes && <p className="text-slate-400 text-sm mt-1 italic">{job.notes}</p>}
        </div>
        {canChangeStatus && (
          <div className="w-full shrink-0 sm:w-auto">
            <select
              className="w-full rounded-xl text-slate-100 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 sm:w-auto"
              style={{ background: "rgba(15,23,42,0.6)", border: "1px solid rgba(148,163,184,0.12)" }}
              value={job.status}
              disabled={statusUpdating}
              onChange={(e) => handleStatusChange(e.target.value)}
            >
              <option value="OPEN">Open</option>
              <option value="COMPLETED">Completed</option>
              <option value="INVOICED">Invoiced</option>
            </select>
          </div>
        )}
      </div>

      {/* Parts table */}
      <div className="bg-slate-900 border border-slate-700 rounded-2xl mb-5 overflow-hidden">
        <div className="flex flex-col gap-1 border-b border-slate-700 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="font-bold text-slate-200">Parts Used</h2>
          <span className="text-xs text-slate-500">{job.parts.length} item{job.parts.length !== 1 ? "s" : ""}</span>
        </div>

        {job.parts.length === 0 ? (
          <div className="px-4 py-8 text-center text-slate-500 text-sm">No parts added yet</div>
        ) : (
          <div className="divide-y divide-slate-800">
            <div className="space-y-3 p-4 md:hidden">
              {job.parts.map((part) => (
                <div key={part.id} className="rounded-xl border border-slate-700/70 bg-slate-950/40 p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-slate-100">{part.item.name}</p>
                      {part.item.partNumber && <p className="mt-1 text-xs text-slate-500">{part.item.partNumber}</p>}
                      {part.notes && <p className="mt-1 text-xs italic text-slate-400">{part.notes}</p>}
                    </div>
                    {canEdit ? (
                      <button
                        onClick={() => handleRemovePart(part.id)}
                        disabled={removingId === part.id}
                        className="text-xs text-red-400 hover:text-red-300 disabled:opacity-50"
                      >
                        {removingId === part.id ? "..." : "Remove"}
                      </button>
                    ) : null}
                  </div>
                  <div className={`mt-3 grid gap-3 text-sm ${showFinancials ? "grid-cols-2 sm:grid-cols-3" : "grid-cols-2"}`}>
                    <div>
                      <p className="text-[10px] uppercase tracking-wider text-slate-500">Qty</p>
                      <p className="mt-0.5 text-slate-200">{part.quantity} <span className="text-xs text-slate-500">{part.item.unitOfMeasure}</span></p>
                    </div>
                    {showFinancials && (
                      <div>
                        <p className="text-[10px] uppercase tracking-wider text-slate-500">Unit Cost</p>
                        <p className="mt-0.5 text-slate-200">${(part.unitCost ?? 0).toFixed(2)}</p>
                      </div>
                    )}
                    {showFinancials && (
                      <div>
                        <p className="text-[10px] uppercase tracking-wider text-slate-500">Line Total</p>
                        <p className="mt-0.5 font-semibold text-slate-100">${(part.quantity * (part.unitCost ?? 0)).toFixed(2)}</p>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
            {/* Table header */}
            <div className="hidden grid px-4 py-2 text-xs font-semibold uppercase tracking-wide text-slate-500 md:grid"
              style={{ gridTemplateColumns: partsGridTemplate }}>
              <span>Part</span>
              <span className="text-right pr-4">Qty</span>
              {showFinancials && <span className="text-right pr-4">Unit Cost</span>}
              {showFinancials && <span className="text-right pr-4">Line Total</span>}
              <span />
            </div>
            {job.parts.map((part) => (
              <div
                key={part.id}
                className="hidden items-center px-4 py-3 text-sm md:grid"
                style={{ gridTemplateColumns: partsGridTemplate }}
              >
                <div className="min-w-0">
                  <p className="font-medium text-slate-100 truncate">{part.item.name}</p>
                  {part.item.partNumber && <p className="text-xs text-slate-500">{part.item.partNumber}</p>}
                  {part.notes && <p className="text-xs text-slate-400 italic">{part.notes}</p>}
                </div>
                <span className="text-slate-300 pr-4 text-right">
                  {part.quantity} <span className="text-slate-500 text-xs">{part.item.unitOfMeasure}</span>
                </span>
                {showFinancials && (
                  <span className="text-slate-300 pr-4 text-right">${(part.unitCost ?? 0).toFixed(2)}</span>
                )}
                {showFinancials && (
                  <span className="text-slate-200 font-semibold pr-4 text-right">
                    ${(part.quantity * (part.unitCost ?? 0)).toFixed(2)}
                  </span>
                )}
                {canEdit ? (
                  <button
                    onClick={() => handleRemovePart(part.id)}
                    disabled={removingId === part.id}
                    className="text-xs text-red-400 hover:text-red-300 disabled:opacity-50"
                  >
                    {removingId === part.id ? "…" : "✕"}
                  </button>
                ) : <span />}
              </div>
            ))}
          </div>
        )}

        {/* Total */}
        {showFinancials && job.parts.length > 0 && (
          <div className="px-4 py-3 border-t border-slate-700 flex justify-end">
            <div className="text-right">
              <span className="text-xs text-slate-500 uppercase tracking-wide">Total Material Cost</span>
              <p className="text-2xl font-bold text-slate-100 mt-0.5">${totalMaterialCost.toFixed(2)}</p>
            </div>
          </div>
        )}
      </div>

      {/* Add part section */}
      {canEdit && (
        <div className="bg-slate-900 border border-slate-700 rounded-2xl p-4">
          <h2 className="font-bold text-slate-200 mb-3">Add Part</h2>
          <div className="space-y-3">
            <div>
              <input
                className="w-full rounded-xl text-slate-100 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                style={{ background: "rgba(15,23,42,0.6)", border: "1px solid rgba(148,163,184,0.12)" }}
                placeholder="Search by name, part #, manufacturer, model, or description…"
                value={search}
                onChange={(e) => { setSearch(e.target.value); setAddForm({ ...addForm, itemId: "" }); }}
              />
              {search && !addForm.itemId && (
                <div className="mt-1 border border-slate-700 rounded-xl bg-slate-800 max-h-48 overflow-y-auto">
                  {filteredItems.length === 0 ? (
                    <p className="px-3 py-2 text-xs text-slate-500">No parts found</p>
                  ) : filteredItems.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => { setAddForm({ ...addForm, itemId: item.id }); setSearch(item.name + (item.partNumber ? ` (${item.partNumber})` : "")); }}
                      className="w-full text-left px-3 py-2.5 hover:bg-slate-700 transition-colors border-b border-slate-700/50 last:border-0"
                    >
                      <span className="text-sm text-slate-100 font-medium">{item.name}</span>
                      {item.manufacturer && <span className="text-xs text-slate-400 ml-2">{item.manufacturer}</span>}
                      {item.partNumber && <span className="text-xs text-slate-500 ml-2">#{item.partNumber}</span>}
                      {item.modelNumber && <span className="text-xs text-slate-500 ml-1">· {item.modelNumber}</span>}
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className={`text-xs ${item.quantityOnHand > 0 ? "text-slate-300" : "text-red-400"}`}>
                          In stock: {item.quantityOnHand} {item.unitOfMeasure}
                        </span>
                        {item.description && (
                          <span className="text-xs text-slate-500 truncate">{item.description}</span>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className="flex gap-3">
              <div className="w-28">
                <label className="block text-xs text-slate-400 mb-1">Quantity</label>
                <input
                  type="number"
                  min="1"
                  className="w-full rounded-xl text-slate-100 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                  style={{ background: "rgba(15,23,42,0.6)", border: "1px solid rgba(148,163,184,0.12)" }}
                  value={addForm.quantity}
                  onChange={(e) => setAddForm({ ...addForm, quantity: parseInt(e.target.value) || 1 })}
                />
              </div>
              <div className="flex-1">
                <label className="block text-xs text-slate-400 mb-1">Notes (optional)</label>
                <input
                  className="w-full rounded-xl text-slate-100 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                  style={{ background: "rgba(15,23,42,0.6)", border: "1px solid rgba(148,163,184,0.12)" }}
                  placeholder="e.g. replaced bearing"
                  value={addForm.notes}
                  onChange={(e) => setAddForm({ ...addForm, notes: e.target.value })}
                />
              </div>
            </div>
            {addError && <p className="text-red-400 text-xs">{addError}</p>}
            <button
              onClick={handleAddPart}
              disabled={adding || !addForm.itemId}
              className="rounded-xl text-white px-5 py-2.5 text-sm font-semibold disabled:opacity-40 transition-all hover:brightness-110"
              style={{
                background: "linear-gradient(135deg, #5b5ef4 0%, #818cf8 100%)",
                boxShadow: "0 3px 14px rgba(91,94,244,0.32)",
              }}
            >
              {adding ? "Adding…" : "Add Part to Job"}
            </button>
          </div>
        </div>
      )}
    </main>
  );
}

export default JobDetailPageClient;
