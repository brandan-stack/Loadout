"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle, Boxes, CircleAlert, ScanLine, Warehouse } from "lucide-react";
import type { UserRole } from "@/lib/auth";
import {
  TAB_DATA_CACHE_KEYS,
  getCachedData,
  invalidateCachedData,
  primeCachedData,
} from "@/lib/client-data-cache";
import { StatCard } from "@/components/cards/StatCard";
import { PageSection, PageShell } from "@/components/layout/page-shell";
import { SidePanel } from "@/components/panels/SidePanel";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { FilterTabs } from "@/components/ui/FilterTabs";
import { PageHeader } from "@/components/ui/PageHeader";
import { SearchBar } from "@/components/ui/SearchBar";

const INVENTORY_ROW_HEIGHT = 68;
const INVENTORY_ROW_OVERSCAN = 8;
const INVENTORY_VIRTUALIZATION_THRESHOLD = 90;

interface AiResult {
  name?: string;
  manufacturer?: string;
  partNumber?: string;
  modelNumber?: string;
  description?: string;
  material?: string;
  confidence?: number;
}

export interface InventoryPageSupplier {
  id: string;
  name: string;
  leadTimeD: number;
}

export interface InventoryPageLocation {
  id: string;
  name: string;
  description?: string;
}

export interface InventoryPageItem {
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

interface ItemCatalogClientProps {
  currentUserRole: UserRole;
  initialItems: InventoryPageItem[];
  initialSuppliers: InventoryPageSupplier[];
  initialLocations: InventoryPageLocation[];
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

export function ItemCatalogClient({
  currentUserRole,
  initialItems,
  initialSuppliers,
  initialLocations,
}: ItemCatalogClientProps) {
  const isAdmin = currentUserRole === "SUPER_ADMIN" || currentUserRole === "OFFICE";
  const [items, setItems] = useState<InventoryPageItem[]>(initialItems);
  const [suppliers, setSuppliers] = useState<InventoryPageSupplier[]>(initialSuppliers);
  const [locations, setLocations] = useState<InventoryPageLocation[]>(initialLocations);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState<string>("");
  const [search, setSearch] = useState("");
  const [stockFilter, setStockFilter] = useState<"all" | "low" | "critical">("all");
  const [aiScanning, setAiScanning] = useState(false);
  const [aiResult, setAiResult] = useState<AiResult | null>(null);
  const [aiError, setAiError] = useState("");
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
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
    primeCachedData(TAB_DATA_CACHE_KEYS.items, initialItems);
    primeCachedData(TAB_DATA_CACHE_KEYS.suppliers, initialSuppliers);
    primeCachedData(TAB_DATA_CACHE_KEYS.locations, initialLocations);
  }, [initialItems, initialSuppliers, initialLocations]);

