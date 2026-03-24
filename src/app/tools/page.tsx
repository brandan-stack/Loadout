"use client";

import { useEffect, useMemo, useState } from "react";
import { GlassBubbleCard } from "@/components/ui/glass-bubble-card";

interface Tool {
  id: string;
  name: string;
  manufacturer: string;
  partNumber: string;
  modelNumber: string;
  supplier: string;
  cost: number;
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

export default function ToolsPage() {
  const [tools, setTools] = useState<Tool[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState<ToolFormState>(initialForm);
  const [editingId, setEditingId] = useState<string | null>(null);

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
    if (!form.manufacturer.trim()) return "Manufacturer is required.";
    if (!form.partNumber.trim()) return "Part number is required.";
    if (!form.modelNumber.trim()) return "Model number is required.";
    if (!form.supplier.trim()) return "Supplier is required.";
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

    const payload = {
      name: form.name.trim(),
      manufacturer: form.manufacturer.trim(),
      partNumber: form.partNumber.trim(),
      modelNumber: form.modelNumber.trim(),
      supplier: form.supplier.trim(),
      cost: Number(form.cost),
      notes: form.notes.trim() || undefined,
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
      manufacturer: tool.manufacturer,
      partNumber: tool.partNumber,
      modelNumber: tool.modelNumber,
      supplier: tool.supplier,
      cost: tool.cost,
      notes: tool.notes || "",
    });
    setEditingId(tool.id);
    setError("");
  }

  function cancelEdit() {
    setEditingId(null);
    setForm(initialForm);
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
              placeholder="Tool Name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg"
              required
            />
            <input
              type="text"
              placeholder="Manufacturer"
              value={form.manufacturer}
              onChange={(e) => setForm({ ...form, manufacturer: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg"
              required
            />
            <input
              type="text"
              placeholder="Part Number"
              value={form.partNumber}
              onChange={(e) => setForm({ ...form, partNumber: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg"
              required
            />
            <input
              type="text"
              placeholder="Model Number"
              value={form.modelNumber}
              onChange={(e) => setForm({ ...form, modelNumber: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg"
              required
            />
            <input
              type="text"
              placeholder="Supplier"
              value={form.supplier}
              onChange={(e) => setForm({ ...form, supplier: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg"
              required
            />
            <input
              type="number"
              min={0}
              step="0.01"
              placeholder="Cost"
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
              required
            />
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
              <div className="flex justify-between items-start gap-3">
                <div>
                  <h3 className="text-lg font-semibold text-slate-100">{tool.name}</h3>
                  <p className="text-xs text-slate-400 mt-1">{tool.manufacturer}</p>
                </div>
                <span className="text-base font-bold text-emerald-300">${tool.cost.toFixed(2)}</span>
              </div>

              <div className="mt-3 text-sm space-y-1 text-slate-300">
                <p>Part: {tool.partNumber}</p>
                <p>Model: {tool.modelNumber}</p>
                <p>Supplier: {tool.supplier}</p>
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
