import { useEffect, useMemo, useState } from "react";
import type { LocationNode } from "../hooks/useLocations";

type StockModalItem = {
  id?: string;
  _id?: string;
  key?: string;
  pn?: string;
  name?: string;
  byLocation?: Record<string, number>;
  stockByLocation?: Array<{ locationId?: string; quantity?: number }>;
  stock?: Record<string, number>;
  qtyByLocation?: Record<string, number>;
  locations?: Array<{ locationId?: string; id?: string; location?: string; name?: string; qty?: number }>;
};

type Props = {
  open: boolean;
  onClose: () => void;
  item: StockModalItem | null | undefined;

  // Your locations hook returns roots (tree). We accept that.
  locationRoots: LocationNode[];

  // Functions provided by useItems()
  adjustAtLocation?: (itemId: string, locationId: string, delta: number) => void;
  moveQty?: (itemId: string, fromId: string, toId: string, qty: number) => void;

  locked?: boolean;
  requirePinForStock?: boolean;
  forceLock?: boolean;
  lockMessage?: string;
};

function toRecord(v: unknown): Record<string, unknown> {
  if (typeof v === "object" && v !== null) return v as Record<string, unknown>;
  return {};
}

function safeStr(v: unknown) {
  return typeof v === "string" ? v : v == null ? "" : String(v);
}

/** Flatten tree to leaf + branch nodes so dropdown works */
function flattenLocations(roots: LocationNode[]): { id: string; name: string }[] {
  const out: { id: string; name: string }[] = [];
  const walk = (node: LocationNode, prefix = "") => {
    if (!node) return;
    const id = safeStr(node.id ?? node.name);
    const name = safeStr(node.name ?? id);
    const fullName = prefix ? `${prefix} / ${name}` : name;
    out.push({ id, name: fullName });

    const children = node.children;
    if (Array.isArray(children)) children.forEach((c) => walk(c, fullName));
  };
  (roots || []).forEach((r) => walk(r, ""));
  return out;
}

function getQtyMap(item: StockModalItem | null | undefined): Record<string, number> {
  const m =
    item?.byLocation ||
    item?.stockByLocation ||
    item?.stock ||
    item?.qtyByLocation;

  if (m && typeof m === "object" && !Array.isArray(m)) {
    const out: Record<string, number> = {};
    for (const [k, v] of Object.entries(m)) out[safeStr(k)] = Number(v) || 0;
    return out;
  }

  if (Array.isArray(item?.locations)) {
    const out: Record<string, number> = {};
    item.locations.forEach((r) => {
      const rec = toRecord(r);
      const id = safeStr(rec.locationId ?? rec.id ?? rec.location ?? rec.name);
      out[id] = Number(rec.qty) || 0;
    });
    return out;
  }

  return {};
}

