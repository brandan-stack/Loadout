"use client";

import { useState, useEffect, useCallback } from "react";
import { GlassBubbleCard } from "@/components/ui/glass-bubble-card";

interface Variant {
  id: string;
  name: string;
  sku: string | null;
  quantityOnHand: number;
  attributes: string;
}

interface Props {
  itemId: string;
}

export function VariantsPanel({ itemId }: Props) {
  const [variants, setVariants] = useState<Variant[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState("");
  const [newSku, setNewSku] = useState("");
  const [newQty, setNewQty] = useState(0);

  const loadVariants = useCallback(async () => {
    const res = await fetch(`/api/items/${itemId}/variants`);
    const data = await res.json();
    setVariants(data);
    setLoading(false);
  }, [itemId]);

  useEffect(() => {
    loadVariants();
  }, [itemId, loadVariants]);

  async function handleAdd() {
    if (!newName.trim()) return;
    const res = await fetch(`/api/items/${itemId}/variants`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: newName.trim(),
        sku: newSku.trim() || undefined,
        quantityOnHand: newQty,
      }),
    });
    if (res.ok) {
      setNewName("");
      setNewSku("");
      setNewQty(0);
      setAdding(false);
      void loadVariants();
    }
  }

  async function handleDelete(variantId: string) {
    const res = await fetch(
      `/api/items/${itemId}/variants/${variantId}`,
      { method: "DELETE" }
    );
    if (res.ok) void loadVariants();
  }

  if (loading) return <p className="text-sm text-gray-400">Loading variants…</p>;

  return (
    <GlassBubbleCard>
      <div className="flex justify-between items-center mb-4">
        <h3 className="font-bold text-lg">Variants</h3>
        <button
          onClick={() => setAdding(!adding)}
          className="text-sm text-blue-600 hover:underline"
        >
          {adding ? "Cancel" : "+ Add Variant"}
        </button>
      </div>

      {adding && (
        <div className="mb-4 p-3 bg-gray-50 rounded-lg space-y-2">
          <input
            placeholder="Variant name (e.g. Red / Large)"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            className="w-full px-3 py-2 text-sm border rounded focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
          <input
            placeholder="SKU (optional)"
            value={newSku}
            onChange={(e) => setNewSku(e.target.value)}
            className="w-full px-3 py-2 text-sm border rounded focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
          <div className="flex gap-2">
            <input
              type="number"
              min={0}
              placeholder="Qty"
              value={newQty}
              onChange={(e) => setNewQty(parseInt(e.target.value) || 0)}
              className="w-24 px-3 py-2 text-sm border rounded focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
            <button
              onClick={handleAdd}
              className="flex-1 py-2 bg-blue-500 text-white text-sm rounded hover:bg-blue-600"
            >
              Add
            </button>
          </div>
        </div>
      )}

      {variants.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-4">
          No variants yet. Add one to track different sizes, colors or specs.
        </p>
      ) : (
        <div className="space-y-2">
          {variants.map((v) => (
            <div
              key={v.id}
              className="flex items-center justify-between text-sm py-2 border-b last:border-0"
            >
              <div>
                <span className="font-medium">{v.name}</span>
                {v.sku && (
                  <span className="text-gray-400 ml-2 text-xs">#{v.sku}</span>
                )}
              </div>
              <div className="flex items-center gap-3">
                <span className="font-mono text-xs bg-gray-100 px-2 py-1 rounded">
                  {v.quantityOnHand}
                </span>
                <button
                  onClick={() => handleDelete(v.id)}
                  className="text-red-400 hover:text-red-600 text-xs"
                >
                  Remove
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </GlassBubbleCard>
  );
}
