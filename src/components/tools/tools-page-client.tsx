"use client";

import { useEffect, useMemo, useState } from "react";
import { GlassBubbleCard } from "@/components/ui/glass-bubble-card";
import type { UserRole } from "@/lib/auth";
import {
  TAB_DATA_CACHE_KEYS,
  fetchJsonWithCache,
  invalidateCachedData,
  primeCachedData,
} from "@/lib/client-data-cache";

interface CheckoutUser { id: string; name: string; }
interface ActiveCheckout { id: string; user: CheckoutUser; checkedOutAt: string; }
interface ToolOwner { id: string; name: string; }

export interface Tool {
  id: string;
  name: string;
  manufacturer?: string | null;
  partNumber?: string | null;
  modelNumber?: string | null;
  supplier?: string | null;
  cost: number;
  photoUrl?: string | null;
  notes?: string | null;
  type: "SHOP" | "PERSONAL";
  owner?: ToolOwner | null;
  checkouts: ActiveCheckout[];
  createdAt: string;
}

interface ToolsPageClientProps {
  currentUserId: string;
  currentUserRole: UserRole;
  initialTools: Tool[];
}

interface ToolFormState {
  name: string;
  manufacturer: string;
  partNumber: string;
  modelNumber: string;
  supplier: string;
  cost: number;
  notes: string;
  type: "SHOP" | "PERSONAL";
}

const initialForm: ToolFormState = {
  name: "",
  manufacturer: "",
  partNumber: "",
  modelNumber: "",
  supplier: "",
  cost: 0,
  notes: "",
  type: "PERSONAL",
};

async function compressImage(file: File): Promise<string> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const MAX = 600;
        let { width, height } = img;
        if (width > MAX || height > MAX) {
          if (width > height) {
            height = Math.round((height * MAX) / width);
            width = MAX;
          } else {
            width = Math.round((width * MAX) / height);
            height = MAX;
          }
        }
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        ctx?.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL("image/jpeg", 0.75));
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  });
}

