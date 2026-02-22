import type { LocationNode } from "../hooks/useLocations";

export function formatLocationLabel(roots: LocationNode[], path: string[]) {
  if (!path.length) return "Missing Location";
  let nodes = roots;
  const names: string[] = [];
  for (const id of path) {
    const n = nodes.find((x) => x.id === id);
    if (!n) break;
    names.push(n.name);
    nodes = n.children;
  }
  return names.length ? names.join(" → ") : "Missing Location";
}

export function pathFromId(roots: LocationNode[], id: string) {
  const stack: { node: LocationNode; path: string[] }[] = roots.map((r) => ({ node: r, path: [r.id] }));
  while (stack.length) {
    const { node, path } = stack.pop()!;
    if (node.id === id) return path;
    node.children.forEach((c) => stack.push({ node: c, path: [...path, c.id] }));
  }
  return [];
}

export function idInSubtree(roots: LocationNode[], rootId: string, maybeChildId: string) {
  const p = pathFromId(roots, maybeChildId);
  return p.includes(rootId);
}