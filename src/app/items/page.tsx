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
    barcode: "",
    quantityOnHand: 0,
    lowStockAmberThreshold: 10,
    lowStockRedThreshold: 5,
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

    try {
      const res = await fetch("/api/items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        setFormData({
          name: "",
          barcode: "",
          quantityOnHand: 0,
          lowStockAmberThreshold: 10,
          lowStockRedThreshold: 5,
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
                placeholder="Quantity on Hand"
                value={formData.quantityOnHand}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    quantityOnHand: Number.isNaN(e.currentTarget.valueAsNumber)
                      ? 0
                      : e.currentTarget.valueAsNumber,
                  })
                }
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <input
                  type="number"
                  placeholder="Amber Threshold"
                  value={formData.lowStockAmberThreshold}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      lowStockAmberThreshold: Number.isNaN(
                        e.currentTarget.valueAsNumber
                      )
                        ? 0
                        : e.currentTarget.valueAsNumber,
                    })
                  }
                  className="px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
                <input
                  type="number"
                  placeholder="Red Threshold"
                  value={formData.lowStockRedThreshold}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      lowStockRedThreshold: Number.isNaN(
                        e.currentTarget.valueAsNumber
                      )
                        ? 0
                        : e.currentTarget.valueAsNumber,
                    })
                  }
                  className="px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                />
              </div>
              <select
                value={formData.preferredSupplierId}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    preferredSupplierId: e.target.value,
                  })
                }
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select Supplier</option>
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
                  Thresholds: Amber {item.lowStockAmberThreshold} / Red{" "}
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
