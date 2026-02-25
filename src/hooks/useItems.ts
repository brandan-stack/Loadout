import { useEffect, useMemo, useState } from "react";
import { logActivity } from "../lib/activityStore";

export type StockRow = {
  locationId: string; // "" = Missing Location
  quantity: number;
};

export type InventoryItem = {
  id: string;

  name: string;
  partNumber?: string;
  manufacturer?: string;
  model?: string;
  serial?: string;
  description?: string;

  categoryId?: string;
  subcategoryId?: string;

  lowStock?: number;
  unitPrice?: number;
  marginPercent?: number;
  photoDataUrl?: string;

  createdAt: number;
  updatedAt: number;

  stockByLocation: StockRow[];
};

const STORAGE_V2 = "inventory.items.v2";
const STORAGE_V1_CANDIDATES = ["inventory.items.v1", "inventory.items", "inventory.items.v0"];

function now() {
  return Date.now();
}
function newId() {
  return Math.random().toString(36).slice(2, 10) + "-" + Date.now().toString(36);
}
function clampInt(n: number) {
  if (!Number.isFinite(n)) return 0;
  const x = Math.floor(n);
  return x < 0 ? 0 : x;
}
function loadJSON(key: string) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}
function save(items: InventoryItem[]) {
  try {
    localStorage.setItem(STORAGE_V2, JSON.stringify(items));
  } catch (error) {
    console.warn("[Loadout Items] Save failed:", error);
  }
}

function loadCurrentItems(): InventoryItem[] {
  const v2 = loadJSON(STORAGE_V2);
  if (Array.isArray(v2)) {
    return (v2 as InventoryItem[]).map(normalizeItem);
  }
  const migrated = migrateFromAnyLegacy();
  save(migrated);
  return migrated;
}

function toRecord(v: unknown): Record<string, unknown> {
  if (typeof v === "object" && v !== null) return v as Record<string, unknown>;
  return {};
}

function normalizeItem(it: InventoryItem): InventoryItem {
  // merge duplicate location rows, drop zeros
  const map = new Map<string, number>();
  for (const r of it.stockByLocation ?? []) {
    const loc = String(r.locationId ?? "");
    const qty = clampInt(Number(r.quantity ?? 0));
    if (qty <= 0) continue;
    map.set(loc, (map.get(loc) ?? 0) + qty);
  }
  const rows: StockRow[] = Array.from(map.entries()).map(([locationId, quantity]) => ({ locationId, quantity }));
  return { ...it, stockByLocation: rows };
}

function migrateFromAnyLegacy(): InventoryItem[] {
  const v2 = loadJSON(STORAGE_V2);
  if (Array.isArray(v2)) return (v2 as InventoryItem[]).map(normalizeItem);

  for (const key of STORAGE_V1_CANDIDATES) {
    const legacy = loadJSON(key);
    if (!Array.isArray(legacy)) continue;

    const migrated: InventoryItem[] = legacy
      .filter(Boolean)
      .map((x) => {
        const rec = toRecord(x);
        const id = String(rec.id ?? newId());
        const name = String(rec.name ?? rec.itemName ?? "").trim();
        if (!name) return null;

        // already has stockByLocation
        if (Array.isArray(rec.stockByLocation)) {
          return normalizeItem({
            id,
            name,
            partNumber: String(rec.partNumber ?? rec.part ?? ""),
            manufacturer: String(rec.manufacturer ?? rec.mfr ?? ""),
            model: String(rec.model ?? rec.modelNumber ?? ""),
            serial: String(rec.serial ?? rec.serialNumber ?? ""),
            description: String(rec.description ?? ""),
            categoryId: String(rec.categoryId ?? ""),
            subcategoryId: String(rec.subcategoryId ?? ""),
            lowStock: typeof rec.lowStock === "number" ? rec.lowStock : undefined,
            unitPrice: typeof rec.unitPrice === "number" ? rec.unitPrice : typeof rec.price === "number" ? rec.price : undefined,
            marginPercent: typeof rec.marginPercent === "number" ? rec.marginPercent : typeof rec.margin === "number" ? rec.margin : undefined,
            photoDataUrl: typeof rec.photoDataUrl === "string" ? rec.photoDataUrl : typeof rec.photo === "string" ? rec.photo : undefined,
            createdAt: Number(rec.createdAt ?? now()),
            updatedAt: Number(rec.updatedAt ?? now()),
            stockByLocation: (rec.stockByLocation ?? [])
              .map((r) => {
                const row = toRecord(r);
                return { locationId: String(row.locationId ?? ""), quantity: clampInt(Number(row.quantity ?? 0)) };
              })
              .filter((r: StockRow) => r.quantity > 0),
          });
        }

        // legacy single qty + location
        const q = clampInt(Number(rec.quantity ?? rec.qty ?? rec.q ?? 0));
        const loc = typeof rec.locationId !== "undefined" ? String(rec.locationId ?? "") : typeof rec.location !== "undefined" ? String(rec.location ?? "") : "";
        return normalizeItem({
          id,
          name,
          partNumber: String(rec.partNumber ?? rec.part ?? ""),
          manufacturer: String(rec.manufacturer ?? rec.mfr ?? ""),
          model: String(rec.model ?? rec.modelNumber ?? ""),
          serial: String(rec.serial ?? rec.serialNumber ?? ""),
          description: String(rec.description ?? ""),
          categoryId: String(rec.categoryId ?? ""),
          subcategoryId: String(rec.subcategoryId ?? ""),
          lowStock: typeof rec.lowStock === "number" ? rec.lowStock : undefined,
          unitPrice: typeof rec.unitPrice === "number" ? rec.unitPrice : typeof rec.price === "number" ? rec.price : undefined,
          marginPercent: typeof rec.marginPercent === "number" ? rec.marginPercent : typeof rec.margin === "number" ? rec.margin : undefined,
          photoDataUrl: typeof rec.photoDataUrl === "string" ? rec.photoDataUrl : typeof rec.photo === "string" ? rec.photo : undefined,
          createdAt: Number(rec.createdAt ?? now()),
          updatedAt: Number(rec.updatedAt ?? now()),
          stockByLocation: q > 0 ? [{ locationId: loc, quantity: q }] : [],
        });
      })
      .filter(Boolean) as InventoryItem[];

    if (migrated.length) return migrated;
  }

  return [];
}

