import { useMemo, useState } from "react";
import { useLocations } from "../hooks/useLocations";

type AnyLoc = any;

type FlatNode = {
  id: string;
  name: string;
  depth: number;
  parentId: string | null;
};

function safeRoots(loc: AnyLoc): AnyLoc[] {
  return (loc?.roots ?? loc?.locations ?? loc?.all ?? []) as AnyLoc[];
}

function flattenTree(roots: AnyLoc[]): FlatNode[] {
  const out: FlatNode[] = [];
  const walk = (nodes: AnyLoc[], depth: number, parentId: string | null) => {
    for (const n of nodes ?? []) {
      out.push({ id: String(n.id), name: String(n.name ?? "Unnamed"), depth, parentId });
      walk(n.children ?? [], depth + 1, String(n.id));
    }
  };
  walk(roots, 0, null);
  return out;
}

/**
 * Try calling whichever function name exists on the hook.
 * We attempt multiple argument patterns because different versions differ.
 */
function callFirst(loc: AnyLoc, fnNames: string[], argVariants: any[][]): boolean {
  for (const name of fnNames) {
    const fn = loc?.[name];
    if (typeof fn !== "function") continue;

    for (const args of argVariants) {
      try {
        fn(...args);
        return true;
      } catch {
        // try next arg variant
      }
    }
  }
  return false;
}

