import { useMemo, useState } from "react";
import { useLocations, type LocationNode } from "../hooks/useLocations";

type LooseLocations = ReturnType<typeof useLocations> & Record<string, unknown>;

type FlatNode = {
  id: string;
  name: string;
  depth: number;
  parentId: string | null;
};

function toRecord(v: unknown): Record<string, unknown> {
  if (typeof v === "object" && v !== null) return v as Record<string, unknown>;
  return {};
}

function safeRoots(loc: LooseLocations): LocationNode[] {
  const rec = toRecord(loc);
  const roots = rec.roots;
  if (Array.isArray(roots)) return roots as LocationNode[];
  return [];
}

function flattenTree(roots: LocationNode[]): FlatNode[] {
  const out: FlatNode[] = [];
  const walk = (nodes: LocationNode[], depth: number, parentId: string | null) => {
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
function callFirst(loc: LooseLocations, fnNames: string[], argVariants: unknown[][]): boolean {
  for (const name of fnNames) {
    const fn = loc[name];
    if (typeof fn !== "function") continue;

    for (const args of argVariants) {
      try {
        (fn as (...p: unknown[]) => unknown)(...args);
        return true;
      } catch {
        // try next arg variant
      }
    }
  }
  return false;
}

type LocationManagerProps = {
  embedded?: boolean;
};

export default function LocationManager({ embedded = false }: LocationManagerProps) {
  const loc = useLocations() as LooseLocations;

  const roots = useMemo(() => safeRoots(loc), [loc]);
  const flat = useMemo(() => flattenTree(roots), [roots]);

  const [newRootName, setNewRootName] = useState("");

  const canAddRoot = useMemo(() => {
    return ["addRoot", "addRootLocation", "createRoot", "addLocation"].some((k) => typeof loc?.[k] === "function");
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

  return (
    <div className={"managerPage" + (embedded ? " managerEmbedded" : " cardSoft") }>
      {!embedded ? (
        <div className="screenHeader managerHeader">
          <div>
            <h2>Manage Locations</h2>
            <div className="muted">Add top-level locations so stocked items can show where parts are stored.</div>
          </div>
          <div className="chips">
            <span className="chip">Locations: {flat.length}</span>
          </div>
        </div>
      ) : null}

      {!embedded ? (
        <div className="managerNote managerRowGapBottom">
          If buttons don’t work, it means your <code>useLocations.ts</code> is missing the matching function names. This
          manager won’t crash — it will tell you what’s missing.
        </div>
      ) : null}

      <div className="split2 locationManagerSplit">
        {/* Left: list */}
        <div className="cardSoft locationListCard">
          <div className="locationListHeader">
            Locations ({flat.length})
          </div>

          <div className="locationListBody">
            {flat.length === 0 ? (
              <div className="managerEmpty">No locations yet.</div>
            ) : (
              flat.map((n) => {
                return (
                  <div key={n.id} className="locationListBtn">
                    <span style={{ opacity: 0.7, marginRight: 8 }}>{"•".repeat(Math.min(6, n.depth + 1))}</span>
                    <strong>{n.name}</strong>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right: actions */}
        <div className="stack">
          <div className="cardSoft managerCard">
            <div className="managerCardTitle managerSmallTitle">Add location</div>
            <div className="rowWrap">
              <input
                value={newRootName}
                onChange={(e) => setNewRootName(e.target.value)}
                placeholder="e.g. Shop"
              />
              <button className="btn primary" onClick={addRoot} disabled={!canAddRoot}>
                Add Location
              </button>
            </div>
          </div>

          {!embedded ? (
            <div className="managerNote">
              Hook detected: roots={String(!!loc?.roots)}, locations={String(!!loc?.locations)}, flatten=
              {String(typeof loc?.flatten === "function")}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}