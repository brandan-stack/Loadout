import { useMemo, useState } from "react";
import { useItems, type InventoryItem } from "../hooks/useItems";
import { useLocations, type LocationNode } from "../hooks/useLocations";
import * as authStore from "../lib/authStore";
import { imageFileToOptimizedDataUrl } from "../lib/imageTools";
// categories aren't needed in this variant; drop the import to avoid unused var
// import { useCategories } from "../hooks/useCategories";
import LocationPicker from "./LocationPicker";
import StockModal from "./StockModal";
import ImageLightbox from "./ImageLightbox";

type LocalInventoryItem = InventoryItem & {
  totalQty?: number;
  lowStockAlert?: number;
  locationId?: string;
};

export default function InventoryScreen() {
  const itemsApi = useItems();
  const locApi = useLocations();
  const me = authStore.currentUser();
  const canAddItems = authStore.canAddInventory(me);
  const canEditItems = authStore.canEditInventory(me);
  const canStockActions = authStore.canAdjustStock(me);
  // const catApi = useCategories();

  const items = useMemo(() => (itemsApi.items ?? []) as LocalInventoryItem[], [itemsApi.items]);
  const locations = useMemo(() => locApi.roots ?? [], [locApi.roots]);
  // categories not used

  const [search, setSearch] = useState("");
  const [lowOnly, setLowOnly] = useState(false);
  const [selectedId, setSelectedId] = useState<string>("");

  const [stockOpen, setStockOpen] = useState(false);
  const selectedItem = items.find((i) => i.id === selectedId);

  // form state
  const [name, setName] = useState("");
  const [partNumber, setPartNumber] = useState("");
  const [manufacturer, setManufacturer] = useState("");
  const [model, setModel] = useState("");
  const [serial, setSerial] = useState("");
  const [description, setDescription] = useState("");

  const [initialQty, setInitialQty] = useState("");
  const [lowStockAlert, setLowStockAlert] = useState("");
  // track the selected location as a path of ids for the hierarchical picker
  const [locationPath, setLocationPath] = useState<string[]>([]);

  const [photoDataUrl, setPhotoDataUrl] = useState("");
  const [imageViewSrc, setImageViewSrc] = useState("");
  const [screenFeedback, setScreenFeedback] = useState<{ tone: "success" | "error"; message: string } | null>(null);

  function getTotalQty(it: LocalInventoryItem) {
    if (typeof it.totalQty === "number") return Number(it.totalQty || 0);
    const rows = Array.isArray(it.stockByLocation) ? it.stockByLocation : [];
    return rows.reduce((sum: number, row) => sum + Number(row?.quantity ?? 0), 0);
  }

  function getLowAlert(it: LocalInventoryItem) {
    return Number(it.lowStockAlert ?? it.lowStock ?? 0);
  }

  // helper to find the path (array of ids) from root to a given location id
  function findPathForId(roots: LocationNode[], targetId: string): string[] {
    const path: string[] = [];
    function dfs(nodes: LocationNode[], current: string[]): boolean {
      for (const n of nodes) {
        const next = [...current, n.id];
        if (n.id === targetId) {
          path.push(...next);
          return true;
        }
        if (n.children && dfs(n.children, next)) {
          return true;
        }
      }
      return false;
    }
    dfs(roots, []);
    return path;
  }

  // 🔍 filtering (fast + clean)
  const filteredItems = useMemo(() => {
    let list = items.slice();

    const q = search.trim().toLowerCase();

    if (q) {
      list = list.filter((it) =>
        [
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
          .join(" ")
          .toLowerCase()
          .includes(q)
      );
    }

    if (lowOnly) {
      list = list.filter((it) => {
        const total = getTotalQty(it);
        const low = getLowAlert(it);
        return low > 0 && total <= low;
      });
    }

    return list;
  }, [items, search, lowOnly]);

  const stats = useMemo(() => {
    const totalItems = items.length;
    const lowCount = items.filter((it) => {
      const total = getTotalQty(it);
      const low = getLowAlert(it);
      return low > 0 && total <= low;
    }).length;

    return {
      totalItems,
      shown: filteredItems.length,
      lowCount,
    };
  }, [items, filteredItems]);

  // ✅ add or update item
  function saveItem() {
    const cleanName = name.trim();
    if (!cleanName) {
      setScreenFeedback({ tone: "error", message: "Name required." });
      return;
    }

    if (!selectedId && !canAddItems) {
      setScreenFeedback({ tone: "error", message: "You are not allowed to add inventory items." });
      return;
    }
    if (selectedId && !canEditItems) {
      setScreenFeedback({ tone: "error", message: "You are not allowed to edit inventory items." });
      return;
    }

    const qty = initialQty === "" ? 0 : Number(initialQty);
    const low = lowStockAlert === "" ? 0 : Number(lowStockAlert);

    const targetLocationId = locationPath[locationPath.length - 1] || "";

    if (!selectedId) {
      itemsApi.addItem?.({
        name: cleanName,
        partNumber,
        manufacturer,
        model,
        serial,
        description,
        initialQty: qty,
        lowStock: low,
        initialLocationId: targetLocationId,
        photoDataUrl,
      });
    } else {
      itemsApi.updateItem?.(selectedId, {
        name: cleanName,
        partNumber,
        manufacturer,
        model,
        serial,
        description,
        lowStock: low,
        photoDataUrl,
      });
    }

    resetForm();
    setScreenFeedback({ tone: "success", message: selectedId ? "Item saved." : "Item added." });
  }

  function resetForm() {
    setSelectedId("");
    setName("");
    setPartNumber("");
    setManufacturer("");
    setModel("");
    setSerial("");
    setDescription("");
    setInitialQty("");
    setLowStockAlert("");
    setLocationPath([]);
    setPhotoDataUrl("");
  }

  function startEdit(item: LocalInventoryItem) {
    if (!canEditItems) {
      setScreenFeedback({ tone: "error", message: "You are not allowed to edit inventory items." });
      return;
    }
    setSelectedId(item.id);
    setName(item.name ?? "");
    setPartNumber(item.partNumber ?? "");
    setManufacturer(item.manufacturer ?? "");
    setModel(item.model ?? "");
    setSerial(item.serial ?? "");
    setDescription(item.description ?? "");
    setInitialQty(String(item.totalQty ?? getTotalQty(item) ?? ""));
    setLowStockAlert(String(item.lowStockAlert ?? item.lowStock ?? ""));
    // prefill picker; try to resolve full path, fall back to single id
    setLocationPath(
      item.locationId
        ? findPathForId(locations, item.locationId)
        : item.stockByLocation?.[0]?.locationId
        ? findPathForId(locations, item.stockByLocation[0].locationId)
        : []
    );
    setPhotoDataUrl(item.photoDataUrl ?? "");
  }

  function openStock(item: LocalInventoryItem) {
    setSelectedId(item.id);
    setStockOpen(true);
  }

  async function onPickPhoto(file?: File | null) {
    if (!file) return;
    try {
      const dataUrl = await imageFileToOptimizedDataUrl(file);
      setPhotoDataUrl(dataUrl);
      setScreenFeedback(null);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Unable to process image.";
      setScreenFeedback({ tone: "error", message: msg });
    }
  }

  return (
    <div className="page locationsPage">
      <div className="pageHeader">
        <div>
          <h1>Locations Inventory</h1>
          <div className="muted">Location-focused stock management with clean add/edit flow.</div>
        </div>

        <div className="chips">
          <span className="chip">Items: {stats.totalItems}</span>
          <span className="chip">Shown: {stats.shown}</span>
          <span className="chip">Low Alerts: {stats.lowCount}</span>
        </div>
      </div>

      {screenFeedback ? (
        <div className={`bannerFeedback bannerFeedback--${screenFeedback.tone}`} role="status" aria-live="polite">{screenFeedback.message}</div>
      ) : null}

      {/* ===== ADD / EDIT ===== */}
      <div className="card addItemCard locationsFormCard">
        <div className="sectionTitle">
          {selectedId ? "Edit item" : "Add item"}
        </div>
        {!selectedId && !canAddItems ? (
          <div className="muted" style={{ marginBottom: 10 }}>
            Only users allowed by Admin can add new inventory items.
          </div>
        ) : null}

        <div className="grid2">
          <input
            placeholder="Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <input
            placeholder="Part #"
            value={partNumber}
            onChange={(e) => setPartNumber(e.target.value)}
          />
          <input
            placeholder="Manufacturer"
            value={manufacturer}
            onChange={(e) => setManufacturer(e.target.value)}
          />
          <input
            placeholder="Model"
            value={model}
            onChange={(e) => setModel(e.target.value)}
          />
          <input
            placeholder="Serial"
            value={serial}
            onChange={(e) => setSerial(e.target.value)}
          />

          <LocationPicker
            roots={locations}
            value={locationPath}
            onChange={setLocationPath}
          />
        </div>

        <textarea
          placeholder="Description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />

        <div className="grid2">
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
          ) : (
            <div className="muted">Picture (large files are auto-compressed)</div>
          )}
        </div>

        <div className="grid2">
          <input
            placeholder="Initial Qty (blank = 0)"
            value={initialQty}
            onChange={(e) => setInitialQty(e.target.value)}
          />
          <input
            placeholder="Low Stock Alert"
            value={lowStockAlert}
            onChange={(e) => setLowStockAlert(e.target.value)}
          />
        </div>

        <div className="rowEnd">
          {selectedId && (
            <button className="btn" onClick={resetForm}>
              New item
            </button>
          )}
          <button className="btn primary" onClick={saveItem}>
            {selectedId ? "Save" : "Add item"}
          </button>
        </div>
      </div>

      {/* ===== FILTERS ===== */}
      <div className="card locationsFilterCard">
        <div className="searchBlock">
          <input
            placeholder="Search part #, manufacturer/brand, model #, serial #, description…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <div className="searchHints" aria-hidden="true">
            <span className="searchHint">Part Number</span>
            <span className="searchHint">Brand</span>
            <span className="searchHint">Model Number</span>
            <span className="searchHint">Serial Number</span>
          </div>
        </div>

        <label className="checkRow">
          <input
            type="checkbox"
            checked={lowOnly}
            onChange={(e) => setLowOnly(e.target.checked)}
          />
          <span>Low stock only</span>
        </label>
      </div>

      {/* ===== LIST ===== */}
      <div className="list">
        {filteredItems.map((it) => {
          const total = getTotalQty(it);
          const low = getLowAlert(it);
          const isLow = low > 0 && total <= low;

          return (
            <div key={it.id} className={"itemCard " + (isLow ? "itemCardLow" : "")}> 
              <div className="itemLeft">
                {it.photoDataUrl ? (
                  <button
                    type="button"
                    className="thumb thumbButton"
                    onClick={() => setImageViewSrc(it.photoDataUrl || "")}
                    title="View image"
                  >
                    <img src={it.photoDataUrl} alt={it.name} />
                  </button>
                ) : null}

                <div className="itemMeta">
                  <div className="itemTopLine">
                    <div className="itemName">{it.name}</div>
                    <div className="pillRow">
                      <span className="pill">Total Quantity: {total}</span>
                      {isLow ? <span className="pill pillRed">Low Stock</span> : null}
                    </div>
                  </div>
                  <div className="itemSub muted">
                    {it.partNumber ? <>Part Number: {it.partNumber} • </> : null}
                    {it.manufacturer ? <>Manufacturer: {it.manufacturer} • </> : null}
                    {it.model ? <>Model Number: {it.model} • </> : null}
                    {it.serial ? <>Serial Number: {it.serial}</> : null}
                  </div>
                </div>
              </div>

              <div className="itemRight">
                <button className="btn" onClick={() => startEdit(it)}>
                  Edit
                </button>
                <button className="btn" disabled={!canStockActions} onClick={() => openStock(it)}>
                  Stock
                </button>
                <button
                  className="btn danger"
                  disabled={!canEditItems}
                  onClick={() => {
                    if (!canEditItems) {
                      setScreenFeedback({ tone: "error", message: "You are not allowed to edit inventory items." });
                      return;
                    }
                    itemsApi.deleteItem?.(it.id);
                    setScreenFeedback({ tone: "success", message: `Deleted item "${it.name}".` });
                  }}
                >
                  🗑
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <StockModal
        open={stockOpen}
        onClose={() => setStockOpen(false)}
        item={selectedItem}
        locationRoots={locations}
        adjustAtLocation={itemsApi.adjustAtLocation}
        moveQty={itemsApi.moveQty}
        locked={false}
        requirePinForStock={false}
        forceLock={!canStockActions}
        lockMessage="Stock actions are locked. Only users with Edit / Stock access can perform stock changes."
      />

      <ImageLightbox
        open={!!imageViewSrc}
        src={imageViewSrc}
        alt="Inventory item image"
        onClose={() => setImageViewSrc("")}
      />
    </div>
  );
}