export default function StockModal({
  open,
  onClose,
  item,
  locationRoots,
  adjustAtLocation,
  moveQty,
  locked = false,
  requirePinForStock = false,
  forceLock = false,
  lockMessage,
}: Props) {
  const [receiveQty, setReceiveQty] = useState<string>("");
  const [takeQty, setTakeQty] = useState<string>("");
  const [moveQtyStr, setMoveQtyStr] = useState<string>("");

  const [moveFrom, setMoveFrom] = useState<string>("");
  const [moveTo, setMoveTo] = useState<string>("");

  const qtyMap = useMemo(() => getQtyMap(item), [item]);
  const locs = useMemo(() => flattenLocations(locationRoots), [locationRoots]);

  const primaryLocation = locs[0]?.id || "";

  const stockLocked = forceLock || (locked && requirePinForStock);

  const itemId = safeStr(item?.id ?? item?._id ?? item?.key ?? item?.pn ?? item?.name);

  const receiveLocation = moveTo || primaryLocation; // simple default
  const takeLocation = moveFrom || primaryLocation;

  function parseQty(s: string) {
    const n = Math.floor(Number(s));
    return Number.isFinite(n) && n > 0 ? n : 0;
  }

  function labelForLocation(id: string) {
    const name = locs.find((l) => l.id === id)?.name || id;
    const q = qtyMap[id] ?? 0;
    return `${name}  (${q})`;
  }

  function doReceive() {
    if (stockLocked) return;
    const q = parseQty(receiveQty);
    if (!q) return;
    if (!adjustAtLocation) return alert("adjustAtLocation not wired.");
    adjustAtLocation(itemId, receiveLocation, +q);
    setReceiveQty("");
  }

  function doTake() {
    if (stockLocked) return;
    const q = parseQty(takeQty);
    if (!q) return;
    if (!adjustAtLocation) return alert("adjustAtLocation not wired.");
    adjustAtLocation(itemId, takeLocation, -q);
    setTakeQty("");
  }

  function doMove() {
    if (stockLocked) return;
    const q = parseQty(moveQtyStr);
    if (!q) return;
    if (!moveQty) return alert("moveQty not wired.");
    if (!moveFrom || !moveTo) return alert("Pick From and To locations.");
    if (moveFrom === moveTo) return alert("From and To must be different.");
    moveQty(itemId, moveFrom, moveTo, q);
    setMoveQtyStr("");
  }

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="modalOverlay" onMouseDown={onClose}>
      <div className="modal" role="dialog" aria-modal="true" aria-label="Stock actions" onMouseDown={(e) => e.stopPropagation()}>
        <div className="modalHeader">
          <div>
            <div className="modalTitle">Stock</div>
            <div className="modalSub">
              Receive, take out, and move quantities without duplicates.
            </div>
          </div>
          <button className="btn" onClick={onClose}>
            Close
          </button>
        </div>

        <div className="modalBody">
          {stockLocked && (
            <div className="hint">
              {lockMessage || "Stock actions are locked. Unlock in Settings or request Admin access."}
            </div>
          )}

          <div className="stockGrid">
            <div className="panel">
              <div className="panelTitle">Receive</div>
              <div className="row">
                <label className="label">Location</label>
                <select
                  className="select"
                  value={receiveLocation}
                  onChange={(e) => setMoveTo(e.target.value)}
                >
                  {locs.map((l) => (
                    <option key={l.id} value={l.id}>
                      {labelForLocation(l.id)}
                    </option>
                  ))}
                </select>
              </div>

              <div className="row">
                <label className="label">Quantity</label>
                <input
                  className="input"
                  placeholder="e.g. 10"
                  value={receiveQty}
                  onChange={(e) => setReceiveQty(e.target.value)}
                  inputMode="numeric"
                />
              </div>

              <button className="btnPrimary wide" disabled={stockLocked} onClick={doReceive}>
                Receive to selected location
              </button>
            </div>

            <div className="panel">
              <div className="panelTitle">Take out</div>

              <div className="row">
                <label className="label">Location</label>
                <select
                  className="select"
                  value={takeLocation}
                  onChange={(e) => setMoveFrom(e.target.value)}
                >
                  {locs.map((l) => (
                    <option key={l.id} value={l.id}>
                      {labelForLocation(l.id)}
                    </option>
                  ))}
                </select>
              </div>

              <div className="row">
                <label className="label">Quantity</label>
                <input
                  className="input"
                  placeholder="e.g. 4"
                  value={takeQty}
                  onChange={(e) => setTakeQty(e.target.value)}
                  inputMode="numeric"
                />
              </div>

              <button className="btnPrimary wide" disabled={stockLocked} onClick={doTake}>
                Take out from selected location
              </button>
            </div>
          </div>

          <div className="panel" style={{ marginTop: 12 }}>
            <div className="panelTitle">Move stock</div>
            <div className="panelSub">Move quantity from one location to another.</div>

            <div className="moveGrid">
              <div>
                <label className="label">From</label>
                <select className="select" value={moveFrom} onChange={(e) => setMoveFrom(e.target.value)}>
                  <option value="">Select…</option>
                  {locs.map((l) => (
                    <option key={l.id} value={l.id}>
                      {labelForLocation(l.id)}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="label">To</label>
                <select className="select" value={moveTo} onChange={(e) => setMoveTo(e.target.value)}>
                  <option value="">Select…</option>
                  {locs.map((l) => (
                    <option key={l.id} value={l.id}>
                      {labelForLocation(l.id)}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="label">Qty</label>
                <input
                  className="input"
                  placeholder="e.g. 3"
                  value={moveQtyStr}
                  onChange={(e) => setMoveQtyStr(e.target.value)}
                  inputMode="numeric"
                />
              </div>

              <div className="moveBtnWrap">
                <button className="btnPrimary wide" disabled={stockLocked} onClick={doMove}>
                  Move quantity
                </button>
              </div>
            </div>
          </div>

          <div className="panel" style={{ marginTop: 12 }}>
            <div className="panelTitle">Quick view</div>
            <div className="panelSub">All locations with their current quantities.</div>

            <div className="qtyList">
              {locs.map((l) => (
                <div key={l.id} className="qtyRow">
                  <div className="qtyName">{l.name}</div>
                  <div className="qtyVal">{qtyMap[l.id] ?? 0}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}