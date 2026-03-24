"use client";

import { useState, useEffect } from "react";
import { GlassBubbleCard } from "@/components/ui/glass-bubble-card";

interface Supplier {
  id: string;
  name: string;
  contact?: string;
  leadTimeD: number;
  notes?: string;
  archived: boolean;
}

export default function SupplierManagement() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState("");
  const [formData, setFormData] = useState({
    name: "",
    contact: "",
    leadTimeD: 7,
    notes: "",
  });

  useEffect(() => {
    fetchSuppliers();
  }, []);

  async function fetchSuppliers() {
    try {
      const res = await fetch("/api/suppliers");
      const data = await res.json();
      setSuppliers(data);
    } catch (error) {
      console.error("Failed to fetch suppliers:", error);
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

    try {
      const res = await fetch("/api/suppliers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          name: formData.name.trim(),
          contact: formData.contact.trim(),
          notes: formData.notes.trim(),
        }),
      });

      if (res.ok) {
        setFormData({ name: "", contact: "", leadTimeD: 7, notes: "" });
        setShowForm(false);
        fetchSuppliers();
      } else {
        const payload = await res.json().catch(() => null);
        setError(payload?.error || "Failed to save supplier.");
      }
    } catch (error) {
      console.error("Failed to add supplier:", error);
      setError("Failed to save supplier. Please try again.");
    }
  }

  async function handleArchiveSupplier(id: string) {
    try {
      await fetch(`/api/suppliers/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ archived: true }),
      });
      fetchSuppliers();
    } catch (error) {
      console.error("Failed to archive supplier:", error);
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <p>Loading suppliers...</p>
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
        onClick={() => setShowForm(!showForm)}
        className="mb-6 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
      >
        {showForm ? "Cancel" : "Add Supplier"}
      </button>

      {showForm && (
        <GlassBubbleCard className="mb-6">
          <form onSubmit={handleAddSupplier}>
            <div className="space-y-4">
              <input
                type="text"
                placeholder="Supplier Name"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                required
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <input
                type="email"
                placeholder="Contact Email"
                value={formData.contact}
                onChange={(e) =>
                  setFormData({ ...formData, contact: e.target.value })
                }
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <input
                type="number"
                placeholder="Lead Time (days)"
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
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <textarea
                placeholder="Notes"
                value={formData.notes}
                onChange={(e) =>
                  setFormData({ ...formData, notes: e.target.value })
                }
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={3}
              />
              <button
                type="submit"
                className="w-full px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600"
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
              <div>
                <h3 className="text-lg font-semibold">{supplier.name}</h3>
                {supplier.contact && (
                  <p className="text-sm text-gray-600">{supplier.contact}</p>
                )}
                <p className="text-sm text-gray-500">
                  Lead time: {supplier.leadTimeD} days
                </p>
                {supplier.notes && (
                  <p className="text-sm text-gray-600 mt-2">{supplier.notes}</p>
                )}
              </div>
              <button
                onClick={() => handleArchiveSupplier(supplier.id)}
                className="px-3 py-1 text-sm bg-red-500 text-white rounded hover:bg-red-600"
              >
                Archive
              </button>
            </div>
          </GlassBubbleCard>
        ))}
      </div>

      {suppliers.length === 0 && (
        <div className="text-center text-gray-500">
          <p>No suppliers yet. Add one to get started!</p>
        </div>
      )}
    </main>
  );
}
