import { useEffect, useMemo, useReducer, useState } from "react";
import { useItems, type InventoryItem } from "../hooks/useItems";
import { useCategories } from "../hooks/useCategories";
import { useLocations } from "../hooks/useLocations";
import { loadJobUsage, logJobUsage, type Job, type JobUsageLine } from "../lib/jobsStore";
import { canAccessPartsUsed, currentUser, loadUsers } from "../lib/authStore";
import {
  addJobNotification,
  getNotificationsForUser,
  markAllJobNotificationsReadForUser,
  markJobNotificationUnread,
  markJobNotificationsUnread,
  markJobNotificationRead,
} from "../lib/jobNotificationsStore";

function totalQty(item: InventoryItem) {
  return (item.stockByLocation ?? []).reduce((sum, row) => sum + (row.quantity ?? 0), 0);
}

function fmt(ts: number) {
  try {
    return new Date(ts).toLocaleString();
  } catch {
    return String(ts);
  }
}

function money(n?: number) {
  if (typeof n !== "number" || !Number.isFinite(n)) return "—";
  return new Intl.NumberFormat(undefined, { style: "currency", currency: "USD" }).format(n);
}

const PARTS_USED_JOB: Job = {
  id: "parts-used",
  name: "Parts Used",
  customer: "",
  po: "",
  createdAt: 0,
  status: "open",
  notes: "",
};

type PartsUsedDraft = {
  jobNumber?: string;
  useSearch?: string;
  useQty?: string;
  useLoc?: string;
  useNote?: string;
  notifyUserId?: string;
  selectedItemId?: string;
  queuedLines?: Array<{ itemId: string; qty: number }>;
  savedAt?: number;
};

const DRAFT_KEY = "inventory.partsUsedDraft.v1";

type InlineToast = {
  tone: "success" | "warning" | "error";
  message: string;
};

type QueuedPartLine = {
  id: string;
  itemId: string;
  qty: number;
};

function draftLineId() {
  return Math.random().toString(36).slice(2, 10) + "-" + Date.now().toString(36);
}

