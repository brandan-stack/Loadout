import { useEffect, useMemo, useState } from "react";

export type Subcategory = { id: string; name: string; aliases: string[] };
export type Category = { id: string; name: string; aliases: string[]; subcategories: Subcategory[] };

const STORAGE_V2 = "inventory.categories.v2";

function id() {
  return Math.random().toString(36).slice(2, 10) + "-" + Date.now().toString(36);
}
function norm(s: string) {
  return (s ?? "").trim().toLowerCase();
}
function load(): Category[] {
  try {
    const raw = localStorage.getItem(STORAGE_V2);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as Category[]) : [];
  } catch {
    return [];
  }
}
function save(categories: Category[]) {
  localStorage.setItem(STORAGE_V2, JSON.stringify(categories));
}

export function useCategories() {
  const [categories, setCategories] = useState<Category[]>(load);

  useEffect(() => save(categories), [categories]);

  useEffect(() => {
    const reloadFromStorage = () => setCategories(load());
    const onStorage = (event: StorageEvent) => {
      if (event.key && event.key !== STORAGE_V2) return;
      reloadFromStorage();
    };

    window.addEventListener("loadout:state-updated", reloadFromStorage);
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener("loadout:state-updated", reloadFromStorage);
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  function getCategory(categoryIdOrName?: string) {
    const k = norm(categoryIdOrName ?? "");
    if (!k) return undefined;
    return categories.find((c) => norm(c.id) === k || norm(c.name) === k || (c.aliases ?? []).some((a) => norm(a) === k));
  }

  function getSubcategory(categoryIdOrName?: string, subIdOrName?: string) {
    const cat = getCategory(categoryIdOrName);
    if (!cat) return undefined;
    const k = norm(subIdOrName ?? "");
    if (!k) return undefined;
    return cat.subcategories.find((s) => norm(s.id) === k || norm(s.name) === k || (s.aliases ?? []).some((a) => norm(a) === k));
  }

  function getCategoryName(categoryIdOrName?: string) {
    return getCategory(categoryIdOrName)?.name ?? "Uncategorized";
  }
  function getSubName(categoryIdOrName?: string, subIdOrName?: string) {
    return getSubcategory(categoryIdOrName, subIdOrName)?.name ?? "";
  }

  function addCategory(name: string) {
    const n = name.trim();
    if (!n) return;
    if (categories.some((c) => norm(c.name) === norm(n))) return;
    setCategories((prev) => [...prev, { id: id(), name: n, aliases: [n], subcategories: [] }]);
  }

  function deleteCategory(categoryIdOrName: string) {
    const cat = getCategory(categoryIdOrName);
    if (!cat) return;
    setCategories((prev) => prev.filter((c) => c.id !== cat.id));
  }

  function renameCategory(categoryIdOrName: string, newName: string) {
    const cat = getCategory(categoryIdOrName);
    if (!cat) return;
    const n = newName.trim();
    if (!n) return;
    setCategories((prev) =>
      prev.map((c) =>
        c.id === cat.id
          ? { ...c, name: n, aliases: Array.from(new Set([...(c.aliases ?? []), c.name, n])) }
          : c
      )
    );
  }

  function addSubcategory(categoryIdOrName: string, name: string) {
    const cat = getCategory(categoryIdOrName);
    if (!cat) return;
    const n = name.trim();
    if (!n) return;
    if (cat.subcategories.some((s) => norm(s.name) === norm(n))) return;
    setCategories((prev) =>
      prev.map((c) =>
        c.id === cat.id
          ? { ...c, subcategories: [...c.subcategories, { id: id(), name: n, aliases: [n] }] }
          : c
      )
    );
  }

  function deleteSubcategory(categoryIdOrName: string, subIdOrName: string) {
    const cat = getCategory(categoryIdOrName);
    if (!cat) return;
    const sub = getSubcategory(cat.id, subIdOrName);
    if (!sub) return;
    setCategories((prev) =>
      prev.map((c) => (c.id === cat.id ? { ...c, subcategories: c.subcategories.filter((s) => s.id !== sub.id) } : c))
    );
  }

  function renameSubcategory(categoryIdOrName: string, subIdOrName: string, newName: string) {
    const cat = getCategory(categoryIdOrName);
    if (!cat) return;
    const sub = getSubcategory(cat.id, subIdOrName);
    if (!sub) return;
    const n = newName.trim();
    if (!n) return;
    setCategories((prev) =>
      prev.map((c) =>
        c.id === cat.id
          ? {
              ...c,
              subcategories: c.subcategories.map((s) =>
                s.id === sub.id ? { ...s, name: n, aliases: Array.from(new Set([...(s.aliases ?? []), s.name, n])) } : s
              ),
            }
          : c
      )
    );
  }

  const categoryOptions = useMemo(
    () => categories.slice().sort((a, b) => a.name.localeCompare(b.name)).map((c) => ({ id: c.id, name: c.name })),
    [categories]
  );

  function subcategoryOptions(categoryIdOrName?: string) {
    const cat = getCategory(categoryIdOrName);
    if (!cat) return [];
    return cat.subcategories.slice().sort((a, b) => a.name.localeCompare(b.name)).map((s) => ({ id: s.id, name: s.name }));
  }

  return {
    categories,
    categoryOptions,
    subcategoryOptions,
    addCategory,
    deleteCategory,
    renameCategory,
    addSubcategory,
    deleteSubcategory,
    renameSubcategory,
    getCategoryName,
    getSubName,
    getCategory,
    getSubcategory,
  };
}