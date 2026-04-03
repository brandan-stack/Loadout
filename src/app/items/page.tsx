"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { GlassBubbleCard } from "@/components/ui/glass-bubble-card";
import { useCurrentUser } from "@/hooks/useCurrentUser";

interface AiResult {
  name?: string;
  manufacturer?: string;
  partNumber?: string;
  modelNumber?: string;
  description?: string;
  material?: string;
  confidence?: number;
}

interface Supplier {
  id: string;
  name: string;
  leadTimeD: number;
}

interface Location {
  id: string;
  name: string;
  description?: string;
}

interface Item {
  id: string;
  name: string;
  manufacturer?: string;
  partNumber?: string;
  modelNumber?: string;
  serialNumber?: string;
  barcode?: string;
  description?: string;
  photoUrl?: string;
  quantityOnHand: number;
  quantityUsedTotal: number;
  lowStockAmberThreshold: number;
  lowStockRedThreshold: number;
  preferredSupplierId?: string;
  lastUnitCost?: number;
  unitOfMeasure: string;
  createdAt: string;
}

function normalizeOptionalText(value: string): string | undefined {
  const trimmed = value.trim();
  return trimmed ? trimmed : undefined;
}

/** Compress an image file to a low-res JPEG data URL (max ~150x150px, ~20KB). */
async function compressImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const MAX = 150;
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
      if (!ctx) { reject(new Error("Canvas not available")); return; }
      ctx.drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL("image/jpeg", 0.7));
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("Image load failed")); };
    img.src = url;
  });
}