  async function fetchData(force = false) {
    setLoading(force);

    try {
      if (force) {
        invalidateCachedData([
          TAB_DATA_CACHE_KEYS.items,
          TAB_DATA_CACHE_KEYS.suppliers,
          TAB_DATA_CACHE_KEYS.locations,
        ]);
      }

      const [itemsData, suppliersData, locationsData] = await Promise.all([
        getCachedData<InventoryPageItem[]>(TAB_DATA_CACHE_KEYS.items, async () => {
          const res = await fetch("/api/items", { cache: "no-store" });
          if (!res.ok) {
            throw new Error("Failed to load inventory items");
          }
          return res.json() as Promise<InventoryPageItem[]>;
        }),
        getCachedData<InventoryPageSupplier[]>(TAB_DATA_CACHE_KEYS.suppliers, async () => {
          const res = await fetch("/api/suppliers", { cache: "no-store" });
          if (!res.ok) {
            throw new Error("Failed to load suppliers");
          }
          return res.json() as Promise<InventoryPageSupplier[]>;
        }),
        getCachedData<InventoryPageLocation[]>(TAB_DATA_CACHE_KEYS.locations, async () => {
          const res = await fetch("/api/locations", { cache: "no-store" });
          if (!res.ok) {
            return [];
          }
          return res.json() as Promise<InventoryPageLocation[]>;
        }),
      ]);

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
        invalidateCachedData([TAB_DATA_CACHE_KEYS.items, TAB_DATA_CACHE_KEYS.reorder]);
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
        void fetchData(true);
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
  const selectedItem = items.find((item) => item.id === selectedItemId) ?? null;
  const supplierNamesById = useMemo(
    () => new Map(suppliers.map((supplier) => [supplier.id, supplier.name])),
    [suppliers]
  );

  if (loading) {
    return (
      <PageShell>
        <p className="text-sm text-slate-400 animate-pulse">Loading inventory...</p>
      </PageShell>
    );
  }

  return (
    <PageShell className="form-screen">
      <PageHeader
        eyebrow={<Badge tone="blue">Inventory Workspace</Badge>}
        title="See stock pressure before it slows the team"
        description="Track the current count, isolate low-stock risk quickly, and add new items without leaving the list."
        actions={
          <>
            <Button variant="secondary" href="/scan">
              <ScanLine className="h-4 w-4" />
              Scan
            </Button>
            <Button variant="primary" onClick={() => { setShowForm(true); setError(""); }}>
              Add item
            </Button>
          </>
        }
      />

      {error ? (
        <PageSection>
          <Card className="border-rose-400/20 bg-rose-500/[0.08] text-rose-100">{error}</Card>
        </PageSection>
      ) : null}

      <PageSection className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Items" value={String(items.length)} hint="Tracked inventory records" tone="blue" icon={Boxes} />
        <StatCard label="Low stock" value={String(lowCount)} hint="Below low threshold" trend={lowCount > 0 ? "Watch" : "Clear"} tone={lowCount > 0 ? "orange" : "green"} icon={AlertTriangle} />
        <StatCard label="Critical" value={String(criticalCount)} hint="Needs attention first" trend={criticalCount > 0 ? "Act now" : "Stable"} tone={criticalCount > 0 ? "red" : "green"} icon={CircleAlert} />
        <StatCard label="Locations" value={String(locations.length)} hint="Storage points in rotation" tone="teal" icon={Warehouse} />
      </PageSection>

      <PageSection>
        <Card className="space-y-4">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-white">Stock controls</h2>
              <p className="mt-2 text-sm leading-6 text-slate-300/78">Search by part details, then isolate the queue to all parts, low stock, or critical shortages.</p>
            </div>
            <Badge tone="slate">{filteredItems.length} showing</Badge>
          </div>
          <div className="grid gap-4 xl:grid-cols-[minmax(0,24rem)_minmax(0,1fr)]">
            <SearchBar value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search name, manufacturer, part number..." />
            <FilterTabs
              value={stockFilter}
              onChange={(value) => setStockFilter(value as "all" | "low" | "critical")}
              options={[
                { value: "all", label: "All parts", count: String(items.length) },
                { value: "low", label: "Low stock", count: String(lowCount) },
                { value: "critical", label: "Critical", count: String(criticalCount) },
              ]}
            />
          </div>
        </Card>
      </PageSection>

      <SidePanel
        open={showForm}
        onClose={() => setShowForm(false)}
        title="Add inventory item"
        description="Capture the important part metadata, thresholds, and supplier details without leaving the catalog."
      >
        <div
          className="rounded-2xl p-0"
          style={{ background: "rgba(12,17,36,0.95)" }}
        >
          {/* AI Scan panel */}
          <div className="mb-4 rounded-xl border border-slate-700/70 bg-slate-900/60 p-3">
            <p className="text-sm font-semibold text-slate-200 mb-1">📷 AI Item Recognition</p>
            <p className="text-xs text-slate-400 mb-3">
              Take or upload a photo — AI will try to identify the item and pre-fill the form.
            </p>
            <div className="flex flex-wrap gap-2">
              <label
                className="flex items-center gap-2 px-3 py-2 rounded-lg text-white text-sm font-semibold cursor-pointer select-none"
                style={{ background: "linear-gradient(135deg, #5b5ef4 0%, #818cf8 100%)" }}
              >
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
              <p className="mt-2 text-xs text-indigo-300 animate-pulse">Analyzing image with AI…</p>
            )}
            {aiError && <p className="mt-2 text-xs text-red-400">{aiError}</p>}
            {aiResult && (
              <div
                className="mt-3 rounded-lg p-3 text-sm"
                style={{
                  border: "1px solid rgba(129,140,248,0.24)",
                  background: "rgba(79,70,229,0.10)",
                }}
              >
                <p className="font-semibold text-indigo-200 mb-2">AI Detected:</p>
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
                    className="px-3 py-1.5 rounded-lg text-white text-sm font-semibold"
                    style={{ background: "linear-gradient(135deg, #5b5ef4 0%, #818cf8 100%)" }}
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
                        className="w-16 h-16 object-cover rounded-lg border border-slate-600"
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
                className="w-full rounded-xl text-slate-100 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                style={{ background: "rgba(15,23,42,0.6)", border: "1px solid rgba(148,163,184,0.12)" }}
              />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <input
                  type="text"
                  placeholder="Manufacturer (optional)"
                  value={formData.manufacturer}
                  onChange={(e) => setFormData({ ...formData, manufacturer: e.target.value })}
                  className="rounded-xl text-slate-100 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                  style={{ background: "rgba(15,23,42,0.6)", border: "1px solid rgba(148,163,184,0.12)" }}
                />
                <input
                  type="text"
                  placeholder="Part Number (optional)"
                  value={formData.partNumber}
                  onChange={(e) => setFormData({ ...formData, partNumber: e.target.value })}
                  className="rounded-xl text-slate-100 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                  style={{ background: "rgba(15,23,42,0.6)", border: "1px solid rgba(148,163,184,0.12)" }}
                />
                <input
                  type="text"
                  placeholder="Model Number (optional)"
                  value={formData.modelNumber}
                  onChange={(e) => setFormData({ ...formData, modelNumber: e.target.value })}
                  className="rounded-xl text-slate-100 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                  style={{ background: "rgba(15,23,42,0.6)", border: "1px solid rgba(148,163,184,0.12)" }}
                />
                <input
                  type="text"
                  placeholder="Serial Number (optional)"
                  value={formData.serialNumber}
                  onChange={(e) => setFormData({ ...formData, serialNumber: e.target.value })}
                  className="rounded-xl text-slate-100 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                  style={{ background: "rgba(15,23,42,0.6)", border: "1px solid rgba(148,163,184,0.12)" }}
                />
              </div>
              <textarea
                placeholder="Description (optional) — helps with searching"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={2}
                className="w-full rounded-xl text-slate-100 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 resize-none"
                style={{ background: "rgba(15,23,42,0.6)", border: "1px solid rgba(148,163,184,0.12)" }}
              />
              <input
                type="text"
                placeholder="Barcode (optional)"
                value={formData.barcode}
                onChange={(e) => setFormData({ ...formData, barcode: e.target.value })}
                className="w-full rounded-xl text-slate-100 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                style={{ background: "rgba(15,23,42,0.6)", border: "1px solid rgba(148,163,184,0.12)" }}
              />
              <input
                type="number"
                placeholder="Quantity on Hand (optional; defaults to 0)"
                value={formData.quantityOnHand}
                onChange={(e) => setFormData({ ...formData, quantityOnHand: e.target.value })}
                min={0}
                step={1}
                className="w-full rounded-xl text-slate-100 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                style={{ background: "rgba(15,23,42,0.6)", border: "1px solid rgba(148,163,184,0.12)" }}
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
                className="w-full rounded-xl text-slate-100 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                style={{ background: "rgba(15,23,42,0.6)", border: "1px solid rgba(148,163,184,0.12)" }}
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
                className="w-full rounded-xl text-slate-100 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                style={{ background: "rgba(15,23,42,0.6)", border: "1px solid rgba(148,163,184,0.12)" }}
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
                  className="w-full rounded-xl text-slate-100 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                  style={{ background: "rgba(15,23,42,0.6)", border: "1px solid rgba(148,163,184,0.12)" }}
                />
              )}
              <button
                type="submit"
                className="w-full rounded-xl text-white font-semibold py-2.5 text-sm transition-all hover:brightness-110 active:scale-[0.98]"
                style={{
                  background: "linear-gradient(135deg, #5b5ef4 0%, #818cf8 100%)",
                  boxShadow: "0 3px 14px rgba(91,94,244,0.32)",
                }}
              >
                Save Item
              </button>
            </div>
          </form>
        </div>
      </SidePanel>

      {/* ─── Item list (row layout) ─── */}
      {filteredItems.length > 0 && (
        <InventoryItemList items={filteredItems} onSelectItem={setSelectedItemId} />
      )}

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

      <SidePanel
        open={selectedItem !== null}
        onClose={() => setSelectedItemId(null)}
        title={selectedItem?.name ?? "Item detail"}
        description={selectedItem?.manufacturer || selectedItem?.partNumber || "Inventory detail"}
        footer={selectedItem ? <Button className="w-full" variant="secondary" href="/reorder">Open reorder queue</Button> : null}
      >
        {selectedItem ? (
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <Badge tone={selectedItem.quantityOnHand <= selectedItem.lowStockRedThreshold ? "red" : selectedItem.quantityOnHand <= selectedItem.lowStockAmberThreshold ? "orange" : "green"}>
                {selectedItem.quantityOnHand <= selectedItem.lowStockRedThreshold ? "Critical stock" : selectedItem.quantityOnHand <= selectedItem.lowStockAmberThreshold ? "Low stock" : "In range"}
              </Badge>
              <Badge tone="slate">{selectedItem.quantityOnHand} {selectedItem.unitOfMeasure}</Badge>
            </div>
            {selectedItem.photoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={selectedItem.photoUrl} alt={selectedItem.name} className="w-full rounded-3xl border border-white/10 object-cover" />
            ) : null}
            <Card className="space-y-4 bg-white/[0.04]">
              <DetailRow label="Manufacturer" value={selectedItem.manufacturer || "Not set"} />
              <DetailRow label="Part number" value={selectedItem.partNumber || "Not set"} />
              <DetailRow label="Model" value={selectedItem.modelNumber || "Not set"} />
              <DetailRow label="Serial" value={selectedItem.serialNumber || "Not set"} />
              <DetailRow label="Barcode" value={selectedItem.barcode || "Not set"} />
              <DetailRow label="Supplier" value={selectedItem.preferredSupplierId ? supplierNamesById.get(selectedItem.preferredSupplierId) || "Linked" : "Not linked"} />
            </Card>
            {selectedItem.description ? <p className="text-sm leading-6 text-slate-300/78">{selectedItem.description}</p> : null}
          </div>
        ) : null}
      </SidePanel>
    </PageShell>
  );
}

