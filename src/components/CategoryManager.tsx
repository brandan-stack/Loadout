import { useMemo, useState } from "react";
import { useCategories } from "../hooks/useCategories";

type CategoryManagerProps = {
  embedded?: boolean;
};

export default function CategoryManager({ embedded = false }: CategoryManagerProps) {
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
    <div className={"screenWrap managerPage" + (embedded ? " managerEmbedded" : " page") }>
      {!embedded ? (
        <div className="screenHeader managerHeader">
          <div>
            <h2>Category Manager</h2>
            <div className="muted">Manage category labels and subcategory structure.</div>
          </div>
          <div className="chips">
            <span className="chip">Categories: {categories.length}</span>
            <span className="chip">Subcategories: {categories.reduce((sum, cat) => sum + (cat.subcategories?.length ?? 0), 0)}</span>
            {selectedCat ? <span className="chip">Selected: {selectedCat.name}</span> : <span className="chip">Selected: None</span>}
          </div>
        </div>
      ) : null}

      {/* Add Category */}
      <div className="cardSoft managerCard">
        <div className="managerCardTitle">Add category</div>
        <div className="rowWrap">
          <input
            value={newCatName}
            onChange={(e) => setNewCatName(e.target.value)}
            placeholder="e.g., Fasteners, Electrical, Tools…"
            className="managerGrowInput"
          />
          <button
            className="btn primary"
            onClick={() => {
              const name = newCatName.trim();
              if (!name) return;
              cats.addCategory(name);
              setNewCatName("");
            }}
          >
            Add Category
          </button>
        </div>
      </div>

      <div className="split2">
        {/* Categories list */}
        <div className="cardSoft managerCard managerMinHeight">
          <div className="managerCardTitle">Categories</div>

          {categories.length === 0 ? (
            <div className="managerEmpty">No categories yet.</div>
          ) : (
            <div className="managerList">
              {categories.map((c) => {
                const selected = c.id === selectedCatId;
                const isEditing = c.id === editingCatId;

                return (
                  <div key={c.id} className={"managerRow " + (selected ? "active" : "")}> 
                    <button
                      className="btn"
                      onClick={() => setSelectedCatId(c.id)}
                    >
                      Select
                    </button>

                    <div className="managerMain">
                      {isEditing ? (
                        <input
                          value={editingCatName}
                          onChange={(e) => setEditingCatName(e.target.value)}
                          className="managerInlineInput"
                        />
                      ) : (
                        <div className="managerStrong">{c.name}</div>
                      )}
                      <div className="managerMeta">
                        Subcategories: {(c.subcategories ?? []).length}
                      </div>
                    </div>

                    {isEditing ? (
                      <div className="managerActions">
                        <button onClick={cancelEditCategory}>Cancel</button>
                        <button className="btn primary" onClick={saveEditCategory}>
                          Save
                        </button>
                      </div>
                    ) : (
                      <div className="managerActions">
                        <button onClick={() => startEditCategory(c.id, c.name)}>Edit</button>
                        <button
                          onClick={() => {
                            if (!confirm(`Delete category "${c.name}"? (Does not delete items, only the label)`)) return;
                            cats.deleteCategory(c.id);
                            if (selectedCatId === c.id) setSelectedCatId("");
                          }}
                          className="btn danger"
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
        <div className="cardSoft managerCard managerMinHeight">
          <div className="managerCardTitle">Subcategories</div>

          {!selectedCat ? (
            <div className="managerEmpty">Select a category to manage its subcategories.</div>
          ) : (
            <>
              {/* Add sub */}
              <div className="rowWrap managerRowGapBottom">
                <input
                  value={newSubName}
                  onChange={(e) => setNewSubName(e.target.value)}
                  placeholder={`Add subcategory under "${selectedCat.name}"`}
                  className="managerGrowInput"
                />
                <button
                  className="btn primary"
                  onClick={() => {
                    const name = newSubName.trim();
                    if (!name) return;
                    cats.addSubcategory(selectedCat.id, name);
                    setNewSubName("");
                  }}
                >
                  Add Subcategory
                </button>
              </div>

              {subs.length === 0 ? (
                <div className="managerEmpty">No subcategories yet.</div>
              ) : (
                <div className="managerList">
                  {subs.map((s) => {
                    const isEditing = s.id === editingSubId;

                    return (
                      <div key={s.id} className="managerRow">
                        <div className="managerMain">
                          {isEditing ? (
                            <input
                              value={editingSubName}
                              onChange={(e) => setEditingSubName(e.target.value)}
                              className="managerInlineInput"
                            />
                          ) : (
                            <div className="managerStrong">{s.name}</div>
                          )}
                          <div className="managerMeta">ID: {s.id}</div>
                        </div>

                        {isEditing ? (
                          <div className="managerActions">
                            <button onClick={cancelEditSub}>Cancel</button>
                            <button className="btn primary" onClick={saveEditSub}>
                              Save
                            </button>
                          </div>
                        ) : (
                          <div className="managerActions">
                            <button onClick={() => startEditSub(s.id, s.name)}>Edit</button>
                            <button
                              onClick={() => {
                                if (!confirm(`Delete subcategory "${s.name}"?`)) return;
                                cats.deleteSubcategory(selectedCat.id, s.id);
                              }}
                              className="btn danger"
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
      {!embedded ? (
        <div className="managerNote">
          Tip: Categories/Subcategories are labels. Items won’t be deleted if you remove a category — they’ll just show as Uncategorized.
        </div>
      ) : null}
    </div>
  );
}