export default function ItemCatalog() {
  const { user } = useCurrentUser();
  const isAdmin = user?.role === "SUPER_ADMIN" || user?.role === "OFFICE";
  const [items, setItems] = useState<Item[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState<string>("");
  const [search, setSearch] = useState("");
  const [stockFilter, setStockFilter] = useState<"all" | "low" | "critical">("all");
  const [aiScanning, setAiScanning] = useState(false);
  const [aiResult, setAiResult] = useState<AiResult | null>(null);
  const [aiError, setAiError] = useState("");
  const [enlargedPhoto, setEnlargedPhoto] = useState<string | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string>("");
  const [photoUploading, setPhotoUploading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    manufacturer: "",
    partNumber: "",
    modelNumber: "",
    serialNumber: "",
    barcode: "",
    description: "",
    quantityOnHand: "",
    lowStockAmberThreshold: "",
    lowStockRedThreshold: "",
    preferredSupplierId: "",
    lastUnitCost: 0,
    unitOfMeasure: "units",
    locationId: "",
  });

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    try {
      const [itemsRes, supplierRes, locationsRes] = await Promise.all([
        fetch("/api/items"),
        fetch("/api/suppliers"),
        fetch("/api/locations"),
      ]);
      if (!itemsRes.ok || !supplierRes.ok) {
        throw new Error("Failed to load inventory data");
      }
      const itemsData = await itemsRes.json();
      const suppliersData = await supplierRes.json();
      const locationsData = locationsRes.ok ? await locationsRes.json() : [];
      setItems(Array.isArray(itemsData) ? itemsData : []);
      setSuppliers(Array.isArray(suppliersData) ? suppliersData : []);
      setLocations(Array.isArray(locationsData) ? locationsData : []);
      setError("");
    } catch (error) {
      console.error("Failed to fetch data:", error);
      setError("Could not load items right now. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function handleAIScan(file: File) {
    setAiScanning(true);
    setAiError("");
    setAiResult(null);
    try {
      const body = new FormData();
      body.append("image", file);
      const res = await fetch("/api/ai/identify-item", { method: "POST", body });
      const data = await res.json();
      if (!res.ok) {
        setAiError(data.error || "AI scan failed.");
        return;
      }
      setAiResult(data as AiResult);
    } catch {
      setAiError("AI scan failed. Please try again.");
    } finally {
      setAiScanning(false);
    }
  }

  async function handlePhotoUpload(file: File) {
    setPhotoUploading(true);
    try {
      const dataUrl = await compressImage(file);
      setPhotoPreview(dataUrl);
    } catch {
      setError("Failed to process photo. Please try a different image.");
    } finally {
      setPhotoUploading(false);
    }
  }

  function applyAiResult() {
    if (!aiResult) return;
    setFormData((prev) => ({
      ...prev,
      name: aiResult!.name || prev.name,
      manufacturer: aiResult!.manufacturer || prev.manufacturer,
      partNumber: aiResult!.partNumber || prev.partNumber,
      modelNumber: aiResult!.modelNumber || prev.modelNumber,
      description: aiResult!.description || prev.description,
    }));
    setAiResult(null);
  }

  async function handleAddItem(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!formData.name.trim()) {
      setError("Item name is required.");
      return;
    }

    const lowStockAlert =
      formData.lowStockAmberThreshold === "" ? 5 : Number(formData.lowStockAmberThreshold);
    const criticalStockAlert =
      formData.lowStockRedThreshold === "" ? 2 : Number(formData.lowStockRedThreshold);
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
      name: formData.name.trim(),
      manufacturer: normalizeOptionalText(formData.manufacturer),
      partNumber: normalizeOptionalText(formData.partNumber),
      modelNumber: normalizeOptionalText(formData.modelNumber),
      serialNumber: normalizeOptionalText(formData.serialNumber),
      barcode: normalizeOptionalText(formData.barcode),
      description: normalizeOptionalText(formData.description),
      photoUrl: photoPreview || undefined,
      quantityOnHand,
      lowStockAmberThreshold: lowStockAlert,
      lowStockRedThreshold: criticalStockAlert,
      preferredSupplierId: normalizeOptionalText(formData.preferredSupplierId),
      lastUnitCost: Number.isFinite(formData.lastUnitCost) ? formData.lastUnitCost : undefined,
      unitOfMeasure: normalizeOptionalText(formData.unitOfMeasure) || "units",
      locationId: normalizeOptionalText(formData.locationId),
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
          description: "",
          quantityOnHand: "",
          lowStockAmberThreshold: "",
          lowStockRedThreshold: "",
          preferredSupplierId: "",
          lastUnitCost: 0,
          unitOfMeasure: "units",
          locationId: "",
        });
        setPhotoPreview("");
        setShowForm(false);
        fetchData();
      } else {
        const errBody = await res.json().catch(() => null);
        if (Array.isArray(errBody?.error)) {
          const message = errBody.error[0]?.message;
          setError(typeof message === "string" ? message : "Failed to save item.");
        } else {
          setError(errBody?.error || "Failed to save item.");
        }
      }
    } catch (error) {
      console.error("Failed to add item:", error);
      setError("Failed to save item. Please try again.");
    }
  }

  const filteredItems = items.filter((item) => {
    if (stockFilter === "critical" && item.quantityOnHand > item.lowStockRedThreshold) return false;
    if (stockFilter === "low" && item.quantityOnHand > item.lowStockAmberThreshold) return false;
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      item.name.toLowerCase().includes(q) ||
      (item.manufacturer ?? "").toLowerCase().includes(q) ||
      (item.partNumber ?? "").toLowerCase().includes(q) ||
      (item.modelNumber ?? "").toLowerCase().includes(q) ||
      (item.description ?? "").toLowerCase().includes(q) ||
      (item.serialNumber ?? "").toLowerCase().includes(q) ||
      (item.barcode ?? "").toLowerCase().includes(q)
    );
  });

  const lowCount = items.filter((i) => i.quantityOnHand <= i.lowStockAmberThreshold && i.quantityOnHand > i.lowStockRedThreshold).length;
  const criticalCount = items.filter((i) => i.quantityOnHand <= i.lowStockRedThreshold).length;

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <p className="text-slate-400 animate-pulse">Loading items...</p>
      </div>
    );
  }

  return (
    <main className="mx-auto px-4 sm:px-6 lg:px-8 py-8 max-w-6xl form-screen">

      {/* ─── Page Header ─── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1
            className="font-bold text-white leading-none"
            style={{ fontSize: "26px", letterSpacing: "-0.02em" }}
          >
            Inventory
          </h1>
          <p className="text-xs text-slate-500 mt-1.5 uppercase tracking-widest font-medium">
            {items.length} item{items.length !== 1 ? "s" : ""}
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <Link
            href="/scan"
            prefetch={false}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-sm font-medium text-slate-300 transition-colors hover:text-white hover:bg-white/[0.06]"
            style={{ border: "1px solid rgba(148,163,184,0.15)" }}
          >
            <span style={{ fontSize: "13px" }}>⬡</span>
            Scan
          </Link>
          <button
            onClick={() => { setShowForm(!showForm); setError(""); }}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold text-white transition-all hover:brightness-110 active:scale-[0.97]"
            style={{
              background: showForm
                ? "rgba(71,85,105,0.7)"
                : "linear-gradient(135deg, #5b5ef4 0%, #818cf8 100%)",
              boxShadow: showForm ? "none" : "0 3px 14px rgba(91,94,244,0.35)",
            }}
          >
            {showForm ? "✕ Cancel" : "+ Add Item"}
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-5 rounded-xl border border-red-400/30 bg-red-500/[0.08] px-4 py-3 text-sm text-red-300">
          {error}
        </div>
      )}

      {/* ─── Filter chips + Search ─── */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="flex items-center gap-1.5 shrink-0">
          {(["all", "low", "critical"] as const).map((f) => {
            const labels = { all: "All Parts", low: `Low Stock${lowCount > 0 ? ` (${lowCount})` : ""}`, critical: `Critical${criticalCount > 0 ? ` (${criticalCount})` : ""}` };
            const active = stockFilter === f;
            return (
              <button
                key={f}
                onClick={() => setStockFilter(f)}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors"
                style={{
                  background: active
                    ? f === "critical" ? "rgba(239,68,68,0.18)" : f === "low" ? "rgba(245,158,11,0.16)" : "rgba(255,255,255,0.08)"
                    : "transparent",
                  border: active
                    ? f === "critical" ? "1px solid rgba(239,68,68,0.35)" : f === "low" ? "1px solid rgba(245,158,11,0.30)" : "1px solid rgba(255,255,255,0.12)"
                    : "1px solid rgba(148,163,184,0.12)",
                  color: active
                    ? f === "critical" ? "#fca5a5" : f === "low" ? "#fcd34d" : "#e2e8f0"
                    : "rgba(148,163,184,0.6)",
                }}
              >
                {labels[f]}
              </button>
            );
          })}
        </div>
        <input
          className="flex-1 rounded-xl text-slate-100 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
          style={{
            background: "rgba(15,23,42,0.6)",
            border: "1px solid rgba(148,163,184,0.12)",
          }}
          placeholder="Search name, manufacturer, part number…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {showForm && (
        <GlassBubbleCard className="mb-6">
          {/* AI Scan panel */}
          <div className="mb-4 rounded-xl border border-slate-700/70 bg-slate-900/60 p-3">
            <p className="text-sm font-semibold text-slate-200 mb-1">📷 AI Item Recognition</p>
            <p className="text-xs text-slate-400 mb-3">
              Take or upload a photo — AI will try to identify the item and pre-fill the form.
            </p>
            <div className="flex flex-wrap gap-2">
              <label className="flex items-center gap-2 px-3 py-2 rounded-lg bg-cyan-700 hover:bg-cyan-600 text-white text-sm font-semibold cursor-pointer select-none">
                📷 Use Camera
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="sr-only"
                  disabled={aiScanning}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) void handleAIScan(file);
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
                  disabled={aiScanning}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) void handleAIScan(file);
                    e.target.value = "";
                  }}
                />
              </label>
            </div>
            {aiScanning && (
              <p className="mt-2 text-xs text-cyan-400 animate-pulse">Analyzing image with AI…</p>
            )}
            {aiError && <p className="mt-2 text-xs text-red-400">{aiError}</p>}
            {aiResult && (
              <div className="mt-3 rounded-lg border border-cyan-700/50 bg-cyan-950/40 p-3 text-sm">
                <p className="font-semibold text-cyan-200 mb-2">AI Detected:</p>
                {aiResult.name && (
                  <p className="text-slate-300">
                    <span className="text-slate-400">Name:</span> {aiResult.name}
                  </p>
                )}
                {aiResult.manufacturer && (
                  <p className="text-slate-300">
                    <span className="text-slate-400">Brand:</span> {aiResult.manufacturer}
                  </p>
                )}
                {aiResult.partNumber && (
                  <p className="text-slate-300">
                    <span className="text-slate-400">Part #:</span> {aiResult.partNumber}
                  </p>
                )}
                {aiResult.modelNumber && (
                  <p className="text-slate-300">
                    <span className="text-slate-400">Model:</span> {aiResult.modelNumber}
                  </p>
                )}
                {aiResult.material && (
                  <p className="text-slate-300">
                    <span className="text-slate-400">Material:</span> {aiResult.material}
                  </p>
                )}
                {aiResult.description && (
                  <p className="text-xs text-slate-400 mt-1">{aiResult.description}</p>
                )}
                {aiResult.confidence !== undefined && (
                  <p className="text-xs text-slate-500 mt-1">
                    Confidence: {Math.round(aiResult.confidence * 100)}%
                  </p>
                )}
                <div className="flex gap-2 mt-3">
                  <button
                    type="button"
                    onClick={applyAiResult}
                    className="px-3 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-sm font-semibold"
                  >
                    Apply to Form
                  </button>
                  <button
                    type="button"
                    onClick={() => setAiResult(null)}
                    className="px-3 py-1.5 rounded-lg bg-slate-600 hover:bg-slate-500 text-white text-sm"
                  >
                    Dismiss
                  </button>
                </div>
              </div>
            )}
          </div>

          <form onSubmit={handleAddItem}>
            <div className="space-y-4">
              {/* Item Photo Upload */}
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-2">
                  Item Photo
                  <span className="ml-1 text-slate-500 font-normal">(auto-compressed to thumbnail size)</span>
                </label>
                <div className="flex items-center gap-3">
                  {photoPreview ? (
                    <div className="relative">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={photoPreview}
                        alt="Preview"
                        className="w-16 h-16 object-cover rounded-lg border border-slate-600 cursor-pointer"
                        onClick={() => setEnlargedPhoto(photoPreview)}
                      />
                      <button
                        type="button"
                        onClick={() => setPhotoPreview("")}
                        className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-red-600 text-white text-xs flex items-center justify-center"
                      >
                        ✕
                      </button>
                    </div>
                  ) : (
                    <div className="w-16 h-16 rounded-lg border-2 border-dashed border-slate-600 flex items-center justify-center text-slate-500 text-xs text-center">
                      No photo
                    </div>
                  )}
                  <label className="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-white text-sm font-medium cursor-pointer select-none">
                    {photoUploading ? "Processing…" : "📷 Upload Photo"}
                    <input
                      type="file"
                      accept="image/*"
                      className="sr-only"
                      disabled={photoUploading}
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) void handlePhotoUpload(file);
                        e.target.value = "";
                      }}
                    />
                  </label>
                </div>
              </div>

              <input
                type="text"
                placeholder="Item Name *"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
                className="w-full rounded-xl bg-slate-800 border border-slate-600 text-slate-100 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <input
                  type="text"
                  placeholder="Manufacturer (optional)"
                  value={formData.manufacturer}
                  onChange={(e) => setFormData({ ...formData, manufacturer: e.target.value })}
                  className="rounded-xl bg-slate-800 border border-slate-600 text-slate-100 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
                <input
                  type="text"
                  placeholder="Part Number (optional)"
                  value={formData.partNumber}
                  onChange={(e) => setFormData({ ...formData, partNumber: e.target.value })}
                  className="rounded-xl bg-slate-800 border border-slate-600 text-slate-100 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
                <input
                  type="text"
                  placeholder="Model Number (optional)"
                  value={formData.modelNumber}
                  onChange={(e) => setFormData({ ...formData, modelNumber: e.target.value })}
                  className="rounded-xl bg-slate-800 border border-slate-600 text-slate-100 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
                <input
                  type="text"
                  placeholder="Serial Number (optional)"
                  value={formData.serialNumber}
                  onChange={(e) => setFormData({ ...formData, serialNumber: e.target.value })}
                  className="rounded-xl bg-slate-800 border border-slate-600 text-slate-100 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>
              <textarea
                placeholder="Description (optional) — helps with searching"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={2}
                className="w-full rounded-xl bg-slate-800 border border-slate-600 text-slate-100 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 resize-none"
              />
              <input
                type="text"
                placeholder="Barcode (optional)"
                value={formData.barcode}
                onChange={(e) => setFormData({ ...formData, barcode: e.target.value })}
                className="w-full rounded-xl bg-slate-800 border border-slate-600 text-slate-100 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
              <input
                type="number"
                placeholder="Quantity on Hand (optional; defaults to 0)"
                value={formData.quantityOnHand}
                onChange={(e) => setFormData({ ...formData, quantityOnHand: e.target.value })}
                min={0}
                step={1}
                className="w-full rounded-xl bg-slate-800 border border-slate-600 text-slate-100 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <input
                  type="number"
                  placeholder="Low Stock Alert (defaults to 5)"
                  value={formData.lowStockAmberThreshold}
                  onChange={(e) => setFormData({ ...formData, lowStockAmberThreshold: e.target.value })}
                  min={1}
                  step={1}
                  className="rounded-xl bg-slate-800 border border-amber-700/50 text-slate-100 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
                <input
                  type="number"
                  placeholder="Critical Stock Alert (defaults to 2)"
                  value={formData.lowStockRedThreshold}
                  onChange={(e) => setFormData({ ...formData, lowStockRedThreshold: e.target.value })}
                  min={0}
                  step={1}
                  className="rounded-xl bg-slate-800 border border-red-700/50 text-slate-100 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
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
                onChange={(e) => setFormData({ ...formData, preferredSupplierId: e.target.value })}
                className="w-full rounded-xl bg-slate-800 border border-slate-600 text-slate-100 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
              >
                <option value="">Select Supplier (optional)</option>
                {suppliers.map((supplier) => (
                  <option key={supplier.id} value={supplier.id}>
                    {supplier.name}
                  </option>
                ))}
              </select>
              <select
                value={formData.locationId}
                onChange={(e) => setFormData({ ...formData, locationId: e.target.value })}
                className="w-full rounded-xl bg-slate-800 border border-slate-600 text-slate-100 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
              >
                <option value="">Assign to Location (optional)</option>
                {locations.map((loc) => (
                  <option key={loc.id} value={loc.id}>
                    {loc.name}{loc.description ? ` — ${loc.description}` : ""}
                  </option>
                ))}
              </select>
              {isAdmin && (
                <input
                  type="number"
                  placeholder="Unit Cost $ (optional)"
                  value={formData.lastUnitCost || ""}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      lastUnitCost: isNaN(e.currentTarget.valueAsNumber) ? 0 : e.currentTarget.valueAsNumber,
                    })
                  }
                  min={0}
                  step="0.01"
                  className="w-full rounded-xl bg-slate-800 border border-slate-600 text-slate-100 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              )}
              <button
                type="submit"
                className="w-full rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-semibold py-2.5 text-sm"
              >
                Save Item
              </button>
            </div>
          </form>
        </GlassBubbleCard>
      )}

      {/* ─── Item list (row layout) ─── */}
      <div
        className="rounded-2xl overflow-hidden"
        style={{ border: "1px solid rgba(255,255,255,0.06)" }}
      >
        {filteredItems.map((item, idx) => {
          const isCritical = item.quantityOnHand <= item.lowStockRedThreshold;
          const isLow = !isCritical && item.quantityOnHand <= item.lowStockAmberThreshold;
          const isLast = idx === filteredItems.length - 1;
          return (
            <div
              key={item.id}
              className="flex items-center gap-4 px-4 py-3.5 transition-colors hover:bg-white/[0.025]"
              style={{
                background: isCritical
                  ? "rgba(239,68,68,0.04)"
                  : isLow
                  ? "rgba(245,158,11,0.03)"
                  : "rgba(12,17,36,0.85)",
                borderBottom: isLast ? "none" : "1px solid rgba(255,255,255,0.05)",
              }}
            >
              {/* Thumb */}
              <div className="shrink-0">
                {item.photoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={item.photoUrl}
                    alt={item.name}
                    className="object-cover rounded-lg border border-white/10 cursor-pointer hover:opacity-80 transition-opacity"
                    style={{ width: "40px", height: "40px" }}
                    onClick={() => setEnlargedPhoto(item.photoUrl!)}
                    title="Click to enlarge"
                  />
                ) : (
                  <div
                    className="flex items-center justify-center rounded-lg text-base"
                    style={{
                      width: "40px",
                      height: "40px",
                      background: "rgba(255,255,255,0.04)",
                      border: "1px solid rgba(255,255,255,0.06)",
                    }}
                  >
                    📦
                  </div>
                )}
              </div>

              {/* Name + meta */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-slate-100 truncate leading-tight">{item.name}</p>
                <p className="text-xs text-slate-500 truncate mt-0.5">
                  {[item.manufacturer, item.partNumber ? `#${item.partNumber}` : null, item.modelNumber]
                    .filter(Boolean)
                    .join(" · ") || <span className="italic">No details</span>}
                </p>
              </div>

              {/* Qty + status */}
              <div className="shrink-0 flex items-center gap-2.5 text-right">
                {(isCritical || isLow) && (
                  <span
                    className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-md hidden sm:inline-block"
                    style={{
                      background: isCritical ? "rgba(239,68,68,0.14)" : "rgba(245,158,11,0.13)",
                      color: isCritical ? "#fca5a5" : "#fcd34d",
                      border: isCritical ? "1px solid rgba(239,68,68,0.22)" : "1px solid rgba(245,158,11,0.20)",
                    }}
                  >
                    {isCritical ? "Critical" : "Low"}
                  </span>
                )}
                <div>
                  <p
                    className="text-sm font-bold tabular-nums"
                    style={{
                      color: isCritical ? "#f87171" : isLow ? "#fbbf24" : "#cbd5e1",
                    }}
                  >
                    {item.quantityOnHand}
                  </p>
                  <p className="text-[10px] text-slate-600 text-right">{item.unitOfMeasure}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {filteredItems.length === 0 && (
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
              background: "rgba(99,102,241,0.10)",
              border: "1px solid rgba(129,140,248,0.14)",
            }}
          >
            📦
          </div>
          {search || stockFilter !== "all" ? (
            <>
              <p className="font-semibold text-slate-300 mb-1">No matching items</p>
              <p className="text-sm text-slate-500">Try a different search or filter</p>
            </>
          ) : (
            <>
              <p className="font-semibold text-slate-200 mb-1.5">No inventory yet</p>
              <p className="text-sm text-slate-500 mb-6">Add your first part to get started</p>
              <button
                onClick={() => { setShowForm(true); setError(""); }}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white"
                style={{
                  background: "linear-gradient(135deg, #5b5ef4 0%, #818cf8 100%)",
                  boxShadow: "0 3px 16px rgba(91,94,244,0.30)",
                }}
              >
                + Add Item
              </button>
            </>
          )}
        </div>
      )}

      {/* Photo enlarge modal */}
      {enlargedPhoto && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
          onClick={() => setEnlargedPhoto(null)}
        >
          <div className="relative max-w-sm w-full" onClick={(e) => e.stopPropagation()}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={enlargedPhoto}
              alt="Item photo"
              className="w-full rounded-2xl border border-slate-700 shadow-2xl"
            />
            <button
              onClick={() => setEnlargedPhoto(null)}
              className="absolute -top-3 -right-3 w-8 h-8 rounded-full bg-slate-800 border border-slate-600 text-slate-200 text-lg flex items-center justify-center hover:bg-slate-700"
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </main>
  );
}

