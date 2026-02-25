import { useMemo, useReducer, useState } from "react";
import { useItems, type InventoryItem } from "../hooks/useItems";
import { useCategories } from "../hooks/useCategories";
import { loadActivity, type ActivityEvent } from "../lib/activityStore";
import { currentUser } from "../lib/authStore";
import { getNotificationsForUser, markJobNotificationRead, markJobNotificationUnread } from "../lib/jobNotificationsStore";

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
  const me = currentUser();
  const [, bump] = useReducer((value: number) => value + 1, 0);
  const [billingTab, setBillingTab] = useState<"unread" | "billed">("billed");
  const activity = loadActivity().slice().sort((a, b) => (b.ts ?? 0) - (a.ts ?? 0));
  const notifications = me ? getNotificationsForUser(me.id) : [];
  const unreadNotifications = notifications.filter((n) => !n.read).slice(0, 20);
  const billedNotifications = notifications.filter((n) => n.read).slice(0, 30);

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

        <div className="dashboardStack">
          <Card title="Billing">
            {!me ? (
              <div className="dashboardMuted">No signed-in user.</div>
            ) : (
              <>
                <div className="dashboardPills" style={{ marginTop: 0, marginBottom: 10 }}>
                  <button className={"btn " + (billingTab === "unread" ? "primary" : "")} type="button" onClick={() => setBillingTab("unread")}>Unread ({unreadNotifications.length})</button>
                  <button className={"btn " + (billingTab === "billed" ? "primary" : "")} type="button" onClick={() => setBillingTab("billed")}>Billed ({billedNotifications.length})</button>
                </div>

                <div className="dashboardStack">
                  {(billingTab === "unread" ? unreadNotifications : billedNotifications).map((n) => (
                    <div key={n.id} className="dashboardRowCard">
                      <div className="dashboardItemMain">
                        <div className="dashboardUsageTop">
                          <Badge>{fmt(n.ts)}</Badge>
                          <span className="pill pillRed">⚠ Billing Required</span>
                          <Badge>{n.read ? "Billed" : "Unread"}</Badge>
                        </div>
                        <div className="dashboardUsageMeta">{n.message}</div>
                        <div className="dashboardUsageMeta">
                          Job Number: {n.jobNumber || "—"} • Part Number: {n.partNumber || "—"} • Qty: {n.qty} • Location: {n.locationId || "Missing Location"} • Submitted By: {n.submittedByName || "—"}
                        </div>
                        <div className="dashboardUsageMeta">
                          Unit Cost: {typeof n.unitPrice === "number" ? new Intl.NumberFormat(undefined, { style: "currency", currency: "USD" }).format(n.unitPrice) : "—"} • Line Cost: {typeof n.lineCost === "number" ? new Intl.NumberFormat(undefined, { style: "currency", currency: "USD" }).format(n.lineCost) : "—"}
                        </div>
                      </div>
                      <button
                        className="btn"
                        type="button"
                        onClick={() => {
                          if (n.read) markJobNotificationUnread(n.id);
                          else markJobNotificationRead(n.id);
                          bump();
                        }}
                      >
                        {n.read ? "Undo" : "Mark as read"}
                      </button>
                    </div>
                  ))}
                  {(billingTab === "unread" ? unreadNotifications.length === 0 : billedNotifications.length === 0) ? (
                    <div className="dashboardMuted">
                      {billingTab === "unread" ? "No unread billing notifications." : "No billed notifications yet."}
                    </div>
                  ) : null}
                </div>
              </>
            )}
          </Card>

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
    </div>
  );
}
