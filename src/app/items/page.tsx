"use client";

import { useState, useEffect } from "react";
import { GlassBubbleCard } from "@/components/ui/glass-bubble-card";

interface Supplier {
  id: string;
  name: string;
  leadTimeD: number;
}

interface Item {
  id: string;
  name: string;
  manufacturer?: string;
  partNumber?: string;
  modelNumber?: string;
  serialNumber?: string;
  barcode?: string;
  quantityOnHand: number;
  quantityUsedTotal: number;
  lowStockAmberThreshold: number;
  lowStockRedThreshold: number;
  preferredSupplierId?: string;
  lastUnitCost?: number;
  unitOfMeasure: string;
  createdAt: string;
}

export default function ItemCatalog() {
  const [items, setItems] = useState<Item[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState<string>("");
  const [formData, setFormData] = useState({
    name: "",
    manufacturer: "",
    partNumber: "",
    modelNumber: "",
    serialNumber: "",
    barcode: "",
    quantityOnHand: "",
    lowStockAmberThreshold: "",
    lowStockRedThreshold: "",
    preferredSupplierId: "",
    lastUnitCost: 0,
    unitOfMeasure: "units",
  });

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    try {
      const [itemsRes, supplierRes] = await Promise.all([
        fetch("/api/items"),
        fetch("/api/suppliers"),
      ]);
      if (!itemsRes.ok || !supplierRes.ok) {
        throw new Error("Failed to load inventory data");
      }
      const itemsData = await itemsRes.json();
      const suppliersData = await supplierRes.json();
      setItems(Array.isArray(itemsData) ? itemsData : []);
      setSuppliers(Array.isArray(suppliersData) ? suppliersData : []);
      setError("");
    } catch (error) {
      console.error("Failed to fetch data:", error);
      setError("Could not load items right now. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function handleAddItem(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!formData.name.trim()) {
      setError("Item name is required.");
      return;
    }

    if (!formData.manufacturer.trim()) {
      setError("Manufacturer is required.");
      return;
    }

    if (!formData.partNumber.trim()) {
      setError("Part number is required.");
      return;
    }

    if (!formData.modelNumber.trim()) {
      setError("Model number is required.");
      return;
    }

    if (!formData.serialNumber.trim()) {
      setError("Serial number is required.");
      return;
    }

    if (!formData.preferredSupplierId) {
      setError("Supplier is required.");
      return;
    }

    const lowStockAlert = Number(formData.lowStockAmberThreshold);
    const criticalStockAlert = Number(formData.lowStockRedThreshold);
    const quantityOnHand =
      formData.quantityOnHand === "" ? 0 : Number(formData.quantityOnHand);

    if (!Number.isFinite(lowStockAlert) || lowStockAlert < 1) {
      setError("Low stock alert must be at least 1.");
      return;
    }
    if (!Number.isInteger(lowStockAlert)) {
      setError("Low stock alert must be a whole number.");
      return;
    }

    if (!Number.isFinite(criticalStockAlert) || criticalStockAlert < 0) {
      setError("Critical stock alert must be 0 or greater.");
      return;
    }
    if (!Number.isInteger(criticalStockAlert)) {
      setError("Critical stock alert must be a whole number.");
      return;
    }

    if (criticalStockAlert > lowStockAlert) {
      setError("Critical stock alert must be less than or equal to low stock alert.");
      return;
    }

    if (!Number.isFinite(quantityOnHand) || quantityOnHand < 0) {
      setError("Quantity on hand must be 0 or greater.");
      return;
    }
    if (!Number.isInteger(quantityOnHand)) {
      setError("Quantity on hand must be a whole number.");
      return;
    }

    const payload = {
      ...formData,
      quantityOnHand,
      lowStockAmberThreshold: lowStockAlert,
      lowStockRedThreshold: criticalStockAlert,
    };

    try {
      const res = await fetch("/api/items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        setFormData({
          name: "",
          manufacturer: "",
          partNumber: "",
          modelNumber: "",
          serialNumber: "",
          barcode: "",
          quantityOnHand: "",
          lowStockAmberThreshold: "",
          lowStockRedThreshold: "",
          preferredSupplierId: "",
          lastUnitCost: 0,
          unitOfMeasure: "units",
        });
        setShowForm(false);
        fetchData();
      } else {
        const payload = await res.json().catch(() => null);
        setError(payload?.error || "Failed to save item.");
      }
    } catch (error) {
      console.error("Failed to add item:", error);
      setError("Failed to save item. Please try again.");
    }
  }

  const getLowStockColor = (item: Item) => {
    if (item.quantityOnHand <= item.lowStockRedThreshold) {
      return "border-red-500 bg-red-50";
    }
    if (item.quantityOnHand <= item.lowStockAmberThreshold) {
      return "border-amber-500 bg-amber-50";
    }
    return "";
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <p>Loading items...</p>
      </div>
    );
  }

  return (
    <main className="container mx-auto px-3 py-4 sm:p-4 max-w-4xl form-screen">
      <h1 className="text-3xl sm:text-4xl font-bold mb-6">Inventory Catalog</h1>

      {error && (
        <div className="mb-4 rounded-xl border border-red-400/35 bg-red-500/10 p-3 text-sm text-red-200">
          {error}
        </div>
      )}

      <button
        onClick={() => setShowForm(!showForm)}
        className="mb-6 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
      >
        {showForm ? "Cancel" : "Add Item"}
      </button>

      {showForm && (
        <GlassBubbleCard className="mb-6">
          <form onSubmit={handleAddItem}>
            <div className="space-y-4">
              <input
                type="text"
                placeholder="Item Name"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                required
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <input
                  type="text"
                  placeholder="Manufacturer"
                  value={formData.manufacturer}
                  onChange={(e) =>
                    setFormData({ ...formData, manufacturer: e.target.value })
                  }
                  required
                  className="px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <input
                  type="text"
                  placeholder="Part Number"
                  value={formData.partNumber}
                  onChange={(e) =>
                    setFormData({ ...formData, partNumber: e.target.value })
                  }
                  required
                  className="px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <input
                  type="text"
                  placeholder="Model Number"
                  value={formData.modelNumber}
                  onChange={(e) =>
                    setFormData({ ...formData, modelNumber: e.target.value })
                  }
                  required
                  className="px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <input
                  type="text"
                  placeholder="Serial Number"
                  value={formData.serialNumber}
                  onChange={(e) =>
                    setFormData({ ...formData, serialNumber: e.target.value })
                  }
                  required
                  className="px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <input
                type="text"
                placeholder="Barcode"
                value={formData.barcode}
                onChange={(e) =>
                  setFormData({ ...formData, barcode: e.target.value })
                }
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <input
                type="number"
                placeholder="Quantity on Hand (optional; defaults to 0)"
                value={formData.quantityOnHand}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    quantityOnHand: e.target.value,
                  })
                }
                min={0}
                step={1}
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <input
                  type="number"
                  placeholder="Low Stock Alert"
                  value={formData.lowStockAmberThreshold}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      lowStockAmberThreshold: e.target.value,
                    })
                  }
                  min={1}
                  step={1}
                  required
                  className="px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
                <input
                  type="number"
                  placeholder="Critical Stock Alert"
                  value={formData.lowStockRedThreshold}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      lowStockRedThreshold: e.target.value,
                    })
                  }
                  min={0}
                  step={1}
                  required
                  className="px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                />
              </div>
              <div className="rounded-lg border border-slate-700/70 bg-slate-900/70 p-3 text-xs text-slate-300">
                <p>
                  <span className="font-semibold text-amber-300">Low Stock Alert</span>: when quantity on hand is at or below this value,
                  the item is flagged as low stock.
                </p>
                <p className="mt-1">
                  <span className="font-semibold text-red-300">Critical Stock Alert</span>: when quantity on hand is at or below this lower value,
                  the item is marked critical and should be prioritized.
                </p>
              </div>
              <select
                value={formData.preferredSupplierId}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    preferredSupplierId: e.target.value,
                  })
                }
                required
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select Supplier (Required)</option>
                {suppliers.map((supplier) => (
                  <option key={supplier.id} value={supplier.id}>
                    {supplier.name}
                  </option>
                ))}
              </select>
              <button
                type="submit"
                className="w-full px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600"
              >
                Save Item
              </button>
            </div>
          </form>
        </GlassBubbleCard>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {items.map((item) => (
          <GlassBubbleCard
            key={item.id}
            className={`transition-all ${getLowStockColor(item)}`}
          >
            <div>
              <h3 className="text-lg font-semibold">{item.name}</h3>
              <p className="text-xs text-gray-600">
                {item.manufacturer || "Unknown Manufacturer"} · {item.partNumber || "No Part #"} · {item.modelNumber || "No Model #"}
              </p>
              <p className="text-xs text-gray-600">
                Serial: {item.serialNumber || "No Serial #"}
              </p>
              {item.barcode && (
                <p className="text-xs text-gray-600 font-mono">
                  {item.barcode}
                </p>
              )}
              <div className="mt-3 space-y-1">
                <p className="text-sm">
                  On Hand: <span className="font-bold">{item.quantityOnHand}</span>{" "}
                  {item.unitOfMeasure}
                </p>
                <p className="text-sm text-gray-600">
                  Total Used: {item.quantityUsedTotal}
                </p>
                <p className="text-xs text-gray-500">
                  Alerts: Low {item.lowStockAmberThreshold} / Critical{" "}
                  {item.lowStockRedThreshold}
                </p>
              </div>
            </div>
          </GlassBubbleCard>
        ))}
      </div>

      {items.length === 0 && (
        <div className="text-center text-gray-500">
          <p>No items yet. Add one to get started!</p>
        </div>
      )}
    </main>
  );
}
