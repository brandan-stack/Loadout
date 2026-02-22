// src/components/InventoryScreen.tsx

import { useState, useMemo } from "react";
import { isUnlocked, loadSecuritySettings } from "../lib/authStore";
import { useItems } from "../hooks/useItems";
import { useLocations } from "../hooks/useLocations";
import { useCategories } from "../hooks/useCategories";

import StockModal from "./StockModal";

type ThemeSafeNumber = number;

function toInt(value: unknown, fallback: number = 0): number {
  // Handles unknown/string/number cleanly (fixes TS "unknown not assignable to number")
  if (typeof value === "number" && Number.isFinite(value)) return Math.trunc(value);
  if (typeof value === "string") {
    const n = parseInt(value.trim(), 10);
    return Number.isFinite(n) ? n : fallback;
  }
  return fallback;
}

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

function normalizeText(s: unknown) {
  return String(s ?? "").toLowerCase().trim();
}

export default function InventoryScreen() {
  const settings = loadSecuritySettings();
  const locked = !isUnlocked();

  const itemsApi: any = useItems();
  const locationsApi: any = useLocations();
  const categoriesApi: any = useCategories();

  const items: any[] = Array.isArray(itemsApi?.items) ? itemsApi.items : [];
  const roots: any[] = Array.isArray(locationsApi?.roots) ? locationsApi.roots : [];

  const categories: any[] = Array.isArray(categoriesApi?.categories) ? categoriesApi.categories : [];
  const subcategories: any[] = Array.isArray(categoriesApi?.subcategories)
    ? categoriesApi.subcategories
    : [];

  // ---- UI state
  const [query, setQuery] = useState("");
  const [lowOnly, setLowOnly] = useState(false);
  const [catFilter, setCatFilter] = useState<string>("all");
  const [subFilter, setSubFilter] = useState<string>("all");

  const [showAdd, setShowAdd] = useState(true);

  // ---- Add item form
  const [name, setName] = useState("");
  const [partNumber, setPartNumber] = useState("");
  const [manufacturer, setManufacturer] = useState("");
  const [model, setModel] = useState("");
  const [serial, setSerial] = useState("");
  const [description, setDescription] = useState("");

  const [initialQty, setInitialQty] = useState<ThemeSafeNumber>(0);
  const [lowStockAlert, setLowStockAlert] = useState<ThemeSafeNumber>(0);

  const [initialLocation, setInitialLocation] = useState<string>("");
  const [category, setCategory] = useState<string>("Uncategorized");
  const [subcategory, setSubcategory] = useState<string>("None");

  const [photoFile, setPhotoFile] = useState<File | null>(null);

  // ---- Stock modal
  const [stockOpen, setStockOpen] = useState(false);
  const [selectedStockItem, setSelectedStockItem] = useState<any | null>(null);

  const stockLocked = Boolean(locked && settings.requirePinForStock);

  const filtered = useMemo(() => {
    const q = normalizeText(query);

    return items
      .filter((it) => {
        if (!q) return true;

        const hay = [
          it?.name,
          it?.partNumber,
          it?.pn,
          it?.manufacturer,
          it?.mfr,
          it?.model,
          it?.serial,
          it?.sn,
          it?.description,
          it?.category,
          it?.subcategory,
        ]
          .map(normalizeText)
          .join(" ");

        return hay.includes(q);
      })
      .filter((it) => {
        if (!lowOnly) return true;

        const total = toInt(it?.totalQty ?? it?.total ?? it?.qty ?? 0, 0);
        const low = toInt(it?.lowStockAlert ?? it?.lowStock ?? it?.low ?? 0, 0);
        return low > 0 && total <= low;
      })
      .filter((it) => {
        if (catFilter === "all") return true;
        return String(it?.category ?? "Uncategorized") === catFilter;
      })
      .filter((it) => {
        if (subFilter === "all") return true;
        return String(it?.subcategory ?? "None") === subFilter;
      });
  }, [items, query, lowOnly, catFilter, subFilter]);

  function resetAddForm() {
    setName("");
    setPartNumber("");
    setManufacturer("");
    setModel("");
    setSerial("");
    setDescription("");
    setInitialQty(0);
    setLowStockAlert(0);
    setInitialLocation("");
    setCategory("Uncategorized");
    setSubcategory("None");
    setPhotoFile(null);
  }

  async function onCreateItem() {
    const cleanName = name.trim();
    if (!cleanName) {
      alert("Name is required.");
      return;
    }

    if (stockLocked) {
      alert("Stock actions are PIN-protected. Unlock in Settings.");
      return;
    }

    const qty = clamp(toInt(initialQty, 0), 0, 999999);
    const low = clamp(toInt(lowStockAlert, 0), 0, 999999);

    try {
      const payload: any = {
        name: cleanName,
        partNumber: partNumber.trim(),
        manufacturer: manufacturer.trim(),
        model: model.trim(),
        serial: serial.trim(),
        description: description.trim(),
        category: category || "Uncategorized",
        subcategory: subcategory || "None",
        lowStockAlert: low,
        initialQty: qty,
        initialLocation: initialLocation || undefined,
      };

      // Create
      const created = await itemsApi?.addItem?.(payload);

      // Optional photo attach (if your store supports it)
      if (photoFile && created?.id && typeof itemsApi?.setItemPhoto === "function") {
        await itemsApi.setItemPhoto(created.id, photoFile);
      }

      resetAddForm();
      setShowAdd(false);
    } catch (e: any) {
      console.error(e);
      alert(e?.message ?? "Failed to create item.");
    }
  }

  function openStock(it: any) {
    setSelectedStockItem(it);
    setStockOpen(true);
  }

  async function onDelete(it: any) {
    if (stockLocked) {
      alert("Delete is PIN-protected. Unlock in Settings.");
      return;
    }
    const ok = confirm(`Delete "${it?.name ?? "item"}"?`);
    if (!ok) return;

    try {
      await itemsApi?.deleteItem?.(it?.id);
    } catch (e: any) {
      console.error(e);
      alert(e?.message ?? "Delete failed.");
    }
  }

  // Unique category lists for filters (fallback-safe)
  const categoryOptions = useMemo(() => {
    const set = new Set<string>();
    for (const it of items) set.add(String(it?.category ?? "Uncategorized"));
    for (const c of categories) set.add(String(c?.name ?? c ?? ""));
    return ["all", ...Array.from(set).filter(Boolean).sort((a, b) => a.localeCompare(b))];
  }, [items, categories]);

  const subcategoryOptions = useMemo(() => {
    const set = new Set<string>();
    for (const it of items) set.add(String(it?.subcategory ?? "None"));
    for (const s of subcategories) set.add(String(s?.name ?? s ?? ""));
    return ["all", ...Array.from(set).filter(Boolean).sort((a, b) => a.localeCompare(b))];
  }, [items, subcategories]);

  return (
    <div style={{ padding: 16, maxWidth: 1200, margin: "0 auto" }}>
      {/* Header row */}
      <div style={{ display: "flex", gap: 12, alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <div style={{ fontSize: 24, fontWeight: 800, letterSpacing: 0.2 }}>Inventory</div>
          <div className="muted" style={{ marginTop: 2 }}>
            Clean. Fast. No drama.
          </div>
        </div>

        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <button className="btn" onClick={() => setShowAdd((v: boolean) => !v)}>
            {showAdd ? "Hide add" : "Add item"}
          </button>
        </div>
      </div>

      {/* Add Item */}
      {showAdd && (
        <div className="card" style={{ marginTop: 12, padding: 14 }}>
          <div style={{ fontWeight: 800, marginBottom: 10 }}>Add item</div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
            <div>
              <label className="label">Name</label>
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g., Brake coil" />
            </div>
            <div>
              <label className="label">Part #</label>
              <input
                value={partNumber}
                onChange={(e) => setPartNumber(e.target.value)}
                placeholder="e.g., 123-ABC"
              />
            </div>
            <div>
              <label className="label">Manufacturer</label>
              <input
                value={manufacturer}
                onChange={(e) => setManufacturer(e.target.value)}
                placeholder="e.g., Demag"
              />
            </div>

            <div>
              <label className="label">Model</label>
              <input value={model} onChange={(e) => setModel(e.target.value)} placeholder="optional" />
            </div>
            <div>
              <label className="label">Serial</label>
              <input value={serial} onChange={(e) => setSerial(e.target.value)} placeholder="optional" />
            </div>
            <div>
              <label className="label">Initial Location</label>
              <select value={initialLocation} onChange={(e) => setInitialLocation(e.target.value)}>
                <option value="">Missing Location</option>
                {(locationsApi?.flatList ?? []).map((loc: any) => (
                  <option key={loc?.id ?? loc?.path ?? loc?.name} value={String(loc?.id ?? loc?.path ?? loc?.name)}>
                    {String(loc?.label ?? loc?.name ?? loc?.path)}
                  </option>
                ))}
              </select>
            </div>

            <div style={{ gridColumn: "1 / span 3" }}>
              <label className="label">Description</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="notes, specs, what it fits..."
                rows={3}
              />
            </div>

            <div>
              <label className="label">Initial Qty</label>
              <input
                value={String(initialQty)}
                onChange={(e) => setInitialQty(toInt(e.target.value, 0))}
                inputMode="numeric"
                placeholder="blank = 0"
              />
            </div>

            <div>
              <label className="label">Low Stock Alert</label>
              <input
                value={String(lowStockAlert)}
                onChange={(e) => setLowStockAlert(toInt(e.target.value, 0))}
                inputMode="numeric"
                placeholder="blank = off"
              />
            </div>

            <div>
              <label className="label">Photo</label>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setPhotoFile(e.target.files?.[0] ?? null)}
              />
              {photoFile && (
                <div className="muted" style={{ fontSize: 12, marginTop: 6 }}>
                  Selected: {photoFile.name}
                </div>
              )}
            </div>

            <div>
              <label className="label">Category</label>
              <select value={category} onChange={(e) => setCategory(e.target.value)}>
                <option value="Uncategorized">Uncategorized</option>
                {categoryOptions
                  .filter((x: any) => x !== "all" && x !== "Uncategorized")
                  .map((c: any) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
              </select>
            </div>

            <div>
              <label className="label">Subcategory</label>
              <select value={subcategory} onChange={(e) => setSubcategory(e.target.value)}>
                <option value="None">None</option>
                {subcategoryOptions
                  .filter((x: any) => x !== "all" && x !== "None")
                  .map((s: any) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
              </select>
            </div>

            <div style={{ display: "flex", gap: 10, alignItems: "end", justifyContent: "flex-end" }}>
              <button className="btn" onClick={resetAddForm} type="button">
                Reset
              </button>
              <button className="btn primary" onClick={onCreateItem} type="button">
                Add item
              </button>
            </div>
          </div>

          {stockLocked && (
            <div className="muted" style={{ marginTop: 10 }}>
              Stock actions are PIN-protected. Unlock in <b>Settings</b>.
            </div>
          )}
        </div>
      )}

      {/* Filters */}
      <div className="card" style={{ marginTop: 12, padding: 14 }}>
        <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr", gap: 10, alignItems: "end" }}>
          <div>
            <label className="label">Search</label>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="name, PN, model, serial..."
            />
            <div style={{ display: "flex", gap: 10, marginTop: 8, alignItems: "center" }}>
              <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <input type="checkbox" checked={lowOnly} onChange={(e) => setLowOnly(e.target.checked)} />
                <span>Low stock only</span>
              </label>
              <span className="muted">Showing {filtered.length} items</span>
            </div>
          </div>

          <div>
            <label className="label">Category filter</label>
            <select value={catFilter} onChange={(e) => setCatFilter(e.target.value)}>
              {categoryOptions.map((c: any) => (
                <option key={c} value={c}>
                  {c === "all" ? "All categories" : c}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="label">Subcategory filter</label>
            <select value={subFilter} onChange={(e) => setSubFilter(e.target.value)}>
              {subcategoryOptions.map((s: any) => (
                <option key={s} value={s}>
                  {s === "all" ? "All subs" : s}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* List */}
      <div style={{ marginTop: 12, display: "grid", gap: 10 }}>
        {filtered.length === 0 ? (
          <div className="card" style={{ padding: 16 }}>
            <div style={{ fontWeight: 800 }}>No items found</div>
            <div className="muted" style={{ marginTop: 6 }}>
              Try clearing filters or search.
            </div>
          </div>
        ) : (
          filtered.map((it: any) => {
            const total = toInt(it?.totalQty ?? it?.total ?? it?.qty ?? 0, 0);
            const low = toInt(it?.lowStockAlert ?? it?.lowStock ?? it?.low ?? 0, 0);
            const isLow = low > 0 && total <= low;

            return (
              <div key={it?.id ?? `${it?.name}-${it?.partNumber}-${it?.serial}`} className="card" style={{ padding: 12 }}>
                <div style={{ display: "flex", gap: 12, alignItems: "center", justifyContent: "space-between" }}>
                  <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                    <div
                      style={{
                        width: 56,
                        height: 56,
                        borderRadius: 12,
                        overflow: "hidden",
                        background: "rgba(255,255,255,0.06)",
                        display: "grid",
                        placeItems: "center",
                        flexShrink: 0,
                      }}
                    >
                      {it?.photoUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={it.photoUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                      ) : (
                        <span className="muted" style={{ fontSize: 12 }}>
                          no photo
                        </span>
                      )}
                    </div>

                    <div>
                      <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                        <div style={{ fontSize: 16, fontWeight: 900 }}>{it?.name ?? "Unnamed item"}</div>
                        <span className="badge">{it?.category ?? "Uncategorized"}</span>
                        {it?.subcategory && it.subcategory !== "None" && <span className="badge">{it.subcategory}</span>}
                        {isLow && <span className="badge danger">LOW</span>}
                      </div>

                      <div className="muted" style={{ marginTop: 4, fontSize: 13 }}>
                        PN: <b>{it?.partNumber ?? it?.pn ?? "-"}</b> · Mfr: <b>{it?.manufacturer ?? it?.mfr ?? "-"}</b> ·
                        Model: <b>{it?.model ?? "-"}</b> · SN: <b>{it?.serial ?? it?.sn ?? "-"}</b>
                      </div>

                      <div style={{ marginTop: 6, display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                        <span className="badge">Total: {total}</span>
                        {low > 0 && <span className="badge">Low: {low}</span>}
                      </div>
                    </div>
                  </div>

                  <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <button className="btn" onClick={() => openStock(it)}>
                      Stock
                    </button>
                    <button className="btn" onClick={() => itemsApi?.startEdit?.(it?.id) ?? openStock(it)}>
                      Edit
                    </button>
                    <button className="btn danger" onClick={() => onDelete(it)} title={stockLocked ? "Unlock in Settings" : ""}>
                      🗑
                    </button>
                  </div>
                </div>

                {it?.description ? (
                  <div className="muted" style={{ marginTop: 10, whiteSpace: "pre-wrap" }}>
                    {String(it.description)}
                  </div>
                ) : null}
              </div>
            );
          })
        )}
      </div>

      {/* Stock modal */}
      <StockModal
        open={stockOpen}
        onClose={() => setStockOpen(false)}
        item={selectedStockItem}
        locationRoots={roots}
        // these names match what your app has been using recently:
        adjustAtLocation={itemsApi?.adjustAtLocation || itemsApi?.adjustStockAtLocation}
        moveQty={itemsApi?.moveQty || itemsApi?.moveStock}
        locked={locked}
        requirePinForStock={settings.requirePinForStock}
      />
    </div>
  );
}