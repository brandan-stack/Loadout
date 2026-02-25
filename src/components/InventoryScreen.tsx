import { useEffect, useMemo, useState } from "react";
import { useItems, type InventoryItem } from "../hooks/useItems";
import { useLocations, type LocationNode } from "../hooks/useLocations";
import { useCategories } from "../hooks/useCategories";
import * as authStore from "../lib/authStore";
import { imageFileToOptimizedDataUrl } from "../lib/imageTools";
import StockModal from "./StockModal";
import ImageLightbox from "./ImageLightbox";

type LocationOption = { id: string; label: string };

function flattenLocations(roots: LocationNode[]): LocationOption[] {
  const out: LocationOption[] = [];
  const walk = (nodes: LocationNode[], prefix: string[]) => {
    for (const n of nodes) {
      const path = [...prefix, n.name];
      out.push({ id: n.id, label: path.join(" > ") });
      if (n.children?.length) walk(n.children, path);
    }
  };
  walk(roots, []);
  return out;
}

function totalQty(item: InventoryItem) {
  return (item.stockByLocation ?? []).reduce(
    (sum, s) => sum + (Number(s.quantity) || 0),
    0
  );
}

function isLow(item: InventoryItem) {
  const alert = item.lowStock;
  if (alert === undefined || alert === null) return false;
  const n = Number(alert);
  if (!Number.isFinite(n)) return false;
  return totalQty(item) <= n;
}

function formatCurrency(v: number) {
  return `$${v.toFixed(2)}`;
}

