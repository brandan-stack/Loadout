"use client";

import { useEffect, useMemo, useState } from "react";
import { GlassBubbleCard } from "@/components/ui/glass-bubble-card";

interface Tool {
  id: string;
  name: string;
  manufacturer?: string | null;
  partNumber?: string | null;
  modelNumber?: string | null;
  supplier?: string | null;
  cost: number;
  photoUrl?: string | null;
  notes?: string | null;
  createdAt: string;
}

interface ToolFormState {
  name: string;
  manufacturer: string;
  partNumber: string;
  modelNumber: string;
  supplier: string;
  cost: number;
  notes: string;
}

const initialForm: ToolFormState = {
  name: "",
  manufacturer: "",
  partNumber: "",
  modelNumber: "",
  supplier: "",
  cost: 0,
  notes: "",
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

export default function ToolsPage() {
  const [tools, setTools] = useState<Tool[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState<ToolFormState>(initialForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState("");

  const totalCost = useMemo(
    () => tools.reduce((sum, tool) => sum + (Number.isFinite(tool.cost) ? tool.cost : 0), 0),
    [tools]
  );

  useEffect(() => {
    loadTools();
  }, []);

  async function loadTools() {
    setLoading(true);
    try {
      const res = await fetch("/api/tools");
      if (!res.ok) throw new Error("Failed to load tools");
      const data = await res.json();
      setTools(Array.isArray(data) ? data : []);
      setError("");
    } catch (err) {
      console.error(err);
      setError("Could not load tools.");
    } finally {
      setLoading(false);
    }
  }

  function validateForm() {
    if (!form.name.trim()) return "Tool name is required.";
    if (!Number.isFinite(form.cost) || form.cost < 0) return "Cost must be 0 or greater.";
    return "";
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    setSaving(true);
    setError("");

    let photoUrl: string | undefined | null;
    if (photoFile) {
      try {
        photoUrl = await compressImage(photoFile);
      } catch {
        // ignore compression errors, proceed without photo
      }
    } else if (editingId) {
      const existing = tools.find((t) => t.id === editingId);
      photoUrl = existing?.photoUrl ?? null;
    }

    const payload = {
      name: form.name.trim(),
      manufacturer: form.manufacturer.trim() || undefined,
      partNumber: form.partNumber.trim() || undefined,
      modelNumber: form.modelNumber.trim() || undefined,
      supplier: form.supplier.trim() || undefined,
      cost: Number(form.cost),
      notes: form.notes.trim() || undefined,
      photoUrl: photoUrl ?? null,
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

      setForm(initialForm);
      setEditingId(null);
      setPhotoFile(null);
      setPhotoPreview("");
      await loadTools();
    } catch (err) {
      console.error(err);
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
    });
    setEditingId(tool.id);
    setPhotoFile(null);
    setPhotoPreview(tool.photoUrl || "");
    setError("");
  }

  function cancelEdit() {
    setEditingId(null);
    setForm(initialForm);
    setPhotoFile(null);
    setPhotoPreview("");
    setError("");
  }

  async function deleteTool(id: string) {
    try {
      const res = await fetch(`/api/tools/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete tool");
      if (editingId === id) cancelEdit();
      await loadTools();
    } catch (err) {
      console.error(err);
      setError("Failed to delete tool.");
    }
  }

  return (
    <main className="container mx-auto px-3 py-4 sm:p-4 max-w-5xl form-screen">
      <section className="page-frame p-4 sm:p-6 mb-5">
        <h1 className="text-3xl sm:text-4xl font-bold">Tool Tracking</h1>
        <p className="text-slate-400 mt-2 text-sm sm:text-base">
          Keep track of tools, suppliers, and cost. Add tools and edit them anytime.
        </p>
        <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 gap-2">
          <div className="rounded-xl border border-slate-700/70 bg-slate-900/70 p-3">
            <p className="text-xs text-slate-400">Tools</p>
            <p className="text-xl font-bold">{tools.length}</p>
          </div>
          <div className="rounded-xl border border-slate-700/70 bg-slate-900/70 p-3">
            <p className="text-xs text-slate-400">Total Cost</p>
            <p className="text-xl font-bold">${totalCost.toFixed(2)}</p>
          </div>
          <div className="rounded-xl border border-slate-700/70 bg-slate-900/70 p-3 col-span-2 sm:col-span-1">
            <p className="text-xs text-slate-400">Mode</p>
            <p className="text-xl font-bold">{editingId ? "Editing" : "Adding"}</p>
          </div>
        </div>
      </section>

      {error && (
        <GlassBubbleCard className="mb-4 border border-red-400/35 bg-red-500/10">
          <p className="text-sm text-red-200">{error}</p>
        </GlassBubbleCard>
      )}

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
            <input
              type="text"
              placeholder="Model Number (optional)"
              value={form.modelNumber}
              onChange={(e) => setForm({ ...form, modelNumber: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg"
            />
            <input
              type="text"
              placeholder="Supplier (optional)"
              value={form.supplier}
              onChange={(e) => setForm({ ...form, supplier: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg"
            />
            <input
              type="number"
              min={0}
              step="0.01"
              placeholder="Cost (optional; defaults to 0)"
              value={form.cost}
              onChange={(e) =>
                setForm({
                  ...form,
                  cost: Number.isNaN(e.currentTarget.valueAsNumber)
                    ? 0
                    : e.currentTarget.valueAsNumber,
                })
              }
              className="w-full px-3 py-2 border rounded-lg"
            />
          </div>

          {/* Photo upload */}
          <div className="rounded-xl border border-slate-700/70 bg-slate-900/60 p-3">
            <p className="text-sm font-semibold text-slate-200 mb-2">📷 Tool Photo (optional)</p>
            <div className="flex flex-wrap gap-2">
              <label className="flex items-center gap-2 px-3 py-2 rounded-lg bg-cyan-700 hover:bg-cyan-600 text-white text-sm font-semibold cursor-pointer select-none">
                📷 Take Photo
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="sr-only"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      setPhotoFile(file);
                      setPhotoPreview(URL.createObjectURL(file));
                    }
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
                    if (file) {
                      setPhotoFile(file);
                      setPhotoPreview(URL.createObjectURL(file));
                    }
                    e.target.value = "";
                  }}
                />
              </label>
              {photoPreview && (
                <button
                  type="button"
                  onClick={() => { setPhotoFile(null); setPhotoPreview(""); }}
                  className="px-3 py-2 rounded-lg bg-red-700 hover:bg-red-600 text-white text-sm"
                >
                  Remove
                </button>
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
            rows={3}
          />

          <div className="flex flex-wrap gap-2">
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-semibold disabled:bg-slate-600"
            >
              {saving ? "Saving..." : editingId ? "Save Changes" : "Add Tool"}
            </button>
            {editingId && (
              <button
                type="button"
                onClick={cancelEdit}
                className="px-4 py-2 rounded-lg soft-button"
              >
                Cancel Edit
              </button>
            )}
          </div>
        </form>
      </GlassBubbleCard>

      {loading ? (
        <GlassBubbleCard>
          <p className="text-slate-400">Loading tools...</p>
        </GlassBubbleCard>
      ) : tools.length === 0 ? (
        <GlassBubbleCard>
          <p className="text-slate-400">No tools yet. Add your first tool above.</p>
        </GlassBubbleCard>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {tools.map((tool) => (
            <GlassBubbleCard key={tool.id} className="border border-slate-700/70 bg-slate-900/60">
              {tool.photoUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={tool.photoUrl}
                  alt={tool.name}
                  className="w-full h-36 object-cover rounded-lg mb-3"
                />
              )}
              <div className="flex justify-between items-start gap-3">
                <div>
                  <h3 className="text-lg font-semibold text-slate-100">{tool.name}</h3>
                  {tool.manufacturer && <p className="text-xs text-slate-400 mt-1">{tool.manufacturer}</p>}
                </div>
                <span className="text-base font-bold text-emerald-300">${tool.cost.toFixed(2)}</span>
              </div>

              <div className="mt-3 text-sm space-y-1 text-slate-300">
                {tool.partNumber && <p>Part: {tool.partNumber}</p>}
                {tool.modelNumber && <p>Model: {tool.modelNumber}</p>}
                {tool.supplier && <p>Supplier: {tool.supplier}</p>}
                {tool.notes ? <p className="text-slate-400">Notes: {tool.notes}</p> : null}
              </div>

              <div className="mt-3 flex gap-2">
                <button
                  onClick={() => startEdit(tool)}
                  className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold"
                >
                  Edit
                </button>
                <button
                  onClick={() => deleteTool(tool.id)}
                  className="px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 text-white text-sm font-semibold"
                >
                  Delete
                </button>
              </div>
            </GlassBubbleCard>
          ))}
        </div>
      )}
    </main>
  );
}
