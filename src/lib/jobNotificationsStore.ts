export type JobNotification = {
  id: string;
  ts: number;
  userId: string;
  itemId: string;
  itemName: string;
  partNumber?: string;
  qty: number;
  note?: string;
  title: string;
  message: string;
  read: boolean;
};

const KEY = "inventory.jobNotifications.v1";

function newId() {
  return Math.random().toString(36).slice(2, 10) + "-" + Date.now().toString(36);
}

function loadRaw(): JobNotification[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as JobNotification[]) : [];
  } catch {
    return [];
  }
}

function saveRaw(notifications: JobNotification[]) {
  localStorage.setItem(KEY, JSON.stringify(notifications));
}

export function loadJobNotifications() {
  return loadRaw();
}

export function getNotificationsForUser(userId: string) {
  return loadRaw().filter((n) => n.userId === userId).sort((a, b) => b.ts - a.ts);
}

export function getUnreadCountForUser(userId: string) {
  return getNotificationsForUser(userId).filter((n) => !n.read).length;
}

export function addJobNotification(input: {
  userId: string;
  itemId: string;
  itemName: string;
  partNumber?: string;
  qty: number;
  note?: string;
  title?: string;
  message?: string;
}) {
  const n: JobNotification = {
    id: newId(),
    ts: Date.now(),
    userId: input.userId,
    itemId: input.itemId,
    itemName: input.itemName,
    partNumber: input.partNumber || "",
    qty: Math.floor(Number(input.qty) || 0),
    note: input.note || "",
    title: input.title || "Parts Used requires billing",
    message:
      input.message ||
      `${input.itemName} (${input.partNumber || "No Part Number"}) qty ${Math.floor(Number(input.qty) || 0)} was used and requires billing.`,
    read: false,
  };

  const prev = loadRaw();
  prev.unshift(n);
  saveRaw(prev.slice(0, 2000));
  return n;
}

export function markJobNotificationRead(notificationId: string) {
  const next = loadRaw().map((n) => (n.id === notificationId ? { ...n, read: true } : n));
  saveRaw(next);
}

export function markAllJobNotificationsReadForUser(userId: string) {
  const next = loadRaw().map((n) => (n.userId === userId ? { ...n, read: true } : n));
  saveRaw(next);
}
