"use client";

import { useState, useEffect } from "react";
import { GlassBubbleCard } from "@/components/ui/glass-bubble-card";

interface Location {
  id: string;
  name: string;
  description: string | null;
  stock: {
    id: string;
    quantityOnHand: number;
    item: { id: string; name: string };
  }[];
}

export default function LocationsPage() {
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [transferMode, setTransferMode] = useState(false);
  const [transferFrom, setTransferFrom] = useState("");
  const [transferTo, setTransferTo] = useState("");
  const [transferItem, setTransferItem] = useState("");
  const [transferQty, setTransferQty] = useState(1);
  const [transferMsg, setTransferMsg] = useState("");

  useEffect(() => {
    loadLocations();
  }, []);

  async function loadLocations() {
    const res = await fetch("/api/locations");
    setLocations(await res.json());
    setLoading(false);
  }

  async function handleAddLocation() {
    if (!newName.trim()) return;
    await fetch("/api/locations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newName, description: newDesc || undefined }),
    });
    setNewName("");
    setNewDesc("");
    setAdding(false);
    loadLocations();
  }

  async function handleTransfer() {
    const res = await fetch("/api/locations/transfer", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fromLocationId: transferFrom,
        toLocationId: transferTo,
        itemId: transferItem,
        quantity: transferQty,
      }),
    });
    const data = await res.json();
    if (res.ok) {
      setTransferMsg("Transfer complete!");
      setTransferMode(false);
      loadLocations();
    } else {
      setTransferMsg(data.error ?? "Transfer failed");
    }
  }

  // Collect all items across all locations for transfer dropdown
  const allItems = Array.from(
    new Map(
      locations.flatMap((l) => l.stock).map((s) => [s.item.id, s.item])
    ).values()
  );

  if (loading)
    return (
      <div className="flex justify-center items-center min-h-screen">
        <p>Loading locations…</p>
      </div>
    );

  return (
    <main className="container mx-auto px-3 py-4 sm:p-4 max-w-2xl form-screen">
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 mb-6">
        <div>
          <h1 className="text-3xl sm:text-4xl font-bold">Locations</h1>
          <p className="text-gray-600 mt-1">
            Track inventory across warehouses, rooms, or shelves.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setTransferMode(!transferMode)}
            className="px-4 py-2 border rounded-xl text-sm hover:bg-gray-100"
          >
            Transfer
          </button>
          <button
            onClick={() => setAdding(!adding)}
            className="px-4 py-2 bg-blue-500 text-white rounded-xl text-sm hover:bg-blue-600"
          >
            + Location
          </button>
        </div>
      </div>

      {/* Add location form */}
      {adding && (
        <GlassBubbleCard className="mb-6">
          <h2 className="font-bold mb-3">New Location</h2>
          <div className="space-y-3">
            <input
              placeholder="Location name (e.g. Warehouse A)"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
            <input
              placeholder="Description (optional)"
              value={newDesc}
              onChange={(e) => setNewDesc(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={() => setAdding(false)}
                className="px-4 py-2 border rounded-lg text-sm hover:bg-gray-100"
              >
                Cancel
              </button>
              <button
                onClick={handleAddLocation}
                className="flex-1 py-2 bg-blue-500 text-white rounded-lg text-sm hover:bg-blue-600"
              >
                Add Location
              </button>
            </div>
          </div>
        </GlassBubbleCard>
      )}

      {/* Transfer form */}
      {transferMode && (
        <GlassBubbleCard className="mb-6">
          <h2 className="font-bold mb-3">Transfer Stock</h2>
          {transferMsg && (
            <div className="mb-3 p-2 bg-blue-50 text-blue-700 text-sm rounded">
              {transferMsg}
            </div>
          )}
          <div className="space-y-3">
            <select
              value={transferFrom}
              onChange={(e) => setTransferFrom(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
            >
              <option value="">From location…</option>
              {locations.map((l) => (
                <option key={l.id} value={l.id}>{l.name}</option>
              ))}
            </select>
            <select
              value={transferTo}
              onChange={(e) => setTransferTo(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
            >
              <option value="">To location…</option>
              {locations.map((l) => (
                <option key={l.id} value={l.id}>{l.name}</option>
              ))}
            </select>
            <select
              value={transferItem}
              onChange={(e) => setTransferItem(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
            >
              <option value="">Select item…</option>
              {allItems.map((item) => (
                <option key={item.id} value={item.id}>{item.name}</option>
              ))}
            </select>
            <input
              type="number"
              min={1}
              value={transferQty}
              onChange={(e) => setTransferQty(parseInt(e.target.value) || 1)}
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
              placeholder="Quantity"
            />
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={() => { setTransferMode(false); setTransferMsg(""); }}
                className="px-4 py-2 border rounded-lg text-sm hover:bg-gray-100"
              >
                Cancel
              </button>
              <button
                onClick={handleTransfer}
                disabled={!transferFrom || !transferTo || !transferItem || transferQty < 1}
                className="flex-1 py-2 bg-green-500 text-white rounded-lg text-sm hover:bg-green-600 disabled:bg-gray-400"
              >
                Confirm Transfer
              </button>
            </div>
          </div>
        </GlassBubbleCard>
      )}

      {/* Location cards */}
      {locations.length === 0 ? (
        <GlassBubbleCard>
          <p className="text-center text-gray-400 py-8">
            No locations yet. Add your first location to start tracking stock by place.
          </p>
        </GlassBubbleCard>
      ) : (
        <div className="space-y-4">
          {locations.map((loc) => (
            <GlassBubbleCard key={loc.id}>
              <div className="flex justify-between items-start mb-3">
                <div>
                  <h2 className="font-bold text-lg">{loc.name}</h2>
                  {loc.description && (
                    <p className="text-sm text-gray-500">{loc.description}</p>
                  )}
                </div>
                <span className="text-sm text-gray-400">
                  {loc.stock.length} item{loc.stock.length !== 1 ? "s" : ""}
                </span>
              </div>
              {loc.stock.length > 0 ? (
                <div className="space-y-1">
                  {loc.stock.map((s) => (
                    <div key={s.id} className="flex justify-between text-sm py-1 border-b last:border-0">
                      <span>{s.item.name}</span>
                      <span className="font-mono font-medium">{s.quantityOnHand}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-400">No stock tracked at this location yet.</p>
              )}
            </GlassBubbleCard>
          ))}
        </div>
      )}
    </main>
  );
}