export function ToolsPageClient({ currentUserId, currentUserRole, initialTools }: ToolsPageClientProps) {
  const [tools, setTools] = useState<Tool[]>(initialTools);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState<ToolFormState>(initialForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState("");
  const [checkingOut, setCheckingOut] = useState<string | null>(null);
  const [returning, setReturning] = useState<string | null>(null);
  const [tab, setTab] = useState<"SHOP" | "PERSONAL">("SHOP");

  const isAdmin = currentUserRole === "SUPER_ADMIN" || currentUserRole === "OFFICE";

  useEffect(() => {
    primeCachedData(TAB_DATA_CACHE_KEYS.tools, initialTools);
  }, [initialTools]);

  async function loadTools(showSpinner = false, force = false) {
    if (showSpinner) {
      setLoading(true);
    }

    try {
      if (force) {
        invalidateCachedData(TAB_DATA_CACHE_KEYS.tools);
      }

      const data = await fetchJsonWithCache<Tool[]>(TAB_DATA_CACHE_KEYS.tools, "/api/tools");
      setTools(Array.isArray(data) ? data : []);
      setError("");
    } catch (err) {
      console.error(err);
      setError("Could not load tools.");
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) { setError("Tool name is required."); return; }
    setSaving(true); setError("");

    let photoUrl: string | undefined | null;
    if (photoFile) {
      try { photoUrl = await compressImage(photoFile); } catch { /* ignore */ }
    } else if (editingId) {
      photoUrl = tools.find((t) => t.id === editingId)?.photoUrl ?? null;
    }

    const payload: Record<string, unknown> = {
      name: form.name.trim(),
      manufacturer: form.manufacturer.trim() || undefined,
      partNumber: form.partNumber.trim() || undefined,
      modelNumber: form.modelNumber.trim() || undefined,
      supplier: form.supplier.trim() || undefined,
      cost: Number(form.cost),
      notes: form.notes.trim() || undefined,
      photoUrl: photoUrl ?? null,
      type: form.type,
    };

    try {
      const res = await fetch(editingId ? `/api/tools/${editingId}` : "/api/tools", {
        method: editingId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error || "Failed to save tool");
      }

      setForm({ ...initialForm, type: form.type });
      setEditingId(null);
      setPhotoFile(null);
      setPhotoPreview("");
      await loadTools(false, true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save tool.");
    } finally {
      setSaving(false);
    }
  }

  function startEdit(tool: Tool) {
    setForm({
      name: tool.name,
      manufacturer: tool.manufacturer || "",
      partNumber: tool.partNumber || "",
      modelNumber: tool.modelNumber || "",
      supplier: tool.supplier || "",
      cost: tool.cost,
      notes: tool.notes || "",
      type: tool.type,
    });
    setEditingId(tool.id);
    setPhotoFile(null);
    setPhotoPreview(tool.photoUrl || "");
    setError("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function cancelEdit() {
    setEditingId(null);
    setForm(initialForm);
    setPhotoFile(null);
    setPhotoPreview("");
    setError("");
  }

  async function deleteTool(id: string) {
    if (!confirm("Delete this tool?")) return;
    try {
      const res = await fetch(`/api/tools/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete tool");
      if (editingId === id) cancelEdit();
      await loadTools(false, true);
    } catch (err) {
      setError("Failed to delete tool.");
    }
  }

  async function handleCheckout(toolId: string) {
    setCheckingOut(toolId);
    try {
      const res = await fetch(`/api/tools/${toolId}/checkout`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{}",
      });
      if (!res.ok) {
        const d = await res.json().catch(() => null);
        setError(d?.error || "Could not sign out tool");
      } else {
        await loadTools(false, true);
      }
    } catch { setError("Could not sign out tool"); }
    setCheckingOut(null);
  }

  async function handleReturn(toolId: string) {
    setReturning(toolId);
    try {
      const res = await fetch(`/api/tools/${toolId}/return`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{}",
      });
      if (!res.ok) {
        const d = await res.json().catch(() => null);
        setError(d?.error || "Could not return tool");
      } else {
        await loadTools(false, true);
      }
    } catch { setError("Could not return tool"); }
    setReturning(null);
  }

  const shopTools = tools.filter((t) => t.type === "SHOP");
  const personalTools = tools.filter((t) => t.type === "PERSONAL");
  const displaying = tab === "SHOP" ? shopTools : personalTools;
  const shopValue = useMemo(() => shopTools.reduce((s, t) => s + (t.cost || 0), 0), [shopTools]);

  return (
    <main className="mx-auto w-full max-w-[1280px] px-4 sm:px-6 lg:px-8 py-8 form-screen">
      <section className="page-frame p-4 sm:p-6 mb-5">
        <h1 className="text-3xl sm:text-4xl font-bold">Tool Tracking</h1>
        <p className="text-slate-400 mt-1 text-sm sm:text-base">
          Shop tools everyone can sign out. Personal tools stay with their owner.
        </p>
        <div className="mt-4 grid grid-cols-3 gap-2 sm:gap-3">
          <div className="rounded-xl border border-slate-700/70 bg-slate-900/70 p-3">
            <p className="text-xs text-slate-400">Shop Tools</p>
            <p className="text-xl font-bold">{shopTools.length}</p>
          </div>
          <div className="rounded-xl border border-slate-700/70 bg-slate-900/70 p-3">
            <p className="text-xs text-slate-400">Personal Tools</p>
            <p className="text-xl font-bold">{personalTools.length}</p>
          </div>
          {isAdmin && (
            <div className="rounded-xl border border-slate-700/70 bg-slate-900/70 p-3">
              <p className="text-xs text-slate-400">Shop Value</p>
              <p className="text-xl font-bold">${shopValue.toFixed(2)}</p>
            </div>
          )}
        </div>
      </section>

      {error && (
        <GlassBubbleCard className="mb-4 border border-red-400/35 bg-red-500/10">
          <p className="text-sm text-red-200">{error}</p>
        </GlassBubbleCard>
      )}

      {/* Add / Edit form */}
      <GlassBubbleCard className="mb-6">
        <h2 className="text-xl font-semibold mb-3">{editingId ? "Edit Tool" : "Add Tool"}</h2>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input
              type="text"
              placeholder="Tool Name *"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg"
              required
            />
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">Type</label>
              <select
                value={form.type}
                onChange={(e) => setForm({ ...form, type: e.target.value as "SHOP" | "PERSONAL" })}
                className="w-full px-3 py-2 border rounded-lg bg-slate-800 text-slate-100"
              >
                <option value="PERSONAL">Personal (my tools)</option>
                {isAdmin && <option value="SHOP">Shop (shared)</option>}
              </select>
            </div>
            <input
              type="text"
              placeholder="Manufacturer (optional)"
              value={form.manufacturer}
              onChange={(e) => setForm({ ...form, manufacturer: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg"
            />
            <input
              type="text"
              placeholder="Part Number (optional)"
              value={form.partNumber}
              onChange={(e) => setForm({ ...form, partNumber: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg"
            />
            {isAdmin && (
              <input
                type="number"
                min={0}
                step="0.01"
                placeholder="Cost (optional)"
                value={form.cost}
                onChange={(e) =>
                  setForm({ ...form, cost: isNaN(e.currentTarget.valueAsNumber) ? 0 : e.currentTarget.valueAsNumber })
                }
                className="w-full px-3 py-2 border rounded-lg"
              />
            )}
          </div>

          {/* Photo upload */}
          <div className="rounded-xl border border-slate-700/70 bg-slate-900/60 p-3">
            <p className="text-sm font-semibold text-slate-200 mb-2">📷 Tool Photo (optional)</p>
            <div className="flex flex-wrap gap-2">
              <label className="flex items-center gap-2 px-3 py-2 rounded-lg text-white text-sm font-semibold cursor-pointer select-none" style={{ background: "linear-gradient(135deg, #5b5ef4 0%, #818cf8 100%)" }}>
                📷 Take Photo
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="sr-only"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) { setPhotoFile(file); setPhotoPreview(URL.createObjectURL(file)); }
                    e.target.value = "";
                  }}
                />
              </label>
              <label className="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-white text-sm font-semibold cursor-pointer select-none">
                🖼 Upload Photo
                <input
                  type="file"
                  accept="image/*"
                  className="sr-only"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) { setPhotoFile(file); setPhotoPreview(URL.createObjectURL(file)); }
                    e.target.value = "";
                  }}
                />
              </label>
              {photoPreview && (
                <button type="button" onClick={() => { setPhotoFile(null); setPhotoPreview(""); }}
                  className="px-3 py-2 rounded-lg bg-red-700 hover:bg-red-600 text-white text-sm">Remove</button>
              )}
            </div>
            {photoPreview && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={photoPreview} alt="Preview" className="mt-3 rounded-lg max-h-40 object-contain" />
            )}
          </div>

          <textarea
            placeholder="Notes (optional)"
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
            className="w-full px-3 py-2 border rounded-lg"
            rows={2}
          />

          <div className="flex flex-wrap gap-2">
            <button type="submit" disabled={saving}
              className="px-4 py-2 rounded-lg text-white font-semibold disabled:bg-slate-600" style={{ background: "linear-gradient(135deg, #5b5ef4 0%, #818cf8 100%)" }}>
              {saving ? "Saving..." : editingId ? "Save Changes" : "Add Tool"}
            </button>
            {editingId && (
              <button type="button" onClick={cancelEdit}
                className="px-4 py-2 rounded-lg soft-button">Cancel Edit</button>
            )}
          </div>
        </form>
      </GlassBubbleCard>

      {/* Tabs */}
      <div className="flex gap-2 mb-4 flex-wrap">
        {(["SHOP", "PERSONAL"] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={`rounded-xl px-4 py-2 text-sm font-semibold transition-colors ${tab === t ? "bg-indigo-700 text-white" : "bg-slate-800 text-slate-400 hover:text-slate-200"}`}>
            {t === "SHOP" ? `🏭 Shop (${shopTools.length})` : `👤 Personal (${personalTools.length})`}
          </button>
        ))}
      </div>

      {/* Tool list */}
      {loading ? (
        <GlassBubbleCard><p className="text-slate-400">Loading tools...</p></GlassBubbleCard>
      ) : displaying.length === 0 ? (
        <GlassBubbleCard>
          <p className="text-slate-400">
            No {tab === "SHOP" ? "shop" : "personal"} tools yet. Add one above.
          </p>
        </GlassBubbleCard>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {displaying.map((tool) => {
            const activeCheckout = tool.checkouts?.[0];
            const isCheckedOutByMe = activeCheckout?.user.id === currentUserId;
            const canEdit = isAdmin || (tool.type === "PERSONAL" && tool.owner?.id === currentUserId);

            return (
              <GlassBubbleCard key={tool.id} className="border border-slate-700/70 bg-slate-900/60">
                {tool.photoUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={tool.photoUrl} alt={tool.name}
                    className="w-full h-36 object-cover rounded-lg mb-3" />
                )}
                <div className="flex justify-between items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-semibold text-slate-100">{tool.name}</h3>
                    {tool.manufacturer && <p className="text-xs text-slate-400 mt-0.5">{tool.manufacturer}</p>}
                    {tool.owner && <p className="text-xs text-indigo-300 mt-0.5">👤 {tool.owner.name}</p>}
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    {isAdmin && tool.cost > 0 && (
                      <span className="text-sm font-bold text-slate-100">${tool.cost.toFixed(2)}</span>
                    )}
                    {/* Status badge for shop tools */}
                    {tool.type === "SHOP" && (
                      <span className={`text-xs px-2 py-0.5 rounded-full ${activeCheckout ? "bg-amber-900/60 text-amber-300" : "bg-slate-700/60 text-slate-300"}`}>
                        {activeCheckout ? `With ${activeCheckout.user.name}` : "Available"}
                      </span>
                    )}
                  </div>
                </div>

                <div className="mt-2 text-sm space-y-0.5 text-slate-300">
                  {tool.partNumber && <p>Part: {tool.partNumber}</p>}
                  {tool.modelNumber && <p>Model: {tool.modelNumber}</p>}
                  {tool.supplier && <p>Supplier: {tool.supplier}</p>}
                  {tool.notes && <p className="text-slate-400 italic">{tool.notes}</p>}
                </div>

                <div className="mt-3 flex flex-wrap gap-2">
                  {/* Sign-out for shop tools */}
                  {tool.type === "SHOP" && !activeCheckout && (
                    <button onClick={() => handleCheckout(tool.id)} disabled={checkingOut === tool.id}
                      className="px-3 py-1.5 rounded-lg text-white text-sm font-semibold" style={{ background: "linear-gradient(135deg, #5b5ef4 0%, #818cf8 100%)" }}>
                      {checkingOut === tool.id ? "..." : "Sign Out"}
                    </button>
                  )}
                  {/* Return for shop tools */}
                  {tool.type === "SHOP" && activeCheckout && (isCheckedOutByMe || isAdmin) && (
                    <button onClick={() => handleReturn(tool.id)} disabled={returning === tool.id}
                      className="px-3 py-1.5 rounded-lg bg-amber-700 hover:bg-amber-600 text-white text-sm font-semibold">
                      {returning === tool.id ? "..." : "Return"}
                    </button>
                  )}
                  {/* Edit/Delete */}
                  {canEdit && (
                    <>
                      <button onClick={() => startEdit(tool)}
                        className="px-3 py-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-white text-sm font-semibold">
                        Edit
                      </button>
                      <button onClick={() => deleteTool(tool.id)}
                        className="px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 text-white text-sm font-semibold">
                        Delete
                      </button>
                    </>
                  )}
                </div>
              </GlassBubbleCard>
            );
          })}
        </div>
      )}
    </main>
  );
}

export default ToolsPageClient;