function InventoryItemList({
  items,
  onSelectItem,
}: {
  items: InventoryPageItem[];
  onSelectItem: (itemId: string) => void;
}) {
  if (items.length < INVENTORY_VIRTUALIZATION_THRESHOLD) {
    return (
      <div
        className="rounded-2xl overflow-hidden"
        style={{ border: "1px solid rgba(255,255,255,0.06)" }}
      >
        {items.map((item, idx) => (
          <InventoryRow
            key={item.id}
            item={item}
            isLast={idx === items.length - 1}
            onSelectItem={onSelectItem}
          />
        ))}
      </div>
    );
  }

  return <VirtualizedInventoryRows items={items} onSelectItem={onSelectItem} />;
}

function VirtualizedInventoryRows({
  items,
  onSelectItem,
}: {
  items: InventoryPageItem[];
  onSelectItem: (itemId: string) => void;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [range, setRange] = useState({
    start: 0,
    end: Math.min(items.length, 18),
  });

  useEffect(() => {
    let frameId = 0;

    const updateRange = () => {
      frameId = 0;

      const container = containerRef.current;
      if (!container) {
        return;
      }

      const totalHeight = items.length * INVENTORY_ROW_HEIGHT;
      const rect = container.getBoundingClientRect();
      const viewportTop = window.scrollY;
      const viewportBottom = viewportTop + window.innerHeight;
      const containerTop = window.scrollY + rect.top;
      const containerBottom = containerTop + totalHeight;

      if (viewportBottom <= containerTop) {
        setRange((current) => (
          current.start === 0 && current.end === Math.min(items.length, 18)
            ? current
            : { start: 0, end: Math.min(items.length, 18) }
        ));
        return;
      }

      if (viewportTop >= containerBottom) {
        const nextStart = Math.max(0, items.length - 18);
        setRange((current) => (
          current.start === nextStart && current.end === items.length
            ? current
            : { start: nextStart, end: items.length }
        ));
        return;
      }

      const relativeTop = Math.max(0, viewportTop - containerTop);
      const relativeBottom = Math.min(totalHeight, viewportBottom - containerTop);
      const nextStart = Math.max(0, Math.floor(relativeTop / INVENTORY_ROW_HEIGHT) - INVENTORY_ROW_OVERSCAN);
      const nextEnd = Math.min(
        items.length,
        Math.ceil(relativeBottom / INVENTORY_ROW_HEIGHT) + INVENTORY_ROW_OVERSCAN
      );

      setRange((current) => (
        current.start === nextStart && current.end === nextEnd
          ? current
          : { start: nextStart, end: nextEnd }
      ));
    };

    const scheduleUpdate = () => {
      if (frameId !== 0) {
        return;
      }

      frameId = window.requestAnimationFrame(updateRange);
    };

    updateRange();
    window.addEventListener("scroll", scheduleUpdate, { passive: true });
    window.addEventListener("resize", scheduleUpdate);

    return () => {
      if (frameId !== 0) {
        window.cancelAnimationFrame(frameId);
      }
      window.removeEventListener("scroll", scheduleUpdate);
      window.removeEventListener("resize", scheduleUpdate);
    };
  }, [items.length]);

  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{ border: "1px solid rgba(255,255,255,0.06)" }}
    >
      <div
        ref={containerRef}
        className="relative"
        style={{ height: items.length * INVENTORY_ROW_HEIGHT }}
      >
        {items.slice(range.start, range.end).map((item, index) => {
          const absoluteIndex = range.start + index;

          return (
            <InventoryRow
              key={item.id}
              item={item}
              isLast={absoluteIndex === items.length - 1}
              onSelectItem={onSelectItem}
              top={absoluteIndex * INVENTORY_ROW_HEIGHT}
            />
          );
        })}
      </div>
    </div>
  );
}

