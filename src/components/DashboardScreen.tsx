import { useMemo } from "react";
import { useItems, type InventoryItem } from "../hooks/useItems";
import { useCategories } from "../hooks/useCategories";
import { loadActivity, type ActivityEvent } from "../lib/activityStore";

function totalQty(item: InventoryItem) {
  return (item.stockByLocation ?? []).reduce((sum, r) => sum + (r.quantity ?? 0), 0);
}

function fmt(ts: number) {
  try {
    return new Date(ts).toLocaleString();
  } catch {
    return String(ts);
  }
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="dashboardCard">
      <div className="dashboardCardTitle">{title}</div>
      {children}
    </div>
  );
}

function Badge({ children }: { children: React.ReactNode }) {
  return <span className="dashboardBadge">{children}</span>;
}

function activityLabel(ev: ActivityEvent) {
  switch (ev.type) {
    case "ADD_ITEM": return "Added item";
    case "EDIT_ITEM": return "Edited item";
    case "DELETE_ITEM": return "Deleted item";
    case "RECEIVE": return "Received";
    case "TAKE_OUT": return "Took out";
    case "MOVE": return "Moved";
    case "CATEGORY_CHANGE": return "Category";
    case "PHOTO_CHANGE": return "Photo";
    default: return ev.type;
  }
}

export default function DashboardScreen() {
  const itemsApi = useItems();
  const cats = useCategories();
  const activity = loadActivity().slice().sort((a, b) => (b.ts ?? 0) - (a.ts ?? 0));

  function categoryLabel(it: InventoryItem) {
    const catName = cats.getCategoryName(it.categoryId);
    const subName = it.subcategoryId ? cats.getSubName(it.categoryId, it.subcategoryId) : "";
    return subName ? `${catName} › ${subName}` : catName;
  }

  const stats = useMemo(() => {
    const items = itemsApi.items;
    const totalStock = items.reduce((sum, it) => sum + totalQty(it), 0);
    const lowStock = items.filter((it) => typeof it.lowStock === "number" && it.lowStock > 0 && totalQty(it) <= it.lowStock).length;
    return {
      items: items.length,
      totalStock,
      lowStock,
    };
  }, [itemsApi.items]);

  const restock = useMemo(() => {
    return itemsApi.items
      .filter((it) => typeof it.lowStock === "number" && it.lowStock > 0 && totalQty(it) <= it.lowStock)
      .map((it) => {
        const t = totalQty(it);
        const low = it.lowStock as number;
        return { it, t, low, need: Math.max(0, low - t), ratio: low > 0 ? t / low : 1 };
      })
      .sort((a, b) => a.ratio - b.ratio)
      .slice(0, 10);
  }, [itemsApi.items]);

  return (
    <div className="page dashboardPage">
      <div className="dashboardHeader">
        <div>
          <h2 className="dashboardTitle">Dashboard</h2>
          <div className="dashboardSubtitle">Inventory health, restock priorities, and recent activity.</div>
        </div>
      </div>

      <div className="dashboardStats dashboardGapTop">
        <Card title="Items">
          <div className="dashboardStatValue">{stats.items}</div>
          <div className="dashboardStatNote">Unique inventory items</div>
        </Card>
        <Card title="Total stock">
          <div className="dashboardStatValue">{stats.totalStock}</div>
          <div className="dashboardStatNote">All quantities across locations</div>
        </Card>
        <Card title="Low stock alerts">
          <div className="dashboardStatValue">{stats.lowStock}</div>
          <div className="dashboardStatNote">Items at or below threshold</div>
        </Card>
      </div>

      <div className="dashboardMain dashboardGapTop">
        <div id="dashboard-restock-list">
        <Card title="Restock list (worst first)">
          {restock.length === 0 ? (
            <div className="dashboardMuted">No low-stock items. You’re good.</div>
          ) : (
            <div className="dashboardStack">
              {restock.map(({ it, t, low, need }) => (
                <div key={it.id} className="dashboardRestockRow">
                  <div className="dashboardItemMain">
                    <div className="dashboardItemName">{it.name}</div>
                    <div className="dashboardItemMeta">{categoryLabel(it)}</div>
                    <div className="dashboardPills">
                      <Badge>In Stock: {t}</Badge>
                      <Badge>Low: {low}</Badge>
                      <Badge>Need to Reorder: {need}</Badge>
                    </div>
                  </div>
                  <div className="dashboardRightMeta">
                    <div className="dashboardItemMeta">Part Number</div>
                    <div className="dashboardStrong">{it.partNumber || "—"}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
        </div>

        <Card title="Recent activity (audit log)">
          {activity.length === 0 ? (
            <div className="dashboardMuted">No activity yet.</div>
          ) : (
            <div className="dashboardAuditList">
              {activity.slice(0, 12).map((ev) => (
                <div key={ev.id} className="dashboardAuditRow">
                  {fmt(ev.ts)} • {activityLabel(ev)} • {ev.itemName ?? "—"} {typeof ev.qty === "number" ? `• Quantity ${ev.qty}` : ""} {ev.note ? `• ${ev.note}` : ""}
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
