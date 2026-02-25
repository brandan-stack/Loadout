import { useEffect, useMemo, useReducer, useState } from "react";
import { useItems, type InventoryItem } from "../hooks/useItems";
import { currentUser } from "../lib/authStore";
import {
  approveToolRequest,
  createToolRequest,
  getActiveToolSignouts,
  getToolAlertsForUser,
  loadToolRequests,
  rejectToolRequest,
  returnToolRequest,
  type ToolRequest,
} from "../lib/toolSignoutStore";

function fmt(ts: number) {
  try {
    return new Date(ts).toLocaleString();
  } catch {
    return String(ts);
  }
}

function totalQty(item: InventoryItem) {
  return (item.stockByLocation ?? []).reduce((sum, row) => sum + (row.quantity ?? 0), 0);
}

type InlineToast = {
  tone: "success" | "warning" | "error";
  message: string;
};

function Badge({ children }: { children: React.ReactNode }) {
  return <span className="dashboardBadge">{children}</span>;
}

export default function ToolSignoutScreen({ onChanged }: { onChanged?: () => void }) {
  const itemsApi = useItems();
  const me = currentUser();
  const isAdmin = me?.role === "admin";

  const [, force] = useReducer((n: number) => n + 1, 0);
  const [search, setSearch] = useState("");
  const [qty, setQty] = useState("1");
  const [note, setNote] = useState("");
  const [selectedItemId, setSelectedItemId] = useState("");
  const [attemptedRequest, setAttemptedRequest] = useState(false);
  const [toast, setToast] = useState<InlineToast | null>(null);
  const [adminFilter, setAdminFilter] = useState<ToolRequest["status"] | "all">("pending");

  useEffect(() => {
    if (!toast) return;
    const id = window.setTimeout(() => setToast(null), 3200);
    return () => window.clearTimeout(id);
  }, [toast]);

  const qtyNumber = Math.floor(Number(qty));
  const validQty = Number.isFinite(qtyNumber) && qtyNumber > 0;

  const selectedItem = useMemo(
    () => itemsApi.items.find((it) => it.id === selectedItemId) ?? null,
    [itemsApi.items, selectedItemId]
  );

  const filteredItems = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return itemsApi.items.slice(0, 30);
    return itemsApi.items
      .filter((it) => {
        const hay = [it.name, it.partNumber, it.manufacturer, it.model, it.serial, it.description]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        return hay.includes(q);
      })
      .slice(0, 30);
  }, [itemsApi.items, search]);

  const allRequests = loadToolRequests();
  const pending = allRequests.filter((row) => row.status === "pending");
  const active = getActiveToolSignouts();
  const mine = me ? allRequests.filter((row) => row.requestedByUserId === me.id) : [];
  const myPendingCount = me ? getToolAlertsForUser(me.id, !!isAdmin) : 0;
  const adminReviewRows =
    adminFilter === "all" ? allRequests : allRequests.filter((row) => row.status === adminFilter);

  function requestTool() {
    setAttemptedRequest(true);
    if (!selectedItem || !validQty) {
      setToast({ tone: "error", message: "Select a tool and enter a valid quantity." });
      return;
    }

    try {
      createToolRequest({
        itemId: selectedItem.id,
        itemName: selectedItem.name,
        partNumber: selectedItem.partNumber,
        qty: qtyNumber,
        note,
      });
      setQty("1");
      setNote("");
      setAttemptedRequest(false);
      setToast({ tone: "success", message: "Tool request sent to admin for approval." });
      onChanged?.();
      force();
    } catch (error) {
      setToast({ tone: "error", message: error instanceof Error ? error.message : "Could not create tool request." });
    }
  }

  function handleApprove(row: ToolRequest) {
    approveToolRequest(row.id);
    setToast({ tone: "success", message: `Approved: ${row.itemName} for ${row.requestedByName}.` });
    onChanged?.();
    force();
  }

  function handleReject(row: ToolRequest) {
    rejectToolRequest(row.id);
    setToast({ tone: "warning", message: `Rejected: ${row.itemName} for ${row.requestedByName}.` });
    onChanged?.();
    force();
  }

  function handleReturn(row: ToolRequest) {
    returnToolRequest(row.id);
    setToast({ tone: "success", message: `Marked returned: ${row.itemName}.` });
    onChanged?.();
    force();
  }

  return (
    <div className="page dashboardPage">
      <div className="dashboardHeader">
        <div>
          <h2 className="dashboardTitle">Tool Signout</h2>
          <div className="dashboardSubtitle">Technicians request tools. Admin reviews and accepts.</div>
        </div>
      </div>

      {toast ? (
        <div className={`bannerWarning partsToast partsToast--${toast.tone}`} role="status" aria-live="polite">
          {toast.message}
        </div>
      ) : null}

      <div className="dashboardMain dashboardGapTop">
        <div className="dashboardCard">
          <div className="dashboardCardTitle">Request a Tool</div>
          <div className="dashboardUseGrid">
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search tool by name, part number, serial, model"
            />
            <input
              className={attemptedRequest && !validQty ? "inputInvalid" : ""}
              value={qty}
              onChange={(event) => setQty(event.target.value)}
              inputMode="numeric"
              placeholder="Quantity"
            />
            <input value={note} onChange={(event) => setNote(event.target.value)} placeholder="Request note (optional)" />
          </div>

          <div className={`dashboardItemsList ${attemptedRequest && !selectedItem ? "requiredBlockMissing" : ""}`}>
            {filteredItems.map((item) => (
              <div key={item.id} className={`dashboardItemRow ${selectedItemId === item.id ? "dashboardItemRowSelected" : ""}`}>
                <div className="dashboardItemMain">
                  <div className="dashboardItemName">{item.name}</div>
                  <div className="dashboardItemMeta">Part Number: {item.partNumber || "—"}</div>
                  <div className="dashboardPills">
                    <Badge>Total Quantity: {totalQty(item)}</Badge>
                    <Badge>Low: {item.lowStock ?? "—"}</Badge>
                  </div>
                </div>
                <button className="btn" onClick={() => setSelectedItemId(item.id)}>
                  {selectedItemId === item.id ? "Selected" : "Select Tool"}
                </button>
              </div>
            ))}
            {!filteredItems.length ? <div className="dashboardMuted">No matching tools found.</div> : null}
          </div>

          <div className="dashboardJobActions">
            <button className="btn primary" type="button" onClick={requestTool}>
              Submit Tool Request
            </button>
            <div className="dashboardResultCount">
              {selectedItem ? `Selected: ${selectedItem.name}` : "Select a tool"} • {validQty ? `Qty ${qtyNumber}` : "Enter valid quantity"}
            </div>
          </div>
        </div>

        <div className="dashboardCard">
          <div className="dashboardCardTitle">
            {isAdmin ? `Request Review Queue (${adminReviewRows.length})` : `Pending Requests (Mine ${myPendingCount})`}
          </div>
          {isAdmin ? (
            <div className="dashboardPills">
              <button className={`btn ${adminFilter === "pending" ? "primary" : ""}`} type="button" onClick={() => setAdminFilter("pending")}>Pending</button>
              <button className={`btn ${adminFilter === "approved" ? "primary" : ""}`} type="button" onClick={() => setAdminFilter("approved")}>Approved</button>
              <button className={`btn ${adminFilter === "rejected" ? "primary" : ""}`} type="button" onClick={() => setAdminFilter("rejected")}>Rejected</button>
              <button className={`btn ${adminFilter === "returned" ? "primary" : ""}`} type="button" onClick={() => setAdminFilter("returned")}>Returned</button>
              <button className={`btn ${adminFilter === "all" ? "primary" : ""}`} type="button" onClick={() => setAdminFilter("all")}>All</button>
            </div>
          ) : null}
          <div className="dashboardStack">
            {(isAdmin ? adminReviewRows : pending.filter((row) => row.requestedByUserId === me?.id)).map((row) => (
              <div key={row.id} className="dashboardRowCard">
                <div className="dashboardItemMain">
                  <div className="dashboardItemName">{row.itemName}</div>
                  <div className="dashboardUsageMeta">
                    Requested by {row.requestedByName} • Qty {row.qty} • {fmt(row.ts)} • Status: {row.status.toUpperCase()}
                    {row.partNumber ? ` • Part Number: ${row.partNumber}` : ""}
                    {row.note ? ` • Note: ${row.note}` : ""}
                  </div>
                </div>
                {isAdmin && row.status === "pending" ? (
                  <div className="dashboardJobActions">
                    <button className="btn" type="button" onClick={() => handleApprove(row)}>Accept</button>
                    <button className="btn" type="button" onClick={() => handleReject(row)}>Reject</button>
                  </div>
                ) : isAdmin ? (
                  <Badge>{row.status.toUpperCase()}</Badge>
                ) : (
                  <Badge>Waiting Admin</Badge>
                )}
              </div>
            ))}
            {isAdmin && !adminReviewRows.length ? <div className="dashboardMuted">No requests in this filter.</div> : null}
            {!isAdmin && !pending.length ? <div className="dashboardMuted">No pending tool requests.</div> : null}
          </div>
        </div>

        <div className="dashboardCard" id="tools-active-signout">
          <div className="dashboardCardTitle">Who Has the Tool</div>
          <div className="dashboardStack">
            {active.map((row) => {
              const canReturn = isAdmin || row.requestedByUserId === me?.id;
              return (
                <div key={row.id} className="dashboardRowCard">
                  <div className="dashboardItemMain">
                    <div className="dashboardItemName">{row.itemName}</div>
                    <div className="dashboardUsageMeta">
                      Assigned to {row.requestedByName} • Qty {row.qty} • Approved {fmt(row.decisionAt || row.ts)}
                      {row.decidedByName ? ` • Approved by ${row.decidedByName}` : ""}
                      {row.partNumber ? ` • Part Number: ${row.partNumber}` : ""}
                    </div>
                  </div>
                  {canReturn ? (
                    <button className="btn" type="button" onClick={() => handleReturn(row)}>
                      Mark Returned
                    </button>
                  ) : (
                    <Badge>Checked Out</Badge>
                  )}
                </div>
              );
            })}
            {!active.length ? <div className="dashboardMuted">No active tool signouts.</div> : null}
          </div>
        </div>

        <div className="dashboardCard">
          <div className="dashboardCardTitle">My Tool Request History</div>
          <div className="dashboardStack">
            {mine.slice(0, 20).map((row) => (
              <div key={row.id} className="dashboardRowCard">
                <div className="dashboardItemMain">
                  <div className="dashboardItemName">{row.itemName}</div>
                  <div className="dashboardUsageMeta">
                    Qty {row.qty} • Status: {row.status.toUpperCase()} • Requested {fmt(row.ts)}
                    {row.decidedByName ? ` • By ${row.decidedByName}` : ""}
                  </div>
                </div>
                <Badge>{row.status.toUpperCase()}</Badge>
              </div>
            ))}
            {!mine.length ? <div className="dashboardMuted">No tool requests yet.</div> : null}
          </div>
        </div>
      </div>
    </div>
  );
}
