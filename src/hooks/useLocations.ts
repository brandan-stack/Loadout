import { useEffect, useState } from "react";

export type LocationNode = {
  id: string;
  name: string;
  children: LocationNode[];
};

const STORAGE = "inventory.locations.v1";

function id() {
  return Math.random().toString(36).slice(2, 10) + "-" + Date.now().toString(36);
}

function load(): LocationNode[] {
  try {
    const raw = localStorage.getItem(STORAGE);
    if (!raw) {
      // starter locations
      return [
        { id: id(), name: "Shop", children: [] },
        { id: id(), name: "Truck", children: [] },
        { id: id(), name: "Warehouse", children: [] },
      ];
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as LocationNode[]) : [];
  } catch {
    return [];
  }
}

function save(roots: LocationNode[]) {
  localStorage.setItem(STORAGE, JSON.stringify(roots));
}

export function useLocations() {
  const [roots, setRoots] = useState<LocationNode[]>(load);

  useEffect(() => save(roots), [roots]);

  useEffect(() => {
    const reloadFromStorage = () => setRoots(load());
    const onStorage = (event: StorageEvent) => {
      if (event.key && event.key !== STORAGE) return;
      reloadFromStorage();
    };

    window.addEventListener("loadout:state-updated", reloadFromStorage);
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener("loadout:state-updated", reloadFromStorage);
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  function addRoot(name: string) {
    const n = name.trim();
    if (!n) return;
    setRoots((prev) => [...prev, { id: id(), name: n, children: [] }]);
  }

  function addChild(parentId: string, name: string) {
    const n = name.trim();
    if (!n) return;
    const rec = (nodes: LocationNode[]): LocationNode[] =>
      nodes.map((x) =>
        x.id === parentId
          ? { ...x, children: [...x.children, { id: id(), name: n, children: [] }] }
          : { ...x, children: rec(x.children) }
      );
    setRoots((prev) => rec(prev));
  }

  function rename(nodeId: string, name: string) {
    const n = name.trim();
    if (!n) return;
    const rec = (nodes: LocationNode[]): LocationNode[] =>
      nodes.map((x) =>
        x.id === nodeId ? { ...x, name: n } : { ...x, children: rec(x.children) }
      );
    setRoots((prev) => rec(prev));
  }

  function remove(nodeId: string) {
    const rec = (nodes: LocationNode[]): LocationNode[] =>
      nodes
        .filter((x) => x.id !== nodeId)
        .map((x) => ({ ...x, children: rec(x.children) }));
    setRoots((prev) => rec(prev));
  }

  return { roots, addRoot, addChild, rename, remove };
}