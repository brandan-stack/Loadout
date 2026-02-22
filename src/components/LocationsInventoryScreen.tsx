import { useMemo, useState } from "react";
import { useLocations, type LocationNode } from "../hooks/useLocations";
import { useItems, type InventoryItem } from "../hooks/useItems";
import LocationPicker from "./LocationPicker";
import LocationManager from "./LocationManager";

type LightboxState = { open: boolean; src?: string; title?: string };

type MoveModalState = {
  open: boolean;
  itemId: string;
  fromPath: string[]; // path ids (last = fromLocationId)
  toPath: string[];   // path ids (last = toLocationId)
  qty: number;
};

type DragPayload = {
  itemId: string;
  fromLocationId: string; // "" allowed
};

function totalQty(item: InventoryItem) {
  return (item.stockByLocation ?? []).reduce((sum, r) => sum + (r.quantity ?? 0), 0);
}

function qtyAt(item: InventoryItem, locationId: string) {
  const locId = locationId ?? "";
  return (item.stockByLocation ?? []).find((r) => (r.locationId ?? "") === locId)?.quantity ?? 0;
}

function findNodeByPath(roots: LocationNode[], path: string[]) {
  let nodes = roots;
  let current: LocationNode | undefined;
  for (const id of path) {
    current = nodes.find((x) => x.id === id);
    if (!current) return undefined;
    nodes = current.children ?? [];
  }
  return current;
}

function pathLabel(roots: LocationNode[], path: string[]) {
  if (path.length === 0) return "None";
  let nodes = roots;
  const names: string[] = [];
  for (const id of path) {
    const n = nodes.find((x) => x.id === id);
    if (!n) break;
    names.push(n.name);
    nodes = n.children ?? [];
  }
  return names.length ? names.join(" → ") : "None";
}

function collectDescendantIds(node: LocationNode | undefined): string[] {
  if (!node) return [];
  const out: string[] = [node.id];
  const stack: LocationNode[] = [...(node.children ?? [])];
  while (stack.length) {
    const n = stack.pop()!;
    out.push(n.id);
    for (const c of n.children ?? []) stack.push(c);
  }
  return out;
}

function Modal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.60)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
        zIndex: 9999,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "white",
          borderRadius: 14,
          width: "min(980px, 100%)",
          maxHeight: "85vh",
          overflow: "auto",
          boxShadow: "0 12px 35px rgba(0,0,0,0.35)",
        }}
      >
        <div
          style={{
            padding: 14,
            borderBottom: "1px solid rgba(0,0,0,0.12)",
            display: "flex",
            alignItems: "center",
            gap: 10,
          }}
        >
          <div style={{ fontWeight: 1000, fontSize: 16 }}>{title}</div>
          <button onClick={onClose} style={{ marginLeft: "auto" }}>
            Close
          </button>
        </div>
        <div style={{ padding: 14 }}>{children}</div>
      </div>
    </div>
  );
}

