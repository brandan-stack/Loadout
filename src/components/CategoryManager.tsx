import { useMemo, useState } from "react";
import { useCategories } from "../hooks/useCategories";

export default function CategoryManager() {
  const cats = useCategories();

  const [newCatName, setNewCatName] = useState("");
  const [newSubName, setNewSubName] = useState("");
  const [selectedCatId, setSelectedCatId] = useState<string>("");

  const [editingCatId, setEditingCatId] = useState<string>("");
  const [editingCatName, setEditingCatName] = useState<string>("");

  const [editingSubId, setEditingSubId] = useState<string>("");
  const [editingSubName, setEditingSubName] = useState<string>("");

  const categories = useMemo(() => {
    return (cats.categories ?? []).slice().sort((a, b) => a.name.localeCompare(b.name));
  }, [cats.categories]);

  const selectedCat = useMemo(() => {
    return categories.find((c) => c.id === selectedCatId);
  }, [categories, selectedCatId]);

  const subs = useMemo(() => {
    if (!selectedCat) return [];
    return (selectedCat.subcategories ?? []).slice().sort((a, b) => a.name.localeCompare(b.name));
  }, [selectedCat]);

  function startEditCategory(catId: string, current: string) {
    setEditingCatId(catId);
    setEditingCatName(current);
  }

  function cancelEditCategory() {
    setEditingCatId("");
    setEditingCatName("");
  }

  function saveEditCategory() {
    if (!editingCatId) return;
    cats.renameCategory(editingCatId, editingCatName);
    cancelEditCategory();
  }

  function startEditSub(subId: string, current: string) {
    setEditingSubId(subId);
    setEditingSubName(current);
  }

  function cancelEditSub() {
    setEditingSubId("");
    setEditingSubName("");
  }

  function saveEditSub() {
    if (!selectedCatId || !editingSubId) return;
    cats.renameSubcategory(selectedCatId, editingSubId, editingSubName);
    cancelEditSub();
  }

  return (
    <div style={{ padding: 16 }}>
      <h2 style={{ marginTop: 0 }}>Category Manager</h2>

      {/* Add Category */}
      <div
        style={{
          border: "1px solid rgba(255,255,255,0.14)",
          borderRadius: 14,
          padding: 12,
          background: "rgba(255,255,255,0.03)",
          marginBottom: 12,
        }}
      >
        <div style={{ fontWeight: 1000, marginBottom: 8 }}>Add category</div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <input
            value={newCatName}
            onChange={(e) => setNewCatName(e.target.value)}
            placeholder="e.g., Fasteners, Electrical, Tools…"
            style={{ padding: 10, minWidth: 260, flex: 1 }}
          />
          <button
            style={{ fontWeight: 1000 }}
            onClick={() => {
              const name = newCatName.trim();
              if (!name) return;
              cats.addCategory(name);
              setNewCatName("");
            }}
          >
            Add
          </button>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1.2fr", gap: 12 }}>
        {/* Categories list */}
        <div
          style={{
            border: "1px solid rgba(255,255,255,0.14)",
            borderRadius: 14,
            padding: 12,
            background: "rgba(255,255,255,0.03)",
            minHeight: 320,
          }}
        >
          <div style={{ fontWeight: 1000, marginBottom: 8 }}>Categories</div>

          {categories.length === 0 ? (
            <div style={{ opacity: 0.75 }}>No categories yet.</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {categories.map((c) => {
                const selected = c.id === selectedCatId;
                const isEditing = c.id === editingCatId;

                return (
                  <div
                    key={c.id}
                    style={{
                      border: selected ? "2px solid rgba(255,255,255,0.55)" : "1px solid rgba(255,255,255,0.14)",
                      borderRadius: 12,
                      padding: 10,
                      background: "rgba(255,255,255,0.02)",
                      display: "flex",
                      gap: 10,
                      alignItems: "center",
                    }}
                  >
                    <button
                      onClick={() => setSelectedCatId(c.id)}
                      style={{
                        padding: "6px 10px",
                        borderRadius: 10,
                        fontWeight: 1000,
                        opacity: selected ? 1 : 0.9,
                      }}
                    >
                      Select
                    </button>

                    <div style={{ flex: 1 }}>
                      {isEditing ? (
                        <input
                          value={editingCatName}
                          onChange={(e) => setEditingCatName(e.target.value)}
                          style={{ width: "100%", padding: 8 }}
                        />
                      ) : (
                        <div style={{ fontWeight: 1000 }}>{c.name}</div>
                      )}
                      <div style={{ fontSize: 12, opacity: 0.75 }}>
                        Subcategories: {(c.subcategories ?? []).length}
                      </div>
                    </div>

                    {isEditing ? (
                      <div style={{ display: "flex", gap: 8 }}>
                        <button onClick={cancelEditCategory}>Cancel</button>
                        <button onClick={saveEditCategory} style={{ fontWeight: 1000 }}>
                          Save
                        </button>
                      </div>
                    ) : (
                      <div style={{ display: "flex", gap: 8 }}>
                        <button onClick={() => startEditCategory(c.id, c.name)}>Edit</button>
                        <button
                          onClick={() => {
                            if (!confirm(`Delete category "${c.name}"? (Does not delete items, only the label)`)) return;
                            cats.deleteCategory(c.id);
                            if (selectedCatId === c.id) setSelectedCatId("");
                          }}
                          style={{ color: "tomato" }}
                        >
                          Delete
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Subcategories */}
        <div
          style={{
            border: "1px solid rgba(255,255,255,0.14)",
            borderRadius: 14,
            padding: 12,
            background: "rgba(255,255,255,0.03)",
            minHeight: 320,
          }}
        >
          <div style={{ fontWeight: 1000, marginBottom: 8 }}>Subcategories</div>

          {!selectedCat ? (
            <div style={{ opacity: 0.75 }}>Select a category to manage its subcategories.</div>
          ) : (
            <>
              {/* Add sub */}
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 10 }}>
                <input
                  value={newSubName}
                  onChange={(e) => setNewSubName(e.target.value)}
                  placeholder={`Add subcategory under "${selectedCat.name}"`}
                  style={{ padding: 10, minWidth: 260, flex: 1 }}
                />
                <button
                  style={{ fontWeight: 1000 }}
                  onClick={() => {
                    const name = newSubName.trim();
                    if (!name) return;
                    cats.addSubcategory(selectedCat.id, name);
                    setNewSubName("");
                  }}
                >
                  Add sub
                </button>
              </div>

              {subs.length === 0 ? (
                <div style={{ opacity: 0.75 }}>No subcategories yet.</div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {subs.map((s) => {
                    const isEditing = s.id === editingSubId;

                    return (
                      <div
                        key={s.id}
                        style={{
                          border: "1px solid rgba(255,255,255,0.14)",
                          borderRadius: 12,
                          padding: 10,
                          background: "rgba(255,255,255,0.02)",
                          display: "flex",
                          gap: 10,
                          alignItems: "center",
                        }}
                      >
                        <div style={{ flex: 1 }}>
                          {isEditing ? (
                            <input
                              value={editingSubName}
                              onChange={(e) => setEditingSubName(e.target.value)}
                              style={{ width: "100%", padding: 8 }}
                            />
                          ) : (
                            <div style={{ fontWeight: 1000 }}>{s.name}</div>
                          )}
                          <div style={{ fontSize: 12, opacity: 0.75 }}>ID: {s.id}</div>
                        </div>

                        {isEditing ? (
                          <div style={{ display: "flex", gap: 8 }}>
                            <button onClick={cancelEditSub}>Cancel</button>
                            <button onClick={saveEditSub} style={{ fontWeight: 1000 }}>
                              Save
                            </button>
                          </div>
                        ) : (
                          <div style={{ display: "flex", gap: 8 }}>
                            <button onClick={() => startEditSub(s.id, s.name)}>Edit</button>
                            <button
                              onClick={() => {
                                if (!confirm(`Delete subcategory "${s.name}"?`)) return;
                                cats.deleteSubcategory(selectedCat.id, s.id);
                              }}
                              style={{ color: "tomato" }}
                            >
                              Delete
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Tip */}
      <div style={{ marginTop: 12, fontSize: 12, opacity: 0.75 }}>
        Tip: Categories/Subcategories are labels. Items won’t be deleted if you remove a category — they’ll just show as Uncategorized.
      </div>
    </div>
  );
}