export function useItems() {
  const [items, setItems] = useState<InventoryItem[]>(() => loadCurrentItems());
  const setItemsAndPersist = (updater: (prev: InventoryItem[]) => InventoryItem[]) => {
    setItems((prev) => {
      const next = updater(prev);
      save(next);
      return next;
    });
  };

  useEffect(() => {
    const reloadFromStorage = () => setItems(loadCurrentItems());
    const onStorage = (event: StorageEvent) => {
      if (event.key && event.key !== STORAGE_V2) return;
      reloadFromStorage();
    };

    window.addEventListener("loadout:state-updated", reloadFromStorage);
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener("loadout:state-updated", reloadFromStorage);
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  const byId = useMemo(() => {
    const m = new Map<string, InventoryItem>();
    for (const it of items) m.set(it.id, it);
    return m;
  }, [items]);

  function addItem(input: {
    name: string;
    partNumber?: string;
    manufacturer?: string;
    model?: string;
    serial?: string;
    description?: string;
    categoryId?: string;
    subcategoryId?: string;
    lowStock?: number;
    unitPrice?: number;
    marginPercent?: number;
    photoDataUrl?: string;
    initialQty?: number;
    initialLocationId?: string;
  }) {
    const name = (input.name ?? "").trim();
    if (!name) return "";

    const id = newId();
    const createdAt = now();
    const initialQty = clampInt(Number(input.initialQty ?? 0));
    const initialLocationId = String(input.initialLocationId ?? "");

    const item: InventoryItem = normalizeItem({
      id,
      name,
      partNumber: input.partNumber?.trim() || "",
      manufacturer: input.manufacturer?.trim() || "",
      model: input.model?.trim() || "",
      serial: input.serial?.trim() || "",
      description: input.description?.trim() || "",
      categoryId: input.categoryId || "",
      subcategoryId: input.subcategoryId || "",
      lowStock: typeof input.lowStock === "number" ? input.lowStock : undefined,
      unitPrice: typeof input.unitPrice === "number" ? input.unitPrice : undefined,
      marginPercent: typeof input.marginPercent === "number" ? input.marginPercent : undefined,
      photoDataUrl: input.photoDataUrl,
      createdAt,
      updatedAt: createdAt,
      stockByLocation: initialQty > 0 ? [{ locationId: initialLocationId, quantity: initialQty }] : [],
    });

    setItemsAndPersist((prev) => [...prev, item]);

    logActivity({
      type: "ADD_ITEM",
      itemId: id,
      itemName: name,
      qty: initialQty,
      locationId: initialLocationId,
      note: initialQty > 0 ? "Created with initial stock" : "Created",
    });

    return id;
  }

  function updateItem(itemId: string, patch: Partial<Omit<InventoryItem, "id" | "createdAt" | "stockByLocation">>) {
    setItemsAndPersist((prev) =>
      prev.map((it) => {
        if (it.id !== itemId) return it;
        const updated = normalizeItem({
          ...it,
          ...patch,
          updatedAt: now(),
          stockByLocation: it.stockByLocation,
        });

        // simple audit note (we don’t diff deeply to keep it fast)
        logActivity({
          type: "EDIT_ITEM",
          itemId: it.id,
          itemName: updated.name,
          note: "Edited item details",
        });

        // photo change cue
        if (typeof patch.photoDataUrl !== "undefined") {
          logActivity({
            type: "PHOTO_CHANGE",
            itemId: it.id,
            itemName: updated.name,
            note: patch.photoDataUrl ? "Photo updated" : "Photo removed",
          });
        }

        // category change cue
        if (typeof patch.categoryId !== "undefined" || typeof patch.subcategoryId !== "undefined") {
          logActivity({
            type: "CATEGORY_CHANGE",
            itemId: it.id,
            itemName: updated.name,
            note: "Category/subcategory changed",
          });
        }

        return updated;
      })
    );
  }

  function deleteItem(itemId: string) {
    const it = byId.get(itemId);
    if (it) {
      logActivity({
        type: "DELETE_ITEM",
        itemId: it.id,
        itemName: it.name,
        note: "Deleted item",
      });
    }
    setItemsAndPersist((prev) => prev.filter((x) => x.id !== itemId));
  }

  /** Adjust stock at location by delta (+ receive, - take out) */
  function adjustAtLocation(itemId: string, locationId: string, delta: number) {
    const d = Math.floor(Number(delta));
    if (!Number.isFinite(d) || d === 0) return;

    setItemsAndPersist((prev) =>
      prev.map((it) => {
        if (it.id !== itemId) return it;

        const map = new Map<string, number>();
        for (const r of it.stockByLocation) map.set(r.locationId, r.quantity);

        const loc = String(locationId ?? "");
        const cur = map.get(loc) ?? 0;
        const next = cur + d;

        if (next <= 0) map.delete(loc);
        else map.set(loc, next);

        const updated = normalizeItem({
          ...it,
          updatedAt: now(),
          stockByLocation: Array.from(map.entries()).map(([locationId, quantity]) => ({ locationId, quantity })),
        });

        logActivity({
          type: d > 0 ? "RECEIVE" : "TAKE_OUT",
          itemId: it.id,
          itemName: it.name,
          locationId: loc,
          qty: Math.abs(d),
          note: d > 0 ? "Received stock" : "Took out stock",
        });

        return updated;
      })
    );
  }

  /** Move qty from one location to another (clamped to available) */
  function moveQty(itemId: string, fromLocationId: string, toLocationId: string, qty: number) {
    const q = clampInt(Number(qty));
    if (q <= 0) return;

    const fromLoc = String(fromLocationId ?? "");
    const toLoc = String(toLocationId ?? "");
    if (fromLoc === toLoc) return;

    setItemsAndPersist((prev) =>
      prev.map((it) => {
        if (it.id !== itemId) return it;

        const map = new Map<string, number>();
        for (const r of it.stockByLocation) map.set(r.locationId, r.quantity);

        const available = map.get(fromLoc) ?? 0;
        const moved = Math.min(available, q);
        if (moved <= 0) return it;

        const newFrom = available - moved;
        if (newFrom <= 0) map.delete(fromLoc);
        else map.set(fromLoc, newFrom);

        map.set(toLoc, (map.get(toLoc) ?? 0) + moved);

        const updated = normalizeItem({
          ...it,
          updatedAt: now(),
          stockByLocation: Array.from(map.entries()).map(([locationId, quantity]) => ({ locationId, quantity })),
        });

        logActivity({
          type: "MOVE",
          itemId: it.id,
          itemName: it.name,
          fromLocationId: fromLoc,
          toLocationId: toLoc,
          qty: moved,
          note: "Moved stock",
        });

        return updated;
      })
    );
  }

  // compatibility wrappers (keep older screens safe)
  function addQuantity(itemId: string, qty: number) {
    adjustAtLocation(itemId, "", clampInt(Number(qty)));
  }
  function takeQuantity(itemId: string, qty: number) {
    adjustAtLocation(itemId, "", -clampInt(Number(qty)));
  }
  function moveQuantity(itemId: string, toLocationId: string, qty: number) {
    moveQty(itemId, "", toLocationId, qty);
  }

  return {
    items,
    addItem,
    updateItem,
    deleteItem,
    adjustAtLocation,
    moveQty,
    addQuantity,
    takeQuantity,
    moveQuantity,
    byId,
  };
}