export default function InventoryScreen() {
  const itemsApi = useItems();
  const locApi = useLocations();
  const catApi = useCategories();

  const security = authStore.loadSecuritySettings();
  const locked = !authStore.isUnlocked();
  const requirePinForStock = !!security.requirePinForStock;
  const requirePinForCosts = !!security.requirePinForCosts;
  const me = authStore.currentUser();
  const canAddItems = authStore.canAddInventory(me);
  const canEditItems = authStore.canEditInventory(me);
  const canStockActions = authStore.canAdjustStock(me);
  const canViewPricing = authStore.canViewPricingMargin(me) && (!requirePinForCosts || !locked);

  const locationOptions = useMemo(
    () => flattenLocations(locApi.roots),
    [locApi.roots]
  );

  const locationLabelById = useMemo(() => {
    const map = new Map<string, string>();
    for (const option of locationOptions) {
      map.set(option.id, option.label);
    }
    return map;
  }, [locationOptions]);

  // --- Add Item form ---
  const [name, setName] = useState("");
  const [partNo, setPartNo] = useState("");
  const [manufacturer, setManufacturer] = useState("");
  const [model, setModel] = useState("");
  const [serial, setSerial] = useState("");
  const [description, setDescription] = useState("");

  const [initialQty, setInitialQty] = useState<string>("");
  const [lowStockAlert, setLowStockAlert] = useState<string>("");
  const [unitPrice, setUnitPrice] = useState<string>("");
  const [marginPercent, setMarginPercent] = useState<string>("");
  const [initialLocationId, setInitialLocationId] = useState<string>("");

  const [categoryId, setCategoryId] = useState<string>("");
  const [subcategoryId, setSubcategoryId] = useState<string>("");
  const [photoDataUrl, setPhotoDataUrl] = useState<string>("");
  const [showAddPanel, setShowAddPanel] = useState(false);
  const [editingItemId, setEditingItemId] = useState<string>("");
  const [imageViewSrc, setImageViewSrc] = useState<string>("");
  const [inventoryFeedback, setInventoryFeedback] = useState<string>("");

  // --- Filters ---
  const [q, setQ] = useState("");
  const [onlyLow, setOnlyLow] = useState(false);
  const [filterCategoryId, setFilterCategoryId] = useState<string>("");

  // --- Stock modal ---
  const [stockOpen, setStockOpen] = useState(false);
  const [selected, setSelected] = useState<InventoryItem | undefined>(undefined);
  const [locationsViewItem, setLocationsViewItem] = useState<InventoryItem | undefined>(undefined);

  const categories = catApi.categories ?? [];
  const subcats =
    categories.find((c) => c.id === categoryId)?.subcategories ?? [];
  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();

    return (itemsApi.items ?? [])
      .filter((it) => {
        if (!query) return true;
        const hay = [
          it.name,
          it.partNumber,
          `part number ${it.partNumber ?? ""}`,
          `pn ${it.partNumber ?? ""}`,
          it.manufacturer,
          `manufacturer ${it.manufacturer ?? ""}`,
          `brand ${it.manufacturer ?? ""}`,
          it.model,
          `model number ${it.model ?? ""}`,
          it.serial,
          `serial number ${it.serial ?? ""}`,
          `sn ${it.serial ?? ""}`,
          it.description,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        return hay.includes(query);
      })
      .filter((it) => {
        if (!filterCategoryId) return true;
        return it.categoryId === filterCategoryId;
      })
      .filter((it) => (onlyLow ? isLow(it) : true))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [itemsApi.items, q, onlyLow, filterCategoryId]);

  const stats = useMemo(() => {
    const items = itemsApi.items ?? [];
    const totalItems = items.length;
    const totalStock = items.reduce((sum, it) => sum + totalQty(it), 0);
    const lowCount = items.filter(isLow).length;
    return { totalItems, totalStock, lowCount };
  }, [itemsApi.items]);

  function resetForm() {
    setName("");
    setPartNo("");
    setManufacturer("");
    setModel("");
    setSerial("");
    setDescription("");
    setInitialQty("");
    setLowStockAlert("");
    setUnitPrice("");
    setMarginPercent("");
    setInitialLocationId("");
    setCategoryId("");
    setSubcategoryId("");
    setPhotoDataUrl("");
    setEditingItemId("");
  }

  function startEditItem(item: InventoryItem) {
    if (!canEditItems) {
      setInventoryFeedback("You are not allowed to edit inventory items.");
      return;
    }
    setEditingItemId(item.id);
    setShowAddPanel(true);
    setName(item.name ?? "");
    setPartNo(item.partNumber ?? "");
    setManufacturer(item.manufacturer ?? "");
    setModel(item.model ?? "");
    setSerial(item.serial ?? "");
    setDescription(item.description ?? "");
    setLowStockAlert(
      item.lowStock === undefined || item.lowStock === null
        ? ""
        : String(item.lowStock)
    );
    setUnitPrice(
      item.unitPrice === undefined || item.unitPrice === null
        ? ""
        : String(item.unitPrice)
    );
    setMarginPercent(
      item.marginPercent === undefined || item.marginPercent === null
        ? ""
        : String(item.marginPercent)
    );
    setCategoryId(item.categoryId ?? "");
    setSubcategoryId(item.subcategoryId ?? "");
    setPhotoDataUrl(item.photoDataUrl ?? "");
    setInitialLocationId(item.stockByLocation?.[0]?.locationId ?? "");
    setInitialQty("");
  }

  async function onPickPhoto(file?: File | null) {
    if (!file) return;
    try {
      const dataUrl = await imageFileToOptimizedDataUrl(file);
      setPhotoDataUrl(dataUrl);
      setInventoryFeedback("");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Unable to process image.";
      setInventoryFeedback(msg);
    }
  }

  function createItem() {
    if (!editingItemId && !canAddItems) {
      setInventoryFeedback("You are not allowed to add inventory items.");
      return;
    }
    if (editingItemId && !canEditItems) {
      setInventoryFeedback("You are not allowed to edit inventory items.");
      return;
    }

    const n = name.trim();
    if (!n) return;

    const qty = initialQty.trim() === "" ? 0 : Number(initialQty);
    const lowStockValue =
      lowStockAlert.trim() === "" ? undefined : Number(lowStockAlert);
    const unitPriceValue = canViewPricing && unitPrice.trim() !== "" ? Number(unitPrice) : undefined;
    const marginPercentValue = canViewPricing && marginPercent.trim() !== "" ? Number(marginPercent) : undefined;

    const locId =
      initialLocationId ||
      (locationOptions.length ? locationOptions[0].id : "");

    if (editingItemId) {
      itemsApi.updateItem(editingItemId, {
        name: n,
        partNumber: partNo.trim() || "",
        manufacturer: manufacturer.trim() || "",
        model: model.trim() || "",
        serial: serial.trim() || "",
        description: description.trim() || "",
        categoryId: categoryId || "",
        subcategoryId: subcategoryId || "",
        lowStock: Number.isFinite(Number(lowStockValue))
          ? Number(lowStockValue)
          : undefined,
        unitPrice: Number.isFinite(Number(unitPriceValue)) ? Number(unitPriceValue) : undefined,
        marginPercent: Number.isFinite(Number(marginPercentValue)) ? Number(marginPercentValue) : undefined,
        photoDataUrl: photoDataUrl || undefined,
      });

      if (Number.isFinite(qty) && qty > 0) {
        itemsApi.adjustAtLocation(editingItemId, locId, qty);
      }

      resetForm();
      setShowAddPanel(false);
      setInventoryFeedback("Item updated.");
      return;
    }

    const norm = (v?: string) => (v ?? "").trim().toLowerCase();
    const nameNorm = norm(n);
    const partNorm = norm(partNo);
    const mfrNorm = norm(manufacturer);
    const modelNorm = norm(model);
    const serialNorm = norm(serial);

    const duplicate = (itemsApi.items ?? []).find((it) => {
      if (norm(it.name) !== nameNorm) return false;
      if (partNorm) return norm(it.partNumber) === partNorm;
      return (
        norm(it.manufacturer) === mfrNorm &&
        norm(it.model) === modelNorm &&
        norm(it.serial) === serialNorm
      );
    });

    if (duplicate) {
      const qtyToAdd = Number.isFinite(qty) ? qty : 0;
      const proceed = confirm(
        `"${duplicate.name}" already exists. Add quantity to existing item instead of creating a duplicate?`
      );
      if (!proceed) return;

      if (qtyToAdd > 0) {
        itemsApi.adjustAtLocation(duplicate.id, locId, qtyToAdd);
      }

      if (Number.isFinite(Number(lowStockValue))) {
        itemsApi.updateItem(duplicate.id, { lowStock: Number(lowStockValue) });
      }

      if (canViewPricing && (Number.isFinite(Number(unitPriceValue)) || Number.isFinite(Number(marginPercentValue)))) {
        itemsApi.updateItem(duplicate.id, {
          unitPrice: Number.isFinite(Number(unitPriceValue)) ? Number(unitPriceValue) : duplicate.unitPrice,
          marginPercent: Number.isFinite(Number(marginPercentValue)) ? Number(marginPercentValue) : duplicate.marginPercent,
        });
      }

      if (photoDataUrl) {
        itemsApi.updateItem(duplicate.id, { photoDataUrl });
      }

      resetForm();
      setShowAddPanel(false);
      setInventoryFeedback("Updated existing item quantity/details.");
      return;
    }

    itemsApi.addItem({
      name: n,
      partNumber: partNo.trim() || undefined,
      manufacturer: manufacturer.trim() || undefined,
      model: model.trim() || undefined,
      serial: serial.trim() || undefined,
      description: description.trim() || undefined,
      categoryId: categoryId || undefined,
      subcategoryId: subcategoryId || undefined,
      lowStock: Number.isFinite(Number(lowStockValue)) ? Number(lowStockValue) : undefined,
      unitPrice: Number.isFinite(Number(unitPriceValue)) ? Number(unitPriceValue) : undefined,
      marginPercent: Number.isFinite(Number(marginPercentValue)) ? Number(marginPercentValue) : undefined,
      initialQty: Number.isFinite(qty) ? qty : 0,
      initialLocationId: locId,
      photoDataUrl: photoDataUrl || undefined,
    });

    resetForm();
    setShowAddPanel(false);
    setInventoryFeedback("Item added.");
  }

  function formatStockLocations(item: InventoryItem) {
    const rows = (item.stockByLocation ?? []).filter((row) => Number(row.quantity) > 0);
    if (!rows.length) return "Locations: None";

    const labels = rows
      .slice()
      .sort((a, b) => b.quantity - a.quantity)
      .map((row) => {
        const label = locationLabelById.get(row.locationId) || "Missing Location";
        return `${label} (${row.quantity})`;
      });

    return `Locations: ${labels.join(" • ")}`;
  }

  function locationRows(item: InventoryItem) {
    return (item.stockByLocation ?? [])
      .filter((row) => Number(row.quantity) > 0)
      .sort((a, b) => b.quantity - a.quantity)
      .map((row) => ({
        label: locationLabelById.get(row.locationId) || "Missing Location",
        quantity: row.quantity,
      }));
  }

  useEffect(() => {
    if (!locationsViewItem) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setLocationsViewItem(undefined);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [locationsViewItem]);

  return (
    <div className="page inventoryPage">
      <div className="pageHeader inventoryHeader">
        <div>
          <h1>Inventory</h1>
          <div className="muted inventorySubtitle">
            Fast add • search • stock moves • clean cards
          </div>
        </div>

        <div className="chips">
          <span className="chip">Items: {stats.totalItems}</span>
          <span className="chip">Shown: {filtered.length}</span>
          <span className="chip">Total stock: {stats.totalStock}</span>
          <span className="chip">Low alerts: {stats.lowCount}</span>
        </div>
      </div>

      {inventoryFeedback ? (
        <div className="bannerWarning" role="status" aria-live="polite">{inventoryFeedback}</div>
      ) : null}

      {/* Add item */}
      <div className="card addItemCard inventoryAddCard">
        <div className="addItemHeader">
          <div className="cardTitle">{editingItemId ? "Edit item" : "Add item"}</div>
          <div className="muted">
            {canAddItems
              ? "Enter item details and starting stock"
              : "Only users allowed by Admin can add inventory items"}
          </div>
        </div>

        {canAddItems || (canEditItems && !!editingItemId) ? (
          <>
            {canAddItems ? (
              <div className={"rowWrap inventoryToggleRow" + (showAddPanel ? " open" : "")}>
                <button
                  className="btnPrimary"
                  type="button"
                  onClick={() => setShowAddPanel((v) => !v)}
                >
                  {showAddPanel
                    ? editingItemId
                      ? "Hide edit form"
                      : "Hide add form"
                    : "Add inventory item"}
                </button>
              </div>
            ) : null}

            {showAddPanel && (
              <>
                <div className="grid addItemGrid">
          <label className="field">
            <span>Name</span>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g., Limit switch" />
          </label>

          <label className="field">
            <span>Part #</span>
            <input value={partNo} onChange={(e) => setPartNo(e.target.value)} placeholder="e.g., 123-ABC" />
          </label>

          <label className="field">
            <span>Manufacturer</span>
            <input value={manufacturer} onChange={(e) => setManufacturer(e.target.value)} placeholder="e.g., Demag" />
          </label>

          <label className="field">
            <span>Model</span>
            <input value={model} onChange={(e) => setModel(e.target.value)} placeholder="e.g., D2L" />
          </label>

          <label className="field">
            <span>Serial</span>
            <input value={serial} onChange={(e) => setSerial(e.target.value)} placeholder="optional" />
          </label>

          <label className="field fieldWide">
            <span>Description</span>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="notes, specs, where it's used…"
              rows={3}
            />
          </label>

          <label className="field fieldWide">
            <span>Picture</span>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => {
                onPickPhoto(e.target.files?.[0]);
                e.currentTarget.value = "";
              }}
            />
            {photoDataUrl ? (
              <div className="photoInlineRow">
                <button
                  type="button"
                  className="thumb thumbButton"
                  onClick={() => setImageViewSrc(photoDataUrl)}
                  title="View image"
                >
                  <img src={photoDataUrl} alt="Item preview" />
                </button>
                <button type="button" className="btn" onClick={() => setPhotoDataUrl("")}>Remove picture</button>
              </div>
            ) : null}
          </label>

          <label className="field">
            <span>Initial qty</span>
            <input
              value={initialQty}
              onChange={(e) => setInitialQty(e.target.value)}
              placeholder="blank = 0"
              inputMode="numeric"
            />
          </label>

          <label className="field">
            <span>Low stock alert</span>
            <input
              value={lowStockAlert}
              onChange={(e) => setLowStockAlert(e.target.value)}
              placeholder="blank = off"
              inputMode="numeric"
            />
          </label>

          {canViewPricing ? (
            <>
              <label className="field">
                <span>Unit price</span>
                <input
                  value={unitPrice}
                  onChange={(e) => setUnitPrice(e.target.value)}
                  placeholder="blank = hidden"
                  inputMode="decimal"
                />
              </label>

              <label className="field">
                <span>Margin %</span>
                <input
                  value={marginPercent}
                  onChange={(e) => setMarginPercent(e.target.value)}
                  placeholder="blank = hidden"
                  inputMode="decimal"
                />
              </label>
            </>
          ) : (
            <label className="field fieldWide">
              <span>Pricing & margin</span>
              <div className="muted">Hidden. Unlock and enable pricing access in Settings/Admin to view or edit.</div>
            </label>
          )}

          <label className="field">
            <span>Initial location</span>
            <select
              value={initialLocationId}
              onChange={(e) => setInitialLocationId(e.target.value)}
            >
              <option value="">(pick)</option>
              {locationOptions.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>

          <label className="field">
            <span>Category</span>
            <select
              value={categoryId}
              onChange={(e) => {
                setCategoryId(e.target.value);
                setSubcategoryId("");
              }}
            >
              <option value="">Uncategorized</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>

          <label className="field">
            <span>Subcategory</span>
            <select
              value={subcategoryId}
              onChange={(e) => setSubcategoryId(e.target.value)}
              disabled={!categoryId}
            >
              <option value="">None</option>
              {subcats.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </label>
                </div>

                <div className="row rowRight addItemActions">
                  {editingItemId ? (
                    <button
                      className="btn"
                      type="button"
                      onClick={() => {
                        resetForm();
                        setShowAddPanel(false);
                      }}
                    >
                      Cancel edit
                    </button>
                  ) : null}
                  <button className="btn" onClick={resetForm} type="button">
                    Clear
                  </button>
                  <button className="btnPrimary" onClick={createItem} type="button">
                    {editingItemId ? "Save item" : "Add item"}
                  </button>
                </div>
              </>
            )}
          </>
        ) : null}
      </div>

      {/* Filters */}
      <div className="card inventoryFilterCard">
        <div className="row rowBetween">
          <div className="filterControls">
            <div className="searchBlock">
              <input
                className="search"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search part #, manufacturer/brand, model #, serial #, description…"
              />
              <div className="searchHints" aria-hidden="true">
                <span className="searchHint">Part Number</span>
                <span className="searchHint">Brand</span>
                <span className="searchHint">Model Number</span>
                <span className="searchHint">Serial Number</span>
              </div>
            </div>
            <select
              value={filterCategoryId}
              onChange={(e) => setFilterCategoryId(e.target.value)}
            >
              <option value="">All categories</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            <label className="check">
              <input
                type="checkbox"
                checked={onlyLow}
                onChange={(e) => setOnlyLow(e.target.checked)}
              />
              Low stock only
            </label>
          </div>
        </div>
        <div className="inventoryResultsMeta">Showing {filtered.length} of {stats.totalItems} items</div>
      </div>

      {/* List */}
      <div className="list">
        {filtered.map((it) => {
          const qty = totalQty(it);
          const low = isLow(it);

          return (
            <div className={"itemCard " + (low ? "itemCardLow" : "")} key={it.id}>
              <div className="itemLeft">
                <div className="thumb">
                  {it.photoDataUrl ? (
                    <button
                      type="button"
                      className="thumb thumbButton"
                      onClick={() => setImageViewSrc(it.photoDataUrl || "")}
                      title="View image"
                    >
                      <img src={it.photoDataUrl} alt={it.name} />
                    </button>
                  ) : (
                    <div className="thumbEmpty" />
                  )}
                </div>

                <div className="itemMeta">
                  <div className="itemTopLine">
                    <div className="itemName">{it.name}</div>
                    <div className="pillRow">
                      <span className="pill">Total Quantity: {qty}</span>
                      {low && <span className="pill pillRed">Low Stock</span>}
                    </div>
                  </div>

                  <div className="itemSub muted">
                    {it.partNumber ? <>Part Number: {it.partNumber} • </> : null}
                    {it.manufacturer ? <>Manufacturer: {it.manufacturer} • </> : null}
                    {it.model ? <>Model Number: {it.model} • </> : null}
                    {it.serial ? <>Serial Number: {it.serial}</> : null}
                  </div>
                  {canViewPricing ? (
                    <div className="itemSub muted">
                      {typeof it.unitPrice === "number" ? <>Unit Price: {formatCurrency(it.unitPrice)} • </> : <>Unit Price: — • </>}
                      {typeof it.marginPercent === "number" ? <>Margin: {it.marginPercent}% • </> : <>Margin: — • </>}
                      {typeof it.unitPrice === "number" && typeof it.marginPercent === "number"
                        ? <>Billing Price: {formatCurrency(it.unitPrice * (1 + it.marginPercent / 100))}</>
                        : <>Billing Price: —</>}
                    </div>
                  ) : null}
                  <div className="itemSub muted">{formatStockLocations(it)}</div>
                </div>
              </div>

              <div className="itemRight">
                {canEditItems ? (
                  <button
                    className="btn inventoryBtnEdit"
                    type="button"
                    onClick={() => startEditItem(it)}
                  >
                    Edit
                  </button>
                ) : null}
                <button
                  className="btn primary inventoryBtnStock"
                  type="button"
                  disabled={!canStockActions}
                  onClick={() => {
                    setSelected(it);
                    setStockOpen(true);
                  }}
                >
                  Stock
                </button>

                <button
                  className="btn"
                  type="button"
                  onClick={() => setLocationsViewItem(it)}
                >
                  View Locations
                </button>

                <button
                  className="btn danger inventoryBtnDelete"
                  type="button"
                  disabled={!canEditItems}
                  onClick={() => {
                    if (!canEditItems) {
                      setInventoryFeedback("You are not allowed to edit inventory items.");
                      return;
                    }
                    if (!confirm(`Delete item "${it.name}"?`)) return;
                    itemsApi.deleteItem(it.id);
                    setInventoryFeedback(`Deleted item "${it.name}".`);
                  }}
                  title="Delete"
                >
                  Delete
                </button>
              </div>
            </div>
          );
        })}

        {!filtered.length && (
          <div className="empty">No items match your filters.</div>
        )}
      </div>

      <StockModal
        open={stockOpen}
        onClose={() => setStockOpen(false)}
        item={selected}
        locationRoots={locApi.roots}
        adjustAtLocation={itemsApi.adjustAtLocation}
        moveQty={itemsApi.moveQty}
        locked={locked}
        requirePinForStock={requirePinForStock}
        forceLock={!canStockActions}
        lockMessage="Stock actions are locked. Only users with Edit / Stock access can perform stock changes."
      />

      {locationsViewItem ? (
        <div className="modalOverlay" onClick={() => setLocationsViewItem(undefined)}>
          <div className="modalCard" role="dialog" aria-modal="true" aria-label="Item locations" onClick={(e) => e.stopPropagation()}>
            {(() => {
              const rows = locationRows(locationsViewItem);
              return (
                <>
            <div className="modalHeader">
              <div>
                <div className="modalTitle">{locationsViewItem.name} — Locations</div>
                <div className="muted">Total Quantity: {totalQty(locationsViewItem)}</div>
              </div>
              <button className="btn" type="button" onClick={() => setLocationsViewItem(undefined)}>
                Close
              </button>
            </div>

            <div className="qtyList">
              {rows.length ? (
                rows.map((row) => (
                  <div className="qtyRow" key={`${locationsViewItem.id}-${row.label}`}>
                    <div className="qtyName">{row.label}</div>
                    <div className="qtyVal">{row.quantity}</div>
                  </div>
                ))
              ) : (
                <div className="empty">No stocked locations yet.</div>
              )}
            </div>
                </>
              );
            })()}
          </div>
        </div>
      ) : null}

      <ImageLightbox
        open={!!imageViewSrc}
        src={imageViewSrc}
        alt="Inventory item image"
        onClose={() => setImageViewSrc("")}
      />
    </div>
  );
}