export default function LocationsInventoryScreen() {
  const loc = useLocations();
  const itemsApi = useItems();

  const [showManager, setShowManager] = useState(false);

  // Selected location path (left panel click builds this)
  const [selectedPath, setSelectedPath] = useState<string[]>([]);
  const selectedNode = useMemo(() => findNodeByPath(loc.roots, selectedPath), [loc.roots, selectedPath]);
  const selectedLabel = useMemo(() => pathLabel(loc.roots, selectedPath), [loc.roots, selectedPath]);

  const selectedLocationId = selectedPath[selectedPath.length - 1] ?? "";

  const [includeSubs, setIncludeSubs] = useState(true);

  const [lightbox, setLightbox] = useState<LightboxState>({ open: false });

  const [move, setMove] = useState<MoveModalState>({
    open: false,
    itemId: "",
    fromPath: [],
    toPath: [],
    qty: 1,
  });

  const [receiveQty, setReceiveQty] = useState<number>(1);

  // Build list of selectable left “cards” = top-level + children shown as separate blocks
  const leftCards = useMemo(() => {
    const out: { path: string[]; node: LocationNode; hasChildren: boolean }[] = [];

    function walk(nodes: LocationNode[], prefix: string[]) {
      for (const n of nodes) {
        const p = [...prefix, n.id];
        out.push({ path: p, node: n, hasChildren: (n.children ?? []).length > 0 });
        // We still render children as blocks (user asked to see them)
        for (const c of n.children ?? []) {
          out.push({ path: [...p, c.id], node: c, hasChildren: (c.children ?? []).length > 0 });
        }
      }
    }

    walk(loc.roots ?? [], []);
    return out;
  }, [loc.roots]);

  const selectedLocationIds = useMemo(() => {
    if (!selectedNode) return [];
    if (!includeSubs) return [selectedNode.id];
    return collectDescendantIds(selectedNode);
  }, [selectedNode, includeSubs]);

  const itemsInSelected = useMemo(() => {
    if (!selectedNode) return [];
    const ids = new Set(selectedLocationIds);

    const list = itemsApi.items
      .map((it) => {
        const qty = (it.stockByLocation ?? [])
          .filter((r) => ids.has(r.locationId ?? ""))
          .reduce((sum, r) => sum + (r.quantity ?? 0), 0);

        return { it, qty };
      })
      .filter((x) => x.qty > 0)
      .sort((a, b) => b.qty - a.qty);

    return list;
  }, [itemsApi.items, selectedNode, selectedLocationIds]);

  function onDragStart(e: React.DragEvent, payload: DragPayload) {
    e.dataTransfer.setData("application/json", JSON.stringify(payload));
    e.dataTransfer.effectAllowed = "move";
  }

  function allowDrop(e: React.DragEvent) {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  }

  function openMoveModal(itemId: string, fromLocationId: string, toPath: string[]) {
    const fromPath = fromLocationId ? [fromLocationId] : []; // we’ll show label as location id fallback
    setMove({
      open: true,
      itemId,
      fromPath,
      toPath,
      qty: 1,
    });
  }

  function closeMoveModal() {
    setMove({ open: false, itemId: "", fromPath: [], toPath: [], qty: 1 });
  }

  function doMoveModal() {
    const item = itemsApi.items.find((x) => x.id === move.itemId);
    if (!item) return;

    const fromId = move.fromPath[move.fromPath.length - 1] ?? "";
    const toId = move.toPath[move.toPath.length - 1] ?? "";

    const available = qtyAt(item, fromId);
    const q = Math.max(1, Math.floor(Number(move.qty) || 1));
    const final = Math.min(q, available);

    if (final <= 0) return;
    itemsApi.moveQty(item.id, fromId, toId, final);
    closeMoveModal();
  }

  function onDropToLocation(e: React.DragEvent, toLocationId: string) {
    e.preventDefault();
    try {
      const raw = e.dataTransfer.getData("application/json");
      if (!raw) return;
      const payload = JSON.parse(raw) as DragPayload;

      const item = itemsApi.items.find((x) => x.id === payload.itemId);
      if (!item) return;

      const fromId = payload.fromLocationId ?? "";
      const toId = toLocationId ?? "";

      const available = qtyAt(item, fromId);
      const qStr = prompt(`Move how many?\nAvailable: ${available}`, "1");
      if (!qStr) return;
      const q = Math.max(1, Math.floor(Number(qStr) || 1));
      const final = Math.min(q, available);
      if (final <= 0) return;

      itemsApi.moveQty(item.id, fromId, toId, final);
    } catch {
      // ignore
    }
  }

  function receiveToSelected(itemId: string) {
    if (!selectedNode) return;
    const q = Math.max(1, Math.floor(Number(receiveQty) || 1));
    itemsApi.adjustAtLocation(itemId, selectedNode.id, q);
  }

  return (
    <div style={{ padding: 16 }}>
      <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
        <h2 style={{ marginTop: 0, marginBottom: 10 }}>Locations</h2>
        <button style={{ marginLeft: "auto" }} onClick={() => setShowManager((s) => !s)}>
          {showManager ? "Hide location manager" : "Manage locations"}
        </button>
      </div>

      {showManager && (
        <div style={{ marginBottom: 12 }}>
          <LocationManager />
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "360px 1fr", gap: 14 }}>
        {/* LEFT: Locations */}
        <div
          style={{
            border: "1px solid rgba(255,255,255,0.14)",
            borderRadius: 14,
            padding: 12,
            background: "rgba(255,255,255,0.03)",
          }}
        >
          <div style={{ fontWeight: 1000, marginBottom: 6 }}>Locations</div>
          <div style={{ fontSize: 12, opacity: 0.8, marginBottom: 10 }}>
            Click a location to view items. Drag items on the right and drop onto a location to move stock.
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {leftCards.map(({ path, node, hasChildren }) => {
              const isSelected = selectedPath[selectedPath.length - 1] === node.id;

              // show count of items stored directly at this node (not including subs)
              const countHere = itemsApi.items.reduce((sum, it) => sum + (qtyAt(it, node.id) > 0 ? 1 : 0), 0);

              return (
                <div
                  key={path.join(".")}
                  onClick={() => setSelectedPath(path)}
                  onDragOver={allowDrop}
                  onDrop={(e) => onDropToLocation(e, node.id)}
                  style={{
                    border: isSelected ? "2px solid rgba(255,255,255,0.55)" : "1px solid rgba(255,255,255,0.18)",
                    borderRadius: 12,
                    padding: 10,
                    cursor: "pointer",
                    background: "rgba(255,255,255,0.02)",
                    display: "flex",
                    gap: 10,
                    alignItems: "center",
                  }}
                >
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 1000 }}>{node.name}</div>
                    <div style={{ fontSize: 12, opacity: 0.8 }}>
                      Items here: {countHere}
                      {"  "}
                      {hasChildren ? (
                        <span
                          style={{
                            marginLeft: 8,
                            fontSize: 11,
                            fontWeight: 1000,
                            padding: "2px 8px",
                            borderRadius: 999,
                            background: "rgba(255,255,255,0.10)",
                          }}
                        >
                          Has sub-locations
                        </span>
                      ) : (
                        <span style={{ marginLeft: 8, fontSize: 11, opacity: 0.7 }}>No subs</span>
                      )}
                    </div>
                  </div>

                  <div style={{ fontSize: 12, opacity: 0.85 }}>Drop here</div>
                </div>
              );
            })}
          </div>
        </div>

        {/* RIGHT: Inventory in Location */}
        <div
          style={{
            border: "1px solid rgba(255,255,255,0.14)",
            borderRadius: 14,
            padding: 12,
            background: "rgba(255,255,255,0.03)",
            minHeight: 420,
          }}
        >
          <div style={{ fontWeight: 1000, fontSize: 18 }}>Inventory in Location</div>
          <div style={{ marginTop: 6, fontSize: 12, opacity: 0.85 }}>
            <strong>Selected:</strong> {selectedLabel}
          </div>

          <div style={{ marginTop: 10, display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
            <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <input type="checkbox" checked={includeSubs} onChange={(e) => setIncludeSubs(e.target.checked)} />
              Include sub-locations
            </label>

            <div style={{ marginLeft: "auto", display: "flex", gap: 8, alignItems: "center" }}>
              <span style={{ fontSize: 12, fontWeight: 900 }}>Receive qty</span>
              <input
                type="number"
                min={1}
                value={receiveQty}
                onChange={(e) => setReceiveQty(Number(e.target.value))}
                style={{ padding: 8, width: 90 }}
              />
            </div>
          </div>

          {!selectedNode ? (
            <div style={{ marginTop: 14, opacity: 0.8 }}>
              Select a location on the left to view and move stock.
            </div>
          ) : (
            <>
              <div style={{ marginTop: 12, fontSize: 12, opacity: 0.85 }}>
                Showing items stored in: <strong>{selectedLabel}</strong>
              </div>

              <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 10, maxHeight: "62vh", overflow: "auto" }}>
                {itemsInSelected.length === 0 ? (
                  <div style={{ opacity: 0.75 }}>No items stored in this location.</div>
                ) : (
                  itemsInSelected.map(({ it, qty }) => {
                    const total = totalQty(it);

                    return (
                      <div
                        key={it.id}
                        draggable
                        onDragStart={(e) => onDragStart(e, { itemId: it.id, fromLocationId: selectedLocationId })}
                        style={{
                          display: "grid",
                          gridTemplateColumns: "72px 1fr auto",
                          gap: 10,
                          alignItems: "center",
                          padding: 10,
                          borderRadius: 12,
                          border: "1px solid rgba(255,255,255,0.14)",
                          background: "rgba(255,255,255,0.02)",
                        }}
                      >
                        {/* Photo */}
                        <div style={{ width: 72 }}>
                          {it.photoDataUrl ? (
                            <img
                              src={it.photoDataUrl}
                              alt={it.name}
                              style={{
                                width: 72,
                                height: 72,
                                borderRadius: 12,
                                objectFit: "cover",
                                cursor: "pointer",
                              }}
                              onClick={() => setLightbox({ open: true, src: it.photoDataUrl!, title: it.name })}
                            />
                          ) : (
                            <div
                              style={{
                                width: 72,
                                height: 72,
                                borderRadius: 12,
                                border: "1px dashed rgba(255,255,255,0.2)",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                fontSize: 12,
                                opacity: 0.7,
                              }}
                            >
                              —
                            </div>
                          )}
                        </div>

                        {/* Details */}
                        <div>
                          <div style={{ display: "flex", gap: 10, alignItems: "baseline", flexWrap: "wrap" }}>
                            <div style={{ fontWeight: 1000 }}>{it.name}</div>
                            <div style={{ fontSize: 12, opacity: 0.85 }}>
                              PN: {it.partNumber || "—"} · Mfr: {it.manufacturer || "—"} · Model: {it.model || "—"} · SN: {it.serial || "—"}
                            </div>
                          </div>

                          <div style={{ marginTop: 6, fontSize: 12, opacity: 0.9 }}>
                            <strong>Qty here:</strong> {qty}{" "}
                            <span style={{ opacity: 0.75 }}>(Total: {total})</span>
                          </div>

                          {/* Quick actions */}
                          <div style={{ marginTop: 8, display: "flex", gap: 8, flexWrap: "wrap" }}>
                            <button onClick={() => itemsApi.adjustAtLocation(it.id, selectedLocationId, -1)}>-1</button>
                            <button onClick={() => itemsApi.adjustAtLocation(it.id, selectedLocationId, +1)}>+1</button>

                            <button
                              onClick={() => {
                                const qStr = prompt("Take out how many?", "1");
                                if (!qStr) return;
                                const q = Math.max(1, Math.floor(Number(qStr) || 1));
                                itemsApi.adjustAtLocation(it.id, selectedLocationId, -q);
                              }}
                            >
                              Take out…
                            </button>

                            <button
                              onClick={() => receiveToSelected(it.id)}
                              style={{ fontWeight: 1000 }}
                            >
                              Receive here
                            </button>
                          </div>

                          {/* Breakdown dropdown */}
                          <details style={{ marginTop: 8 }}>
                            <summary style={{ cursor: "pointer", fontSize: 12, opacity: 0.9 }}>
                              In-stock breakdown by location
                            </summary>
                            <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 6 }}>
                              {(it.stockByLocation ?? [])
                                .slice()
                                .sort((a, b) => (a.locationId || "").localeCompare(b.locationId || ""))
                                .map((r) => (
                                  <div
                                    key={`${it.id}:${r.locationId || "missing"}`}
                                    style={{
                                      fontSize: 12,
                                      opacity: 0.9,
                                      display: "flex",
                                      justifyContent: "space-between",
                                      gap: 10,
                                    }}
                                  >
                                    <span>{r.locationId ? pathLabel(loc.roots, [r.locationId]) : "Missing Location"}</span>
                                    <strong>{r.quantity}</strong>
                                  </div>
                                ))}
                            </div>
                          </details>
                        </div>

                        {/* Move */}
                        <div style={{ display: "flex", flexDirection: "column", gap: 8, alignItems: "flex-end" }}>
                          <button
                            onClick={() => openMoveModal(it.id, selectedLocationId, selectedPath)}
                            style={{ padding: "8px 12px", borderRadius: 10, fontWeight: 1000 }}
                          >
                            Move…
                          </button>

                          <div style={{ fontSize: 11, opacity: 0.75 }}>Drag to left</div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* MOVE MODAL */}
      {move.open && (
        <Modal title="Move stock" onClose={closeMoveModal}>
          {(() => {
            const item = itemsApi.items.find((x) => x.id === move.itemId);
            if (!item) return <div>Item not found.</div>;

            const fromId = move.fromPath[move.fromPath.length - 1] ?? "";
            const available = qtyAt(item, fromId);

            return (
              <div>
                <div style={{ fontWeight: 1000, fontSize: 16 }}>{item.name}</div>

                {item.photoDataUrl && (
                  <img
                    src={item.photoDataUrl}
                    alt={item.name}
                    style={{ width: 110, height: 110, borderRadius: 14, objectFit: "cover", marginTop: 10, cursor: "pointer" }}
                    onClick={() => setLightbox({ open: true, src: item.photoDataUrl!, title: item.name })}
                  />
                )}

                <div style={{ marginTop: 10, fontSize: 12, opacity: 0.85 }}>
                  From: <strong>{fromId ? pathLabel(loc.roots, [fromId]) : "Missing Location"}</strong> (available: {available})
                </div>

                <div style={{ marginTop: 12 }}>
                  <div style={{ fontSize: 12, fontWeight: 900, marginBottom: 4 }}>Qty to move</div>
                  <input
                    type="number"
                    min={1}
                    max={available}
                    value={move.qty}
                    onChange={(e) => setMove((m) => ({ ...m, qty: Number(e.target.value) }))}
                    style={{ width: "100%", padding: 10 }}
                  />
                </div>

                <div style={{ marginTop: 12 }}>
                  <div style={{ fontSize: 12, fontWeight: 900, marginBottom: 6 }}>To location</div>
                  <LocationPicker roots={loc.roots} value={move.toPath} onChange={(p) => setMove((m) => ({ ...m, toPath: p }))} />
                  <div style={{ marginTop: 6, fontSize: 12, opacity: 0.75 }}>
                    Selected: <strong>{move.toPath.length ? pathLabel(loc.roots, move.toPath) : "None"}</strong>
                  </div>
                </div>

                <details style={{ marginTop: 12 }}>
                  <summary style={{ cursor: "pointer", fontSize: 12, fontWeight: 900 }}>Current stock breakdown</summary>
                  <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 6 }}>
                    {(item.stockByLocation ?? [])
                      .slice()
                      .sort((a, b) => (a.locationId || "").localeCompare(b.locationId || ""))
                      .map((r) => (
                        <div
                          key={`${item.id}:${r.locationId || "missing"}`}
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            gap: 10,
                            fontSize: 12,
                            opacity: 0.9,
                          }}
                        >
                          <span>{r.locationId ? pathLabel(loc.roots, [r.locationId]) : "Missing Location"}</span>
                          <strong>{r.quantity}</strong>
                        </div>
                      ))}
                  </div>
                </details>

                <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 14 }}>
                  <button onClick={closeMoveModal}>Cancel</button>
                  <button
                    onClick={doMoveModal}
                    style={{ fontWeight: 1000 }}
                    disabled={available <= 0 || move.toPath.length === 0}
                  >
                    Move
                  </button>
                </div>
              </div>
            );
          })()}
        </Modal>
      )}

      {/* PHOTO LIGHTBOX */}
      {lightbox.open && (
        <div
          onClick={() => setLightbox({ open: false })}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.85)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 16,
            zIndex: 99999,
          }}
        >
          <div onClick={(e) => e.stopPropagation()} style={{ maxWidth: "95vw", maxHeight: "95vh" }}>
            <div style={{ color: "white", fontWeight: 1000, marginBottom: 8 }}>{lightbox.title}</div>
            <img src={lightbox.src} style={{ maxWidth: "90vw", maxHeight: "80vh", borderRadius: 14 }} />
            <div style={{ marginTop: 10 }}>
              <button onClick={() => setLightbox({ open: false })}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}