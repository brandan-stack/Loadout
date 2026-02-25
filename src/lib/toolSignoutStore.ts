import { currentUser, loadUsers } from "./authStore";

export type ToolRequestStatus = "pending" | "approved" | "rejected" | "returned";

export type ToolRequest = {
  id: string;
  ts: number;
  itemId: string;
  itemName: string;
  partNumber?: string;
  qty: number;
  note?: string;
  requestedByUserId: string;
  requestedByName: string;
  status: ToolRequestStatus;
  decisionAt?: number;
  decidedByUserId?: string;
  decidedByName?: string;
};

const KEY = "inventory.toolSignoutRequests.v1";

function newId() {
  return Math.random().toString(36).slice(2, 10) + "-" + Date.now().toString(36);
}

function loadRaw(): ToolRequest[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as ToolRequest[]) : [];
  } catch {
    return [];
  }
}

function saveRaw(rows: ToolRequest[]) {
  localStorage.setItem(KEY, JSON.stringify(rows.slice(0, 5000)));
}

export function loadToolRequests() {
  return loadRaw().sort((a, b) => b.ts - a.ts);
}

export function createToolRequest(input: {
  itemId: string;
  itemName: string;
  partNumber?: string;
  qty: number;
  note?: string;
}) {
  const me = currentUser();
  if (!me) throw new Error("No active user selected.");

  const qty = Math.floor(Number(input.qty || 0));
  if (!Number.isFinite(qty) || qty <= 0) {
    throw new Error("Quantity must be greater than zero.");
  }

  const request: ToolRequest = {
    id: newId(),
    ts: Date.now(),
    itemId: String(input.itemId || ""),
    itemName: String(input.itemName || "").trim(),
    partNumber: String(input.partNumber || "").trim(),
    qty,
    note: String(input.note || "").trim(),
    requestedByUserId: me.id,
    requestedByName: me.name,
    status: "pending",
  };

  if (!request.itemId || !request.itemName) {
    throw new Error("Tool item is required.");
  }

  const all = loadRaw();
  all.unshift(request);
  saveRaw(all);
  return request;
}

export function setToolRequestStatus(requestId: string, status: Exclude<ToolRequestStatus, "pending">) {
  const me = currentUser();
  const all = loadRaw();
  const next = all.map((row) => {
    if (row.id !== requestId) return row;
    if (row.status === "returned") return row;

    return {
      ...row,
      status,
      decisionAt: Date.now(),
      decidedByUserId: me?.id || "",
      decidedByName: me?.name || "",
    } satisfies ToolRequest;
  });
  saveRaw(next);
}

export function approveToolRequest(requestId: string) {
  setToolRequestStatus(requestId, "approved");
}

export function rejectToolRequest(requestId: string) {
  setToolRequestStatus(requestId, "rejected");
}

export function returnToolRequest(requestId: string) {
  setToolRequestStatus(requestId, "returned");
}

export function getPendingToolRequests() {
  return loadToolRequests().filter((row) => row.status === "pending");
}

export function getActiveToolSignouts() {
  return loadToolRequests().filter((row) => row.status === "approved");
}

export function getToolAlertsForUser(userId: string, isAdmin: boolean) {
  const all = loadToolRequests();
  if (isAdmin) {
    return all.filter((row) => row.status === "pending").length;
  }
  return all.filter((row) => row.status === "pending" && row.requestedByUserId === userId).length;
}

export function getUserName(userId: string) {
  return loadUsers().find((u) => u.id === userId)?.name ?? userId;
}
