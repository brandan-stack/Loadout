"use client";

import { useState, useEffect } from "react";

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
    <main className="mx-auto px-4 sm:px-6 lg:px-8 py-8 max-w-3xl form-screen">

      {/* ─── Header ─── */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1
            className="font-bold text-white leading-none"
            style={{ fontSize: "24px", letterSpacing: "-0.02em" }}
          >
            Suppliers
          </h1>
          <p className="text-xs text-slate-500 mt-1.5 uppercase tracking-widest font-medium">
            {suppliers.length} vendor{suppliers.length !== 1 ? "s" : ""}
          </p>
        </div>
        <button
          onClick={() => { setShowForm(!showForm); setError(""); }}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold text-white transition-all hover:brightness-110 active:scale-[0.97]"
          style={{
            background: showForm
              ? "rgba(71,85,105,0.7)"
              : "linear-gradient(135deg, #5b5ef4 0%, #818cf8 100%)",
            boxShadow: showForm ? "none" : "0 3px 14px rgba(91,94,244,0.32)",
          }}
        >
          {showForm ? "✕ Cancel" : "+ Add Supplier"}
        </button>
      </div>

      {error && (
        <div className="mb-5 rounded-xl border border-red-400/30 bg-red-500/[0.08] px-4 py-3 text-sm text-red-300">
          {error}
        </div>
      )}

      {showForm && (
        <div
          className="rounded-2xl p-5 mb-6"
          style={{ background: "rgba(12,17,36,0.95)", border: "1px solid rgba(255,255,255,0.08)" }}
        >
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
                  className="w-full rounded-xl text-slate-100 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                  style={{ background: "rgba(15,23,42,0.6)", border: "1px solid rgba(148,163,184,0.12)" }}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Contact Email</label>
                <input
                  type="email"
                  placeholder="orders@supplier.com"
                  value={formData.contact}
                  onChange={(e) => setFormData({ ...formData, contact: e.target.value })}
                  className="w-full rounded-xl text-slate-100 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                  style={{ background: "rgba(15,23,42,0.6)", border: "1px solid rgba(148,163,184,0.12)" }}
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
                  className="w-full rounded-xl text-slate-100 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                  style={{ background: "rgba(15,23,42,0.6)", border: "1px solid rgba(148,163,184,0.12)" }}
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
                  className="w-full rounded-xl text-slate-100 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                  style={{ background: "rgba(15,23,42,0.6)", border: "1px solid rgba(148,163,184,0.12)" }}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Notes</label>
                <textarea
                  placeholder="Additional notes about this supplier…"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full rounded-xl text-slate-100 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                  style={{ background: "rgba(15,23,42,0.6)", border: "1px solid rgba(148,163,184,0.12)" }}
                  rows={3}
                />
              </div>
              <button
                type="submit"
                className="w-full rounded-xl text-white font-semibold py-2.5 text-sm transition-all hover:brightness-110 active:scale-[0.98]"
                style={{
                  background: "linear-gradient(135deg, #5b5ef4 0%, #818cf8 100%)",
                  boxShadow: "0 3px 14px rgba(91,94,244,0.32)",
                }}
              >
                Save Supplier
              </button>
            </div>
          </form>
        </div>
      )}

      {suppliers.length > 0 && (
        <div
          className="rounded-2xl overflow-hidden mb-4"
          style={{ border: "1px solid rgba(255,255,255,0.06)" }}
        >
          {suppliers.map((supplier, idx) => (
            <div
              key={supplier.id}
              className="flex items-start gap-4 px-5 py-4"
              style={{
                background: "rgba(12,17,36,0.85)",
                borderBottom: idx < suppliers.length - 1 ? "1px solid rgba(255,255,255,0.05)" : "none",
              }}
            >
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-slate-100">{supplier.name}</p>
                {supplier.contact && (
                  <p className="text-xs text-slate-400 mt-0.5">{supplier.contact}</p>
                )}
                {supplier.website && (
                  <a
                    href={supplier.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-indigo-400 hover:text-indigo-300 underline truncate block mt-0.5"
                  >
                    {supplier.website}
                  </a>
                )}
                <p className="text-xs text-slate-500 mt-1">
                  Lead time: <span className="text-slate-300 font-medium">{supplier.leadTimeD} day{supplier.leadTimeD !== 1 ? "s" : ""}</span>
                </p>
                {supplier.notes && (
                  <p className="text-xs text-slate-500 mt-1">{supplier.notes}</p>
                )}
              </div>
              <button
                onClick={() => handleArchiveSupplier(supplier.id)}
                className="shrink-0 px-3 py-1.5 text-xs rounded-lg text-slate-500 hover:text-red-400 transition-colors"
                style={{ border: "1px solid rgba(255,255,255,0.07)" }}
              >
                Archive
              </button>
            </div>
          ))}
        </div>
      )}

      {suppliers.length === 0 && !showForm && (
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
            🏭
          </div>
          <p className="font-semibold text-slate-200 mb-1.5">No suppliers yet</p>
          <p className="text-sm text-slate-500 mb-6">Add a vendor to link items and track lead times</p>
          <button
            onClick={() => setShowForm(true)}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white"
            style={{
              background: "linear-gradient(135deg, #5b5ef4 0%, #818cf8 100%)",
              boxShadow: "0 3px 16px rgba(91,94,244,0.30)",
            }}
          >
            + Add Supplier
          </button>
        </div>
      )}
    </main>
  );
}
