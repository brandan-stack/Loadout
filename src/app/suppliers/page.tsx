"use client";

import { useState, useEffect } from "react";
import { GlassBubbleCard } from "@/components/ui/glass-bubble-card";

interface Supplier {
  id: string;
  name: string;
  contact?: string;
  website?: string;
  leadTimeD: number;
  notes?: string;
  archived: boolean;
}

function readApiError(payload: unknown): string | null {
  if (!payload || typeof payload !== "object") return null;
  const candidate = (payload as { error?: unknown }).error;
  if (typeof candidate === "string") return candidate;
  if (Array.isArray(candidate)) {
    const first = candidate[0] as { message?: unknown } | undefined;
    if (first && typeof first.message === "string") return first.message;
  }
  return null;
}

export default function SupplierManagement() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState("");
  const [formData, setFormData] = useState({
    name: "",
    contact: "",
    website: "",
    leadTimeD: 7,
    notes: "",
  });

  useEffect(() => {
    fetchSuppliers();
  }, []);

  async function fetchSuppliers() {
    setLoading(true);
    try {
      const res = await fetch("/api/suppliers");
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setSuppliers([]);
        setError(readApiError(data) || "Failed to load suppliers.");
        return;
      }
      setSuppliers(Array.isArray(data) ? data : []);
      setError("");
    } catch (error) {
      console.error("Failed to fetch suppliers:", error);
      setSuppliers([]);
      setError("Failed to load suppliers. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function handleAddSupplier(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!formData.name.trim()) {
      setError("Supplier name is required.");
      return;
    }

    if (!Number.isFinite(formData.leadTimeD) || formData.leadTimeD < 0) {
      setError("Lead time must be 0 or greater.");
      return;
    }

    if (!Number.isInteger(formData.leadTimeD)) {
      setError("Lead time must be a whole number.");
      return;
    }

    if (formData.website && formData.website.trim()) {
      try {
        new URL(formData.website.trim());
      } catch {
        setError("Please enter a valid website URL (e.g. https://example.com).");
        return;
      }
    }

    try {
      const res = await fetch("/api/suppliers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          name: formData.name.trim(),
          contact: formData.contact.trim(),
          website: formData.website.trim() || undefined,
          notes: formData.notes.trim(),
        }),
      });

      if (res.ok) {
        setFormData({ name: "", contact: "", website: "", leadTimeD: 7, notes: "" });
        setShowForm(false);
        await fetchSuppliers();
      } else {
        const payload = await res.json().catch(() => null);
        setError(readApiError(payload) || "Failed to save supplier.");
      }
    } catch (error) {
      console.error("Failed to add supplier:", error);
      setError("Failed to save supplier. Please try again.");
    }
  }

  async function handleArchiveSupplier(id: string) {
    try {
      const res = await fetch(`/api/suppliers/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ archived: true }),
      });
      if (!res.ok) {
        const payload = await res.json().catch(() => null);
        setError(readApiError(payload) || "Failed to archive supplier.");
        return;
      }
      await fetchSuppliers();
    } catch (error) {
      console.error("Failed to archive supplier:", error);
      setError("Failed to archive supplier. Please try again.");
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <p className="text-slate-400 animate-pulse">Loading suppliers...</p>
      </div>
    );
  }

  return (
    <main className="container mx-auto px-3 py-4 sm:p-4 max-w-2xl form-screen">
      <h1 className="text-3xl sm:text-4xl font-bold mb-6">Suppliers</h1>

      {error && (
        <div className="mb-4 rounded-xl border border-red-400/35 bg-red-500/10 p-3 text-sm text-red-200">
          {error}
        </div>
      )}

      <button
        onClick={() => { setShowForm(!showForm); setError(""); }}
        className="mb-6 px-4 py-2 rounded-xl bg-teal-700 hover:bg-teal-600 text-white font-semibold text-sm"
      >
        {showForm ? "Cancel" : "+ Add Supplier"}
      </button>

      {showForm && (
        <GlassBubbleCard className="mb-6">
          <form onSubmit={handleAddSupplier}>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Supplier Name *</label>
                <input
                  type="text"
                  placeholder="e.g. Acme Parts Co."
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  className="w-full rounded-xl bg-slate-800 border border-slate-600 text-slate-100 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Contact Email</label>
                <input
                  type="email"
                  placeholder="orders@supplier.com"
                  value={formData.contact}
                  onChange={(e) => setFormData({ ...formData, contact: e.target.value })}
                  className="w-full rounded-xl bg-slate-800 border border-slate-600 text-slate-100 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">
                  Website URL
                  <span className="ml-1 text-slate-500 font-normal">(direct link to supplier catalog or ordering page)</span>
                </label>
                <input
                  type="url"
                  placeholder="https://www.supplier.com/catalog"
                  value={formData.website}
                  onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                  className="w-full rounded-xl bg-slate-800 border border-slate-600 text-slate-100 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">
                  Lead Time (days)
                  <span className="ml-1 text-slate-500 font-normal">— typical delivery time after placing an order. Default is 7 days.</span>
                </label>
                <input
                  type="number"
                  placeholder="7"
                  value={formData.leadTimeD}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      leadTimeD:
                        e.target.value === "" ? 0 : Number.parseInt(e.target.value, 10),
                    })
                  }
                  min={0}
                  step={1}
                  className="w-full rounded-xl bg-slate-800 border border-slate-600 text-slate-100 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Notes</label>
                <textarea
                  placeholder="Additional notes about this supplier…"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full rounded-xl bg-slate-800 border border-slate-600 text-slate-100 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                  rows={3}
                />
              </div>
              <button
                type="submit"
                className="w-full rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-semibold py-2.5 text-sm"
              >
                Save Supplier
              </button>
            </div>
          </form>
        </GlassBubbleCard>
      )}

      <div className="space-y-4">
        {suppliers.map((supplier) => (
          <GlassBubbleCard key={supplier.id}>
            <div className="flex flex-col sm:flex-row justify-between sm:items-start gap-3">
              <div className="min-w-0 flex-1">
                <h3 className="text-lg font-semibold text-slate-100">{supplier.name}</h3>
                {supplier.contact && (
                  <p className="text-sm text-slate-400 mt-0.5">{supplier.contact}</p>
                )}
                {supplier.website && (
                  <a
                    href={supplier.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-teal-400 hover:text-teal-300 underline truncate block mt-0.5"
                  >
                    {supplier.website}
                  </a>
                )}
                <p className="text-sm text-slate-400 mt-1">
                  Lead time: <span className="text-slate-200 font-medium">{supplier.leadTimeD} day{supplier.leadTimeD !== 1 ? "s" : ""}</span>
                </p>
                {supplier.notes && (
                  <p className="text-sm text-slate-400 mt-1">{supplier.notes}</p>
                )}
              </div>
              <button
                onClick={() => handleArchiveSupplier(supplier.id)}
                className="shrink-0 px-3 py-1.5 text-sm rounded-xl bg-slate-700 hover:bg-red-900/60 text-slate-300 hover:text-red-300 border border-slate-600 hover:border-red-700 transition-colors"
              >
                Archive
              </button>
            </div>
          </GlassBubbleCard>
        ))}
      </div>

      {suppliers.length === 0 && !showForm && (
        <div className="text-center py-16 text-slate-500">
          <p className="text-4xl mb-3">🏭</p>
          <p className="font-semibold">No suppliers yet</p>
          <p className="text-sm mt-1">Add a supplier to link items and track lead times</p>
        </div>
      )}
    </main>
  );
}