export default function LocationManager() {
  const loc = useLocations() as AnyLoc;

  const roots = useMemo(() => safeRoots(loc), [loc]);
  const flat = useMemo(() => flattenTree(roots), [roots]);

  const [selectedId, setSelectedId] = useState<string>("");
  const [newRootName, setNewRootName] = useState("");
  const [newChildName, setNewChildName] = useState("");
  const [renameValue, setRenameValue] = useState("");

  const selected = useMemo(() => flat.find((n) => n.id === selectedId) ?? null, [flat, selectedId]);

  const canAddRoot = useMemo(() => {
    return ["addRoot", "addRootLocation", "createRoot", "addLocation"].some((k) => typeof loc?.[k] === "function");
  }, [loc]);

  const canAddChild = useMemo(() => {
    return ["addChild", "addSubLocation", "createChild", "addLocationChild", "addLocation"].some(
      (k) => typeof loc?.[k] === "function"
    );
  }, [loc]);

  const canRename = useMemo(() => {
    return ["renameLocation", "rename", "updateLocation", "editLocation"].some((k) => typeof loc?.[k] === "function");
  }, [loc]);

  const canDelete = useMemo(() => {
    return ["deleteLocation", "removeLocation", "delete", "remove"].some((k) => typeof loc?.[k] === "function");
  }, [loc]);

  function addRoot() {
    const name = newRootName.trim();
    if (!name) return;

    const ok = callFirst(
      loc,
      ["addRoot", "addRootLocation", "createRoot", "addLocation"],
      [
        [name],
        [{ name }],
        [{ id: "", name, parentId: null }],
        [null, name],
      ]
    );

    if (!ok) alert("Your useLocations hook doesn't expose an add-root function. We can fix useLocations.ts next.");
    setNewRootName("");
  }

  function addChild() {
    const name = newChildName.trim();
    if (!name) return;
    if (!selectedId) {
      alert("Select a parent location first.");
      return;
    }

    const ok = callFirst(
      loc,
      ["addChild", "addSubLocation", "createChild", "addLocationChild", "addLocation"],
      [
        [selectedId, name],
        [selectedId, { name }],
        [{ parentId: selectedId, name }],
        [selectedId, null, name],
      ]
    );

    if (!ok) alert("Your useLocations hook doesn't expose an add-child function. We can fix useLocations.ts next.");
    setNewChildName("");
  }

  function renameSelected() {
    if (!selectedId) return;
    const name = renameValue.trim();
    if (!name) return;

    const ok = callFirst(
      loc,
      ["renameLocation", "rename", "updateLocation", "editLocation"],
      [
        [selectedId, name],
        [selectedId, { name }],
        [{ id: selectedId, name }],
      ]
    );

    if (!ok) alert("Your useLocations hook doesn't expose a rename function. We can fix useLocations.ts next.");
    setRenameValue("");
  }

  function deleteSelected() {
    if (!selectedId) return;
    if (!confirm("Delete this location? (Stock will remain, but may become 'Missing Location' if you used this ID)"))
      return;

    const ok = callFirst(
      loc,
      ["deleteLocation", "removeLocation", "delete", "remove"],
      [[selectedId], [{ id: selectedId }]]
    );

    if (!ok) alert("Your useLocations hook doesn't expose a delete function. We can fix useLocations.ts next.");
    setSelectedId("");
  }

  return (
    <div
      style={{
        border: "1px solid rgba(255,255,255,0.14)",
        borderRadius: 14,
        padding: 12,
        background: "rgba(255,255,255,0.03)",
      }}
    >
      <div style={{ fontWeight: 1000, marginBottom: 10 }}>Manage Locations</div>

      <div style={{ fontSize: 12, opacity: 0.8, marginBottom: 10 }}>
        If buttons don’t work, it means your <code>useLocations.ts</code> is missing the matching function names. This
        manager won’t crash — it will tell you what’s missing.
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        {/* Left: list */}
        <div style={{ border: "1px solid rgba(255,255,255,0.12)", borderRadius: 12, overflow: "hidden" }}>
          <div style={{ padding: 10, fontWeight: 1000, borderBottom: "1px solid rgba(255,255,255,0.10)" }}>
            Locations ({flat.length})
          </div>

          <div style={{ maxHeight: 420, overflow: "auto" }}>
            {flat.length === 0 ? (
              <div style={{ padding: 10, opacity: 0.8 }}>No locations yet.</div>
            ) : (
              flat.map((n) => {
                const active = n.id === selectedId;
                return (
                  <button
                    key={n.id}
                    onClick={() => {
                      setSelectedId(n.id);
                      setRenameValue(n.name);
                    }}
                    style={{
                      width: "100%",
                      textAlign: "left",
                      padding: "10px 12px",
                      border: "none",
                      borderBottom: "1px solid rgba(255,255,255,0.08)",
                      background: active ? "rgba(255,255,255,0.12)" : "transparent",
                      cursor: "pointer",
                      color: "inherit",
                    }}
                  >
                    <span style={{ opacity: 0.7, marginRight: 8 }}>{"•".repeat(Math.min(6, n.depth + 1))}</span>
                    <strong>{n.name}</strong>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Right: actions */}
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{ border: "1px solid rgba(255,255,255,0.12)", borderRadius: 12, padding: 10 }}>
            <div style={{ fontSize: 12, fontWeight: 1000, marginBottom: 6 }}>Add root location</div>
            <div style={{ display: "flex", gap: 8 }}>
              <input
                value={newRootName}
                onChange={(e) => setNewRootName(e.target.value)}
                placeholder="e.g. Shop"
                style={{ width: "100%", padding: 10 }}
              />
              <button onClick={addRoot} disabled={!canAddRoot}>
                Add
              </button>
            </div>
          </div>

          <div style={{ border: "1px solid rgba(255,255,255,0.12)", borderRadius: 12, padding: 10 }}>
            <div style={{ fontSize: 12, fontWeight: 1000, marginBottom: 6 }}>Add sub-location</div>
            <div style={{ fontSize: 12, opacity: 0.8, marginBottom: 6 }}>
              Parent: <strong>{selected ? selected.name : "None selected"}</strong>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <input
                value={newChildName}
                onChange={(e) => setNewChildName(e.target.value)}
                placeholder="e.g. Drawer 1"
                style={{ width: "100%", padding: 10 }}
              />
              <button onClick={addChild} disabled={!canAddChild}>
                Add
              </button>
            </div>
          </div>

          <div style={{ border: "1px solid rgba(255,255,255,0.12)", borderRadius: 12, padding: 10 }}>
            <div style={{ fontSize: 12, fontWeight: 1000, marginBottom: 6 }}>Rename</div>
            <div style={{ display: "flex", gap: 8 }}>
              <input
                value={renameValue}
                onChange={(e) => setRenameValue(e.target.value)}
                placeholder="New name"
                style={{ width: "100%", padding: 10 }}
              />
              <button onClick={renameSelected} disabled={!canRename || !selectedId}>
                Save
              </button>
            </div>
          </div>

          <div style={{ border: "1px solid rgba(255,255,255,0.12)", borderRadius: 12, padding: 10 }}>
            <div style={{ fontSize: 12, fontWeight: 1000, marginBottom: 6 }}>Delete</div>
            <button onClick={deleteSelected} disabled={!canDelete || !selectedId} style={{ color: "tomato" }}>
              Delete selected location
            </button>
          </div>

          <div style={{ fontSize: 12, opacity: 0.75 }}>
            Hook detected: roots={String(!!loc?.roots)}, locations={String(!!loc?.locations)}, flatten=
            {String(typeof loc?.flatten === "function")}
          </div>
        </div>
      </div>
    </div>
  );
}