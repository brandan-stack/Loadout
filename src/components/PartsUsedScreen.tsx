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
  savedAt?: number;
};

const DRAFT_KEY = "inventory.partsUsedDraft.v1";

type InlineToast = {
  tone: "success" | "warning" | "error";
  message: string;
};

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

  const draft = useMemo(() => loadDraft(), []);

  const [usage, setUsage] = useState<JobUsageLine[]>(() => loadJobUsage());
  const [jobNumber, setJobNumber] = useState(draft.jobNumber ?? "");
  const [useSearch, setUseSearch] = useState(draft.useSearch ?? "");
  const [useQty, setUseQty] = useState(draft.useQty ?? "1");
  const [useLoc, setUseLoc] = useState(draft.useLoc ?? "");
  const [useNote, setUseNote] = useState(draft.useNote ?? "");
  const [notifyUserId, setNotifyUserId] = useState(draft.notifyUserId ?? "");
  const [selectedItemId, setSelectedItemId] = useState(draft.selectedItemId ?? "");
  const [attemptedSubmit, setAttemptedSubmit] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<number | null>(draft.savedAt ?? null);
  const [toast, setToast] = useState<InlineToast | null>(null);

  const notifyUsers = loadUsers().filter((u) => u.isActive && u.receivesJobNotifications);
  const myNotifications = me ? getNotificationsForUser(me.id).slice(0, 10) : [];

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
  const hasPart = !!selectedItem;
  const canFinalizeLog = hasJobNumber && hasPart && validQty;
  const missingRequired: string[] = [
    ...(hasJobNumber ? [] : ["Job Number"]),
    ...(hasPart ? [] : ["Part"]),
    ...(validQty ? [] : ["Quantity"]),
  ];

  function saveProgress() {
    const savedAt = Date.now();
    saveDraft({ jobNumber, useSearch, useQty, useLoc, useNote, notifyUserId, selectedItemId, savedAt });
    setLastSavedAt(savedAt);
    setToast({ tone: "success", message: "Progress saved." });
  }

  function finalizeLogPartsUsed() {
    setAttemptedSubmit(true);
    if (!canFinalizeLog || !selectedItem) {
      setToast({ tone: "error", message: "Missing required fields. Enter Job Number, select Part, and enter valid Quantity." });
      return;
    }

    const qty = qtyNumber;
    const item = selectedItem;
    const jobNumberText = jobNumber.trim();

    itemsApi.adjustAtLocation(item.id, useLoc ?? "", -qty);

    const line = logJobUsage({
      job: PARTS_USED_JOB,
      item,
      qty,
      locationId: useLoc ?? "",
      note: useNote.trim() ? `Job #${jobNumberText} • ${useNote.trim()}` : `Job #${jobNumberText}`,
    });

    const targetUser = notifyUsers.find((u) => u.id === notifyUserId);
    if (targetUser) {
      addJobNotification({
        userId: targetUser.id,
        itemId: item.id,
        itemName: item.name,
        partNumber: item.partNumber,
        qty,
        note: line.note,
        title: "Parts used requires billing",
        message: `Job #${jobNumberText} • ${item.name}${item.partNumber ? ` (${item.partNumber})` : ""} qty ${qty} was used and requires billing.`,
      });
    }

    setUsage(loadJobUsage());
    setUseNote("");
    setSelectedItemId("");
    setAttemptedSubmit(false);
    onChanged?.();
    setToast({
      tone: targetUser ? "success" : "warning",
      message:
        `Job #${jobNumberText} • Parts Used logged: ${item.name}${item.partNumber ? ` (${item.partNumber})` : ""}, qty ${qty}. ` +
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
            <input className={attemptedSubmit && !validQty ? "inputInvalid" : ""} value={useQty} onChange={(e) => setUseQty(e.target.value)} inputMode="numeric" placeholder="Quantity (required)" />
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

          <div className={`dashboardItemsList ${attemptedSubmit && !hasPart ? "requiredBlockMissing" : ""}`}>
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
                <button className="btn" onClick={() => setSelectedItemId(it.id)}>
                  {selectedItemId === it.id ? "Selected" : "Select Part"}
                </button>
              </div>
            ))}
            {!filteredItems.length ? <div className="muted">No matching inventory items.</div> : null}
          </div>

          <div className="dashboardUseNote">
            <div className={`dashboardFinalStep ${attemptedSubmit && !canFinalizeLog ? "requiredBlockMissing" : ""}`}>
              <div className={`dashboardRequiredChecklist ${missingRequired.length ? "missing" : "valid"}`}>
                {missingRequired.length
                  ? `Required before final log: ${missingRequired.join(" • ")}`
                  : "All required fields valid. Ready to log parts."}
              </div>
              <div className="dashboardResultCount">
                Final Step: {hasPart ? `Part selected (${selectedItem?.name ?? "—"})` : "Select a part"} • {hasJobNumber ? `Job #${jobNumber.trim()}` : "Add Job Number"} • {validQty ? `Qty ${qtyNumber}` : "Enter valid quantity"}
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
                <div className="dashboardUsageTop">
                  <Badge>{fmt(u.ts)}</Badge>
                  <div className="dashboardStrong">{u.itemName}</div>
                  <Badge>Quantity: {u.qty}</Badge>
                </div>
                <div className="dashboardUsageMeta">
                  Part Number: {u.partNumber || "—"} {u.locationId ? `• Location: ${u.locationId}` : ""} {u.note ? `• Note: ${u.note}` : ""}
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
              className="btn"
              disabled={!me || myNotifications.length === 0}
              onClick={() => {
                if (!me) return;
                markAllJobNotificationsReadForUser(me.id);
                onChanged?.();
                bump();
              }}
            >
              Mark all read
            </button>
          </div>
          <div className="dashboardStack">
            {myNotifications.map((n) => (
              <div key={n.id} className="dashboardRowCard">
                <div className="dashboardUsageTop">
                  <Badge>{fmt(n.ts)}</Badge>
                  <span className="pill pillRed">⚠ Billing Required</span>
                  {!n.read ? <Badge>Unread</Badge> : <Badge>Read</Badge>}
                </div>
                <div className="dashboardUsageMeta">{n.message}</div>
                {!n.read ? (
                  <button
                    className="btn"
                    onClick={() => {
                      markJobNotificationRead(n.id);
                      onChanged?.();
                      bump();
                    }}
                  >
                    Mark read
                  </button>
                ) : null}
              </div>
            ))}
            {myNotifications.length === 0 ? <div className="dashboardMuted">No notifications for this user.</div> : null}
          </div>
        </div>
        ) : null}
      </div>
    </div>
  );
}