function loadDraft(): PartsUsedDraft {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as PartsUsedDraft;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function saveDraft(draft: PartsUsedDraft) {
  localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
}

function Badge({ children }: { children: React.ReactNode }) {
  return <span className="dashboardBadge">{children}</span>;
}

export default function PartsUsedScreen({ onChanged }: { onChanged?: () => void }) {
  const itemsApi = useItems();
  const cats = useCategories();
  const { roots } = useLocations();
  const me = currentUser();
  const [, bump] = useReducer((value: number) => value + 1, 0);
  const canUsePartsEntry = canAccessPartsUsed(me);
  const canViewNotifications = !!me && (me.role === "admin" || !!me.receivesJobNotifications);
  const useCompactPartPicker = me?.role !== "invoicing";

  const draft = useMemo(() => loadDraft(), []);

  const [usage, setUsage] = useState<JobUsageLine[]>(() => loadJobUsage());
  const [jobNumber, setJobNumber] = useState(draft.jobNumber ?? "");
  const [useSearch, setUseSearch] = useState(draft.useSearch ?? "");
  const [useQty, setUseQty] = useState(draft.useQty ?? "1");
  const [useLoc, setUseLoc] = useState(draft.useLoc ?? "");
  const [useNote, setUseNote] = useState(draft.useNote ?? "");
  const [notifyUserId, setNotifyUserId] = useState(draft.notifyUserId ?? "");
  const [selectedItemId, setSelectedItemId] = useState(draft.selectedItemId ?? "");
  const [queuedLines, setQueuedLines] = useState<QueuedPartLine[]>(() =>
    (draft.queuedLines ?? [])
      .map((line) => ({
        id: draftLineId(),
        itemId: String(line.itemId ?? ""),
        qty: Math.floor(Number(line.qty ?? 0)),
      }))
      .filter((line) => !!line.itemId && Number.isFinite(line.qty) && line.qty > 0)
  );
  const [attemptedAdd, setAttemptedAdd] = useState(false);
  const [attemptedSubmit, setAttemptedSubmit] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<number | null>(draft.savedAt ?? null);
  const [toast, setToast] = useState<InlineToast | null>(null);
  const [lastReadNotificationIds, setLastReadNotificationIds] = useState<string[]>([]);
  const [notificationView, setNotificationView] = useState<"unread" | "read">("unread");

  const notifyUsers = useMemo(
    () =>
      loadUsers()
        .filter((u) => u.isActive && u.receivesJobNotifications)
        .sort((a, b) => a.name.localeCompare(b.name)),
    []
  );
  const myNotifications = me ? getNotificationsForUser(me.id).slice(0, 30) : [];
  const myUnreadNotifications = myNotifications.filter((n) => !n.read).slice(0, 10);
  const myReadNotifications = myNotifications.filter((n) => n.read).slice(0, 20);
  const myVisibleNotifications = notificationView === "unread" ? myUnreadNotifications : myReadNotifications;

  const visibleJobTotals = useMemo(() => {
    const byJob = new Map<string, { total: number; lines: number }>();
    for (const n of myVisibleNotifications) {
      const key = (n.jobNumber || "").trim();
      if (!key) continue;
      const entry = byJob.get(key) ?? { total: 0, lines: 0 };
      entry.lines += 1;
      if (typeof n.lineCost === "number" && Number.isFinite(n.lineCost)) {
        entry.total += n.lineCost;
      }
      byJob.set(key, entry);
    }
    return Array.from(byJob.entries())
      .map(([jobNumber, data]) => ({ jobNumber, ...data }))
      .filter((row) => row.lines > 1)
      .sort((a, b) => b.total - a.total);
  }, [myVisibleNotifications]);

  useEffect(() => {
    if (!toast) return;
    const id = window.setTimeout(() => setToast(null), 3200);
    return () => window.clearTimeout(id);
  }, [toast]);

  function categoryLabel(it: InventoryItem) {
    const catName = cats.getCategoryName(it.categoryId);
    const subName = it.subcategoryId ? cats.getSubName(it.categoryId, it.subcategoryId) : "";
    return subName ? `${catName} › ${subName}` : catName;
  }

  function locationLabel(locationId?: string) {
    if (!locationId) return "Missing Location";
    return roots.find((l) => l.id === locationId)?.name ?? locationId;
  }

  const filteredItems = useMemo(() => {
    const q = useSearch.trim().toLowerCase();
    if (!q) return itemsApi.items.slice(0, 20);
    return itemsApi.items
      .filter((it) => {
        const hay = [
          it.name,
          it.partNumber,
          `part number ${it.partNumber ?? ""}`,
          `pn ${it.partNumber ?? ""}`,
          it.manufacturer,
          `manufacturer ${it.manufacturer ?? ""}`,
          `brand ${it.manufacturer ?? ""}`,
          it.model,
          `model number ${it.model ?? ""}`,
          it.serial,
          `serial number ${it.serial ?? ""}`,
          `sn ${it.serial ?? ""}`,
          it.description,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        return hay.includes(q);
      })
      .slice(0, 20);
  }, [itemsApi.items, useSearch]);

  const selectedItem = useMemo(
    () => itemsApi.items.find((it) => it.id === selectedItemId) ?? null,
    [itemsApi.items, selectedItemId]
  );

  const qtyNumber = Math.floor(Number(useQty));
  const validQty = Number.isFinite(qtyNumber) && qtyNumber > 0;
  const hasJobNumber = jobNumber.trim().length > 0;
  const hasQueuedParts = queuedLines.length > 0;
  const hasValidQueuedLines = hasQueuedParts && queuedLines.every((line) => line.qty > 0 && !!itemsApi.items.find((it) => it.id === line.itemId));
  const hasCostForQueuedLines =
    hasQueuedParts &&
    queuedLines.every((line) => {
      const item = itemsApi.items.find((it) => it.id === line.itemId);
      return !!item && typeof item.unitPrice === "number" && Number.isFinite(item.unitPrice);
    });
  const canFinalizeLog = hasJobNumber && hasValidQueuedLines && hasCostForQueuedLines;
  const missingRequired: string[] = [
    ...(hasJobNumber ? [] : ["Job Number"]),
    ...(hasQueuedParts ? [] : ["Part + Quantity"]),
    ...(hasValidQueuedLines ? [] : ["Valid quantities"]),
    ...(hasCostForQueuedLines ? [] : ["Unit Cost for each queued part"]),
  ];

  const totalQueuedQty = queuedLines.reduce((sum, line) => sum + line.qty, 0);

  function qtyForItem(itemId: string) {
    if (selectedItemId === itemId) return useQty;
    return "1";
  }

  function addSelectedToQueue() {
    setAttemptedAdd(true);
    if (!selectedItem || !validQty) {
      setToast({ tone: "error", message: "Select a part and enter a valid quantity before adding." });
      return;
    }

    const item = selectedItem;
    const qty = qtyNumber;

    setQueuedLines((prev) => {
      const existing = prev.find((line) => line.itemId === item.id);
      if (existing) {
        return prev.map((line) => (line.id === existing.id ? { ...line, qty: line.qty + qty } : line));
      }
      return [...prev, { id: draftLineId(), itemId: item.id, qty }];
    });

    setUseQty("1");
    setAttemptedAdd(false);
    setToast({
      tone: "success",
      message: `Added ${item.name}${item.partNumber ? ` (${item.partNumber})` : ""} qty ${qty} to this job log.`,
    });
  }

  function removeQueuedLine(lineId: string) {
    setQueuedLines((prev) => prev.filter((line) => line.id !== lineId));
  }

  function updateQueuedQty(lineId: string, value: string) {
    const qty = Math.floor(Number(value));
    setQueuedLines((prev) =>
      prev.map((line) => (line.id === lineId ? { ...line, qty: Number.isFinite(qty) ? qty : 0 } : line))
    );
  }

  function saveProgress() {
    const savedAt = Date.now();
    saveDraft({
      jobNumber,
      useSearch,
      useQty,
      useLoc,
      useNote,
      notifyUserId,
      selectedItemId,
      queuedLines: queuedLines.map((line) => ({ itemId: line.itemId, qty: line.qty })),
      savedAt,
    });
    setLastSavedAt(savedAt);
    setToast({ tone: "success", message: "Progress saved." });
  }

  function finalizeLogPartsUsed() {
    setAttemptedSubmit(true);
    if (!canFinalizeLog) {
      setToast({ tone: "error", message: "Missing required fields. Enter Job Number and ensure every queued part has a unit cost and valid quantity." });
      return;
    }

    const jobNumberText = jobNumber.trim();
    const validLines = queuedLines
      .map((line) => {
        const item = itemsApi.items.find((it) => it.id === line.itemId) ?? null;
        if (!item || line.qty <= 0) return null;
        return { line, item };
      })
      .filter(Boolean) as Array<{ line: QueuedPartLine; item: InventoryItem }>;

    if (!validLines.length) {
      setToast({ tone: "error", message: "No valid parts queued. Add at least one part with quantity greater than zero." });
      return;
    }

    let totalLoggedQty = 0;
    const loggedItemNames: string[] = [];
    for (const entry of validLines) {
      const qty = entry.line.qty;
      const item = entry.item;

      itemsApi.adjustAtLocation(item.id, useLoc ?? "", -qty);

      logJobUsage({
        job: PARTS_USED_JOB,
        jobNumber: jobNumberText,
        item,
        qty,
        locationId: useLoc ?? "",
        note: useNote.trim() ? `Job #${jobNumberText} • ${useNote.trim()}` : `Job #${jobNumberText}`,
        submittedByUserId: me?.id || "",
        submittedByName: me?.name || "",
      });

      totalLoggedQty += qty;
      loggedItemNames.push(item.name + (item.partNumber ? ` (${item.partNumber})` : ""));
    }

    const targetUser = notifyUsers.find((u) => u.id === notifyUserId);
    if (targetUser) {
      for (const entry of validLines) {
        const item = entry.item;
        const qty = entry.line.qty;
        const unitPrice = typeof item.unitPrice === "number" ? item.unitPrice : undefined;
        const marginPercent = typeof item.marginPercent === "number" ? item.marginPercent : undefined;
        const estimatedSellPrice =
          typeof unitPrice === "number" && typeof marginPercent === "number"
            ? unitPrice * (1 + marginPercent / 100)
            : undefined;
        const lineCost = typeof unitPrice === "number" ? unitPrice * qty : undefined;
        const lineEstimatedSell = typeof estimatedSellPrice === "number" ? estimatedSellPrice * qty : undefined;

        addJobNotification({
          userId: targetUser.id,
          jobNumber: jobNumberText,
          itemId: item.id,
          itemName: item.name,
          partNumber: item.partNumber || "",
          qty,
          note: useNote.trim() ? `Job #${jobNumberText} • ${useNote.trim()}` : `Job #${jobNumberText}`,
          locationId: useLoc ?? "",
          submittedByUserId: me?.id || "",
          submittedByName: me?.name || "",
          unitPrice,
          marginPercent,
          estimatedSellPrice,
          lineCost,
          lineEstimatedSell,
          photoDataUrl: item.photoDataUrl || "",
          manufacturer: item.manufacturer || "",
          model: item.model || "",
          serial: item.serial || "",
          description: item.description || "",
          title: "Parts used requires billing",
          message:
            `Job #${jobNumberText} • ${item.name}${item.partNumber ? ` (${item.partNumber})` : ""} qty ${qty} was used and requires billing.` +
            (typeof lineCost === "number" ? ` Line Cost ${money(lineCost)}.` : ""),
        });
      }
    }

    setUsage(loadJobUsage());
    setUseNote("");
    setSelectedItemId("");
    setQueuedLines([]);
    setUseQty("1");
    saveDraft({});
    setAttemptedSubmit(false);
    onChanged?.();
    setToast({
      tone: targetUser ? "success" : "warning",
      message:
        `Job #${jobNumberText} • Logged ${validLines.length} part line${validLines.length === 1 ? "" : "s"} with total qty ${totalLoggedQty}. ` +
        (targetUser ? `Notified ${targetUser.name}.` : "No notification recipient selected."),
    });
  }

  if (!canUsePartsEntry && !canViewNotifications) {
    return (
      <div className="page dashboardPage">
        <div className="dashboardHeader">
          <div>
            <h2 className="dashboardTitle">Parts Used</h2>
            <div className="dashboardSubtitle">Access is blocked for this user. Ask Admin to enable Parts Used or Job Notifications.</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page dashboardPage">
      <div className="dashboardHeader">
        <div>
          <h2 className="dashboardTitle">Parts Used</h2>
          <div className="dashboardSubtitle">Track parts usage and notify billing users.</div>
        </div>
      </div>

      {toast ? (
        <div className={`bannerWarning partsToast partsToast--${toast.tone}`} role="status" aria-live="polite">
          {toast.message}
        </div>
      ) : null}

      {canUsePartsEntry ? (
      <div className="dashboardCard dashboardGapTop">
        <div className="dashboardCardTitle">Parts Used Entry</div>

        <div className="dashboardJobActions">
          <button className="btn" onClick={saveProgress}>Save Progress</button>
        </div>

        {lastSavedAt ? <div className="dashboardResultCount">Last saved: {fmt(lastSavedAt)}</div> : null}

        <div className="dashboardUsePanel">
          <div className="dashboardSectionTitle">Use parts</div>

          <div className="dashboardUseNote">
            <input
              className={attemptedSubmit && !hasJobNumber ? "inputInvalid" : ""}
              value={jobNumber}
              onChange={(e) => setJobNumber(e.target.value)}
              placeholder="Job Number (required)"
            />
          </div>

          <div className="dashboardUseGrid">
            <div>
              <input value={useSearch} onChange={(e) => setUseSearch(e.target.value)} placeholder="Search item (Part Number, Brand, Model Number, Serial Number, Description…)" />
              <div className="searchHints" aria-hidden="true">
                <span className="searchHint">Part Number</span>
                <span className="searchHint">Brand</span>
                <span className="searchHint">Model Number</span>
                <span className="searchHint">Serial Number</span>
              </div>
            </div>
            {useCompactPartPicker ? (
              <div className="dashboardItemMeta">Select a part and enter quantity beside the Select button.</div>
            ) : (
              <input className={attemptedAdd && !validQty ? "inputInvalid" : ""} value={useQty} onChange={(e) => setUseQty(e.target.value)} inputMode="numeric" placeholder="Quantity for selected part" />
            )}
            <select value={useLoc} onChange={(e) => setUseLoc(e.target.value)}>
              <option value="">Missing Location</option>
              {roots.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
            </select>
          </div>

          <div className="dashboardUseNote">
            <input value={useNote} onChange={(e) => setUseNote(e.target.value)} placeholder="Note (optional)" />
          </div>

          <div className="dashboardUseNote">
            <select value={notifyUserId} onChange={(e) => setNotifyUserId(e.target.value)}>
              <option value="">No notification recipient selected</option>
              {notifyUsers.map((u) => (
                <option key={u.id} value={u.id}>{u.name}</option>
              ))}
            </select>
          </div>

          <div className="dashboardResultCount">Matching items: {filteredItems.length}</div>

          <div className={`dashboardItemsList ${attemptedAdd && !selectedItem ? "requiredBlockMissing" : ""}`}>
            {filteredItems.map((it) => (
              <div key={it.id} className={`dashboardItemRow ${selectedItemId === it.id ? "dashboardItemRowSelected" : ""}`}>
                <div className="dashboardItemMain">
                  <div className="dashboardItemName">{it.name}</div>
                  <div className="dashboardItemMeta">{categoryLabel(it)} • Part Number: {it.partNumber || "—"}</div>
                  <div className="dashboardPills">
                    <Badge>Total Quantity: {totalQty(it)}</Badge>
                    <Badge>Low: {it.lowStock ?? "—"}</Badge>
                  </div>
                </div>
                <div className={useCompactPartPicker ? "dashboardInlinePick" : undefined}>
                  {useCompactPartPicker ? (
                    <input
                      className={attemptedAdd && selectedItemId === it.id && !validQty ? "inputInvalid dashboardQueueQty" : "dashboardQueueQty"}
                      value={qtyForItem(it.id)}
                      onChange={(e) => {
                        const nextQty = e.target.value;
                        setSelectedItemId(it.id);
                        setUseQty(nextQty);
                      }}
                      inputMode="numeric"
                      aria-label={`Quantity for ${it.name}`}
                    />
                  ) : null}
                  <button
                    className="btn"
                    onClick={() => {
                      setSelectedItemId(it.id);
                      if (useCompactPartPicker) {
                        setUseQty(qtyForItem(it.id));
                      }
                    }}
                  >
                    {selectedItemId === it.id ? "Selected" : "Select Part"}
                  </button>
                </div>
              </div>
            ))}
            {!filteredItems.length ? <div className="muted">No matching inventory items.</div> : null}
          </div>

          <div className="dashboardJobActions">
            <button className="btn" type="button" onClick={addSelectedToQueue}>
              Add Selected Part + Quantity
            </button>
          </div>

          <div className={`dashboardStack ${attemptedSubmit && !hasValidQueuedLines ? "requiredBlockMissing" : ""}`}>
            <div className="dashboardSectionTitle">Parts queued for final log</div>
            {queuedLines.map((line) => {
              const item = itemsApi.items.find((it) => it.id === line.itemId);
              if (!item) return null;
              return (
                <div key={line.id} className="dashboardQueueRow">
                  <div className="dashboardItemMain">
                    <div className="dashboardItemName">{item.name}</div>
                    <div className="dashboardItemMeta">Part Number: {item.partNumber || "—"}</div>
                  </div>
                  <input
                    className={attemptedSubmit && line.qty <= 0 ? "inputInvalid dashboardQueueQty" : "dashboardQueueQty"}
                    value={String(line.qty)}
                    onChange={(e) => updateQueuedQty(line.id, e.target.value)}
                    inputMode="numeric"
                    aria-label={`Quantity for ${item.name}`}
                  />
                  <button className="btn" type="button" onClick={() => removeQueuedLine(line.id)}>
                    Remove
                  </button>
                </div>
              );
            })}
            {!queuedLines.length ? <div className="dashboardMuted">No parts queued yet. Select part, set quantity, then add.</div> : null}
            <div className="dashboardResultCount">Queued lines: {queuedLines.length} • Total quantity: {totalQueuedQty}</div>
          </div>

          <div className="dashboardUseNote">
            <div className={`dashboardFinalStep ${attemptedSubmit && !canFinalizeLog ? "requiredBlockMissing" : ""}`}>
              <div className={`dashboardRequiredChecklist ${missingRequired.length ? "missing" : "valid"}`}>
                {missingRequired.length
                  ? `Required before final log: ${missingRequired.join(" • ")}`
                  : "All required fields valid. Ready to log parts."}
              </div>
              <div className="dashboardResultCount">
                Final Step: {hasQueuedParts ? `${queuedLines.length} part line${queuedLines.length === 1 ? "" : "s"} queued` : "Add part lines"} • {hasJobNumber ? `Job #${jobNumber.trim()}` : "Add Job Number"} • {hasValidQueuedLines ? `Total qty ${totalQueuedQty}` : "Fix invalid quantities"}
              </div>
              <button className="btn primary" type="button" disabled={!canFinalizeLog} onClick={finalizeLogPartsUsed}>
                Log Parts Used (Final Step)
              </button>
            </div>
          </div>
        </div>
      </div>
      ) : null}

      <div className="dashboardMain dashboardGapTop">
        {canUsePartsEntry ? (
        <div className="dashboardCard" id="recent-parts-used">
          <div className="dashboardSectionTitle">Recent Parts Used</div>
          <div className="dashboardStack">
            {usage.slice(0, 12).map((u) => (
              <div key={u.id} className="dashboardRowCard">
                <div className="dashboardItemMain">
                  <div className="dashboardUsageTop">
                    <Badge>{fmt(u.ts)}</Badge>
                    <div className="dashboardStrong">{u.itemName}</div>
                    <Badge>Quantity: {u.qty}</Badge>
                  </div>
                  <div className="dashboardUsageMeta">
                    Part Number: {u.partNumber || "—"} • Location: {locationLabel(u.locationId)} • Submitted By: {u.submittedByName || "—"}
                  </div>
                  <div className="dashboardUsageMeta">
                    Unit Cost: {money(u.unitPrice)} • Line Cost: {money(u.lineCost)} • Margin: {typeof u.marginPercent === "number" ? `${u.marginPercent}%` : "—"} • Est. Sell: {money(u.lineEstimatedSell)}
                  </div>
                  <div className="dashboardUsageMeta">
                    Manufacturer: {u.manufacturer || "—"} • Model: {u.model || "—"} • Serial: {u.serial || "—"}
                    {u.note ? ` • Note: ${u.note}` : ""}
                  </div>
                </div>
                <div className="dashboardUsageThumbWrap">
                  {u.photoDataUrl ? (
                    <img className="dashboardUsageThumb" src={u.photoDataUrl} alt={`${u.itemName} photo`} />
                  ) : (
                    <div className="dashboardUsageThumb dashboardUsageThumbPlaceholder" aria-hidden="true" />
                  )}
                </div>
              </div>
            ))}
            {usage.length === 0 ? <div className="dashboardMuted">No Parts Used logged yet.</div> : null}
          </div>
        </div>
        ) : null}

        {canViewNotifications ? (
        <div className="dashboardCard" id={!canUsePartsEntry ? "recent-parts-used" : undefined}>
          <div className="dashboardCardTitle">My Billing Notifications</div>
          <div className="dashboardJobActions">
            <button
              className={"btn " + (notificationView === "unread" ? "primary" : "")}
              type="button"
              onClick={() => setNotificationView("unread")}
            >
              Unread ({myUnreadNotifications.length})
            </button>
            <button
              className={"btn " + (notificationView === "read" ? "primary" : "")}
              type="button"
              onClick={() => setNotificationView("read")}
            >
              Read ({myReadNotifications.length})
            </button>
            <button
              className="btn"
              disabled={!me || notificationView !== "unread" || myUnreadNotifications.length === 0}
              onClick={() => {
                if (!me) return;
                setLastReadNotificationIds(myUnreadNotifications.map((n) => n.id));
                markAllJobNotificationsReadForUser(me.id);
                onChanged?.();
                bump();
              }}
            >
              Mark all read
            </button>
            <button
              className="btn"
              disabled={lastReadNotificationIds.length === 0}
              onClick={() => {
                if (!lastReadNotificationIds.length) return;
                markJobNotificationsUnread(lastReadNotificationIds);
                setLastReadNotificationIds([]);
                onChanged?.();
                bump();
              }}
            >
              Undo
            </button>
          </div>

          {visibleJobTotals.length > 0 ? (
            <div className="dashboardStack">
              <div className="dashboardSectionTitle">Total Cost by Job Number (multiple items)</div>
              {visibleJobTotals.map((row) => (
                <div key={row.jobNumber} className="dashboardRowCard">
                  <div className="dashboardItemMain">
                    <div className="dashboardUsageTop">
                      <Badge>Job #{row.jobNumber}</Badge>
                      <Badge>Items: {row.lines}</Badge>
                    </div>
                  </div>
                  <div className="dashboardStrong">{money(row.total)}</div>
                </div>
              ))}
            </div>
          ) : null}

          <div className="dashboardStack">
            {myVisibleNotifications.map((n) => (
              <div key={n.id} className="dashboardRowCard">
                <div className="dashboardItemMain">
                  <div className="dashboardUsageTop">
                    <Badge>{fmt(n.ts)}</Badge>
                    <span className="pill pillRed">⚠ Billing Required</span>
                    <Badge>{n.read ? "Read" : "Unread"}</Badge>
                  </div>
                  <div className="dashboardUsageMeta">{n.message}</div>
                  <div className="dashboardUsageMeta">
                    Job Number: {n.jobNumber || "—"} • Part Number: {n.partNumber || "—"} • Qty: {n.qty} • Location: {locationLabel(n.locationId)} • Submitted By: {n.submittedByName || "—"}
                  </div>
                  <div className="dashboardUsageMeta">
                    Unit Cost: {money(n.unitPrice)} • Line Cost: {money(n.lineCost)} • Margin: {typeof n.marginPercent === "number" ? `${n.marginPercent}%` : "—"} • Est. Sell: {money(n.lineEstimatedSell)}
                  </div>
                  <div className="dashboardUsageMeta">
                    Manufacturer: {n.manufacturer || "—"} • Model: {n.model || "—"} • Serial: {n.serial || "—"}
                    {n.note ? ` • Note: ${n.note}` : ""}
                  </div>
                </div>
                <div className="dashboardUsageThumbWrap">
                  {n.photoDataUrl ? (
                    <img className="dashboardUsageThumb" src={n.photoDataUrl} alt={`${n.itemName} photo`} />
                  ) : (
                    <div className="dashboardUsageThumb dashboardUsageThumbPlaceholder" aria-hidden="true" />
                  )}
                </div>
                <button
                  className="btn"
                  onClick={() => {
                    if (n.read) {
                      markJobNotificationUnread(n.id);
                      setLastReadNotificationIds([]);
                    } else {
                      markJobNotificationRead(n.id);
                      setLastReadNotificationIds([n.id]);
                    }
                    onChanged?.();
                    bump();
                  }}
                >
                  {n.read ? "Mark as unread" : "Mark as read"}
                </button>
              </div>
            ))}
            {myVisibleNotifications.length === 0 ? (
              <div className="dashboardMuted">
                {notificationView === "unread" ? "No unread notifications for this user." : "No read notifications for this user."}
              </div>
            ) : null}
          </div>
        </div>
        ) : null}
      </div>
    </div>
  );
}
