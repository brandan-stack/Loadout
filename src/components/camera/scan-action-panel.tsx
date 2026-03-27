"use client";

import { useState, useEffect } from "react";
import { GlassBubbleCard } from "@/components/ui/glass-bubble-card";
import { useInventory } from "@/hooks/useInventory";
import { useBarcode } from "@/hooks/useBarcode";

interface ScanActionPanelProps {
  barcode: string;
  onDismiss: () => void;
  onSuccess: (itemId: string, action: "add" | "use" | "created") => void;
}

export function ScanActionPanel({
  barcode,
  onDismiss,
  onSuccess,
}: ScanActionPanelProps) {
  const { lookup, createFromUnknown } = useBarcode();
  const { addInventory, consumeInventory: performUseInventory } = useInventory();

  const [state, setState] = useState<
    "loading" | "found" | "unknown" | "creating" | "error"
  >("loading");
  const [item, setItem] = useState<any>(null);
  const [error, setError] = useState<string>("");
  const [itemName, setItemName] = useState("");
  const [quantity, setQuantity] = useState(1);

  const parseQuantityInput = (value: string) => {
    const parsed = Number.parseInt(value, 10);
    if (!Number.isFinite(parsed) || parsed < 1) {
      return 1;
    }
    return parsed;
  };

  // Load item data on mount
  useEffect(() => {
    (async () => {
      const result = await lookup(barcode);
      if (result?.found) {
        setItem(result.item);
        setState("found");
      } else {
        setState("unknown");
      }
    })();
  }, [barcode, lookup]);

  const handleQuickAdd = async () => {
    if (!item) return;
    setState("creating");
    const result = await addInventory(item.id, quantity, {
      notes: `Quick-added from barcode scan`,
    });
    if (result.success) {
      onSuccess(item.id, "add");
    } else {
      setError(result.error || "Failed to add inventory");
      setState("error");
    }
  };

  const handleQuickUse = async () => {
    if (!item) return;
    setState("creating");
    const result = await performUseInventory(item.id, quantity, {
      notes: `Quick-used from barcode scan`,
    });
    if (result.success) {
      onSuccess(item.id, "use");
    } else {
      setError(result.error || "Failed to use inventory");
      setState("error");
    }
  };

  const handleCreateItem = async () => {
    if (!itemName.trim()) {
      setError("Item name required");
      return;
    }
    setState("creating");
    const result = await createFromUnknown(barcode, itemName, quantity);
    if (result.success) {
      onSuccess(result.data.id, "created");
    } else {
      setError(result.error || "Failed to create item");
      setState("error");
    }
  };

  return (
    <GlassBubbleCard className="fixed left-3 right-3 sm:left-4 sm:right-4 bottom-[5.25rem] sm:bottom-4 max-w-md mx-auto z-40 max-h-[calc(100dvh-7rem)] overflow-y-auto">
      <div className="space-y-4">
        {/* Barcode display */}
        <div className="text-center">
          <p className="text-xs text-gray-500">Scanned</p>
          <p className="text-lg font-mono font-bold">{barcode}</p>
        </div>

        {/* Loading state */}
        {state === "loading" && (
          <div className="text-center">
            <p className="text-sm text-gray-600">Scanning inventory...</p>
          </div>
        )}

        {/* Found item state */}
        {state === "found" && item && (
          <div className="space-y-3">
            <div>
              <h3 className="font-semibold text-lg">{item.name}</h3>
              <p className="text-sm text-gray-600">
                On hand: {item.quantityOnHand}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <label className="text-sm">Qty:</label>
              <input
                type="number"
                min={1}
                step={1}
                value={quantity}
                onChange={(e) => setQuantity(parseQuantityInput(e.target.value))}
                className="w-16 px-2 py-1 border rounded text-sm"
              />
            </div>

            <div className="flex gap-2">
              <button
                onClick={handleQuickAdd}
                className="flex-1 px-3 py-2 bg-green-500 text-white text-sm rounded hover:bg-green-600"
              >
                Add to Inventory
              </button>
              <button
                onClick={handleQuickUse}
                disabled={item.quantityOnHand < quantity}
                className="flex-1 px-3 py-2 bg-blue-500 text-white text-sm rounded hover:bg-blue-600 disabled:bg-gray-400"
              >
                Use from Inventory
              </button>
            </div>

            <button
              onClick={onDismiss}
              className="w-full px-3 py-2 text-sm text-gray-600 border border-gray-300 rounded hover:bg-gray-100"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Unknown barcode state */}
        {state === "unknown" && (
          <div className="space-y-3">
            <p className="text-sm text-amber-700 bg-amber-50 p-2 rounded">
              This barcode is not in your inventory.
            </p>

            <input
              type="text"
              placeholder="Item name"
              value={itemName}
              onChange={(e) => setItemName(e.target.value)}
              className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            />

            <div className="flex items-center gap-2">
              <label className="text-sm">Initial qty:</label>
              <input
                type="number"
                min={1}
                step={1}
                value={quantity}
                onChange={(e) => setQuantity(parseQuantityInput(e.target.value))}
                className="w-16 px-2 py-1 border rounded text-sm"
              />
            </div>

            <button
              onClick={handleCreateItem}
              disabled={!itemName.trim()}
              className="w-full px-3 py-2 bg-green-500 text-white text-sm rounded hover:bg-green-600 disabled:bg-gray-400"
            >
              Create Item
            </button>

            <button
              onClick={onDismiss}
              className="w-full px-3 py-2 text-sm text-gray-600 border border-gray-300 rounded hover:bg-gray-100"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Error state */}
        {state === "error" && (
          <div className="space-y-3">
            <p className="text-sm text-red-700 bg-red-50 p-2 rounded">
              {error}
            </p>
            <button
              onClick={() => {
                setState("found");
                setError("");
              }}
              className="w-full px-3 py-2 text-sm bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              Try Again
            </button>
            <button
              onClick={onDismiss}
              className="w-full px-3 py-2 text-sm text-gray-600 border border-gray-300 rounded hover:bg-gray-100"
            >
              Dismiss
            </button>
          </div>
        )}
      </div>
    </GlassBubbleCard>
  );
}
