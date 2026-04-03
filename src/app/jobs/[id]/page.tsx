"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import { useCurrentUser } from "@/hooks/useCurrentUser";

interface Item {
  id: string;
  name: string;
  manufacturer?: string | null;
  partNumber?: string | null;
  modelNumber?: string | null;
  description?: string | null;
  quantityOnHand: number;
  lastUnitCost?: number | null;
  unitOfMeasure: string;
}

interface JobPart {
  id: string;
  quantity: number;
  unitCost: number;
  notes?: string | null;
  item: { id: string; name: string; partNumber?: string | null; unitOfMeasure: string };
}

interface Job {
  id: string;
  jobNumber: string;
  customer: string;
  date: string;
  status: string;
  notes?: string | null;
  technician: { id: string; name: string };
  parts: JobPart[];
}

const STATUS_COLOR: Record<string, string> = {
  OPEN: "bg-amber-900/60 text-amber-300 border-amber-700",
  COMPLETED: "bg-teal-900/60 text-teal-300 border-teal-700",
  INVOICED: "bg-slate-700 text-slate-300 border-slate-600",
};

export default function JobDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { user } = useCurrentUser();
  const [job, setJob] = useState<Job | null>(null);
  const [loading, setLoading] = useState(true);
  const [jobError, setJobError] = useState<string | null>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [search, setSearch] = useState("");
  const [addForm, setAddForm] = useState({ itemId: "", quantity: 1, notes: "" });
  const [addError, setAddError] = useState("");
  const [adding, setAdding] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [statusUpdating, setStatusUpdating] = useState(false);

  useEffect(() => {
    fetchJob();
    fetchItems();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function fetchJob() {
    setJobError(null);
    try {
      const res = await fetch(`/api/jobs/${id}`);
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
      const res = await fetch(`/api/jobs/${id}/parts`, {
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
      await fetch(`/api/jobs/${id}/parts/${partId}`, { method: "DELETE" });
      fetchJob();
      fetchItems();
    } catch { /* ignore */ }
    setRemovingId(null);
  }

  async function handleStatusChange(status: string) {
    setStatusUpdating(true);
    try {
      await fetch(`/api/jobs/${id}`, {
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
  const canEdit = job && job.status !== "INVOICED" && (user?.role !== "TECH" || job.technician.id === user?.userId);
  const canChangeStatus = user?.role === "SUPER_ADMIN" || user?.role === "OFFICE";

  if (loading) {
    return <div className="flex justify-center items-center min-h-screen"><p className="text-slate-400 animate-pulse">Loading…</p></div>;
  }

  if (jobError) {
    return (
      <main className="container mx-auto px-3 py-4 sm:p-4 max-w-4xl form-screen">
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
    <main className="container mx-auto px-3 py-4 sm:p-4 max-w-4xl form-screen">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-5">
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
          <div className="shrink-0">
            <select
              className="rounded-xl bg-slate-800 border border-slate-600 text-slate-100 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
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
        <div className="px-4 py-3 border-b border-slate-700 flex items-center justify-between">
          <h2 className="font-bold text-slate-200">Parts Used</h2>
          <span className="text-xs text-slate-500">{job.parts.length} item{job.parts.length !== 1 ? "s" : ""}</span>
        </div>

        {job.parts.length === 0 ? (
          <div className="px-4 py-8 text-center text-slate-500 text-sm">No parts added yet</div>
        ) : (
          <div className="divide-y divide-slate-800">
            {/* Table header */}
            <div className="grid px-4 py-2 text-xs font-semibold text-slate-500 uppercase tracking-wide"
              style={{ gridTemplateColumns: "1fr auto auto auto auto" }}>
              <span>Part</span>
              <span className="text-right pr-4">Qty</span>
              {user?.role !== "TECH" && <span className="text-right pr-4">Unit Cost</span>}
              {user?.role !== "TECH" && <span className="text-right pr-4">Line Total</span>}
              <span />
            </div>
            {job.parts.map((part) => (
              <div
                key={part.id}
                className="grid items-center px-4 py-3 text-sm"
                style={{ gridTemplateColumns: "1fr auto auto auto auto" }}
              >
                <div className="min-w-0">
                  <p className="font-medium text-slate-100 truncate">{part.item.name}</p>
                  {part.item.partNumber && <p className="text-xs text-slate-500">{part.item.partNumber}</p>}
                  {part.notes && <p className="text-xs text-slate-400 italic">{part.notes}</p>}
                </div>
                <span className="text-slate-300 pr-4 text-right">
                  {part.quantity} <span className="text-slate-500 text-xs">{part.item.unitOfMeasure}</span>
                </span>
                {user?.role !== "TECH" && (
                  <span className="text-slate-300 pr-4 text-right">${(part.unitCost ?? 0).toFixed(2)}</span>
                )}
                {user?.role !== "TECH" && (
                  <span className="text-teal-300 font-semibold pr-4 text-right">
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
        {user?.role !== "TECH" && job.parts.length > 0 && (
          <div className="px-4 py-3 border-t border-slate-700 flex justify-end">
            <div className="text-right">
              <span className="text-xs text-slate-500 uppercase tracking-wide">Total Material Cost</span>
              <p className="text-2xl font-bold text-teal-300 mt-0.5">${totalMaterialCost.toFixed(2)}</p>
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
                className="w-full rounded-xl bg-slate-800 border border-slate-600 text-slate-100 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
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
                        <span className={`text-xs ${item.quantityOnHand > 0 ? "text-teal-400" : "text-red-400"}`}>
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
                  className="w-full rounded-xl bg-slate-800 border border-slate-600 text-slate-100 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                  value={addForm.quantity}
                  onChange={(e) => setAddForm({ ...addForm, quantity: parseInt(e.target.value) || 1 })}
                />
              </div>
              <div className="flex-1">
                <label className="block text-xs text-slate-400 mb-1">Notes (optional)</label>
                <input
                  className="w-full rounded-xl bg-slate-800 border border-slate-600 text-slate-100 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
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
              className="rounded-xl bg-teal-600 hover:bg-teal-500 text-white px-5 py-2.5 text-sm font-semibold disabled:opacity-40"
            >
              {adding ? "Adding…" : "Add Part to Job"}
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
