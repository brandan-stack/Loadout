import { useMemo } from "react";
import type { LocationNode } from "../hooks/useLocations";

type Props = {
  roots: LocationNode[];
  value: string[]; // path of ids
  onChange: (path: string[]) => void;
};

function findChildrenByPath(roots: LocationNode[], path: string[]) {
  let nodes = roots;
  for (const id of path) {
    const n = nodes.find((x) => x.id === id);
    if (!n) return [];
    nodes = n.children;
  }
  return nodes;
}

export default function LocationPicker({ roots, value, onChange }: Props) {
  const selectStyle = {
    padding: 10,
    minWidth: 0,
    flex: "1 1 220px",
    maxWidth: "100%",
  } as const;

  const levels = useMemo(() => {
    const arr: LocationNode[][] = [];
    arr.push(roots);
    for (let i = 0; i < value.length; i++) {
      const kids = findChildrenByPath(roots, value.slice(0, i + 1));
      if (!kids.length) break;
      arr.push(kids);
    }
    return arr;
  }, [roots, value]);

  return (
    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
      <select
        value={value[0] ?? ""}
        onChange={(e) => {
          const id = e.target.value;
          onChange(id ? [id] : []);
        }}
        style={selectStyle}
      >
        <option value="">Missing Location</option>
        {roots.map((r) => (
          <option key={r.id} value={r.id}>
            {r.name}
          </option>
        ))}
      </select>

      {levels.slice(1).map((nodes, idx) => {
        const levelIndex = idx + 1;
        const selected = value[levelIndex] ?? "";
        return (
          <select
            key={levelIndex}
            value={selected}
            onChange={(e) => {
              const id = e.target.value;
              const next = value.slice(0, levelIndex);
              if (id) next.push(id);
              onChange(next);
            }}
            style={selectStyle}
          >
            <option value="">{nodes.length ? "Select sub-location…" : "No sub-locations"}</option>
            {nodes.map((n) => (
              <option key={n.id} value={n.id}>
                {n.name}
              </option>
            ))}
          </select>
        );
      })}
    </div>
  );
}