function InventoryRow({
  item,
  isLast,
  onSelectItem,
  top,
}: {
  item: InventoryPageItem;
  isLast: boolean;
  onSelectItem: (itemId: string) => void;
  top?: number;
}) {
  const isCritical = item.quantityOnHand <= item.lowStockRedThreshold;
  const isLow = !isCritical && item.quantityOnHand <= item.lowStockAmberThreshold;

  return (
    <div
      className={`list-row-lazy flex cursor-pointer items-center gap-4 px-4 py-3.5 transition-colors hover:bg-white/[0.025] ${top !== undefined ? "absolute inset-x-0" : ""}`}
      style={{
        top,
        height: INVENTORY_ROW_HEIGHT,
        background: isCritical
          ? "rgba(239,68,68,0.04)"
          : isLow
            ? "rgba(245,158,11,0.03)"
            : "rgba(12,17,36,0.85)",
        borderBottom: isLast ? "none" : "1px solid rgba(255,255,255,0.05)",
      }}
      onClick={() => onSelectItem(item.id)}
    >
      <div className="shrink-0">
        {item.photoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={item.photoUrl}
            alt={item.name}
            loading="lazy"
            decoding="async"
            className="object-cover rounded-lg border border-white/10 cursor-pointer hover:opacity-80 transition-opacity"
            style={{ width: "40px", height: "40px" }}
            onClick={(event) => {
              event.stopPropagation();
              onSelectItem(item.id);
            }}
            title="Open item details"
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

      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-slate-100 truncate leading-tight">{item.name}</p>
        <p className="text-xs text-slate-500 truncate mt-0.5">
          {[item.manufacturer, item.partNumber ? `#${item.partNumber}` : null, item.modelNumber]
            .filter(Boolean)
            .join(" · ") || <span className="italic">No details</span>}
        </p>
      </div>

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
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">{label}</span>
      <span className="text-right text-sm font-medium text-white">{value}</span>
    </div>
  );
}

export default ItemCatalogClient;

