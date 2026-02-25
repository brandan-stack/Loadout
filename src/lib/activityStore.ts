export type ActivityType =
  | "ADD_ITEM"
  | "EDIT_ITEM"
  | "DELETE_ITEM"
  | "RECEIVE"
  | "TAKE_OUT"
  | "MOVE"
  | "CATEGORY_CHANGE"
  | "PHOTO_CHANGE";

export type ActivityEvent = {
  id: string;
  ts: number; // Date.now()
  type: ActivityType;
  itemId?: string;
  itemName?: string;

  // stock info
  locationId?: string;      // for RECEIVE/TAKE_OUT
  fromLocationId?: string;  // for MOVE
  toLocationId?: string;    // for MOVE
  qty?: number;

  // metadata
  note?: string;
  meta?: Record<string, unknown>;
};

const KEY = "inventory.activity.v1";
const MAX = 500; // keep it snappy

function newId() {
  return Math.random().toString(36).slice(2, 10) + "-" + Date.now().toString(36);
}

export function loadActivity(): ActivityEvent[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveActivity(events: ActivityEvent[]) {
  localStorage.setItem(KEY, JSON.stringify(events.slice(-MAX)));
}

export function logActivity(event: Omit<ActivityEvent, "id" | "ts">) {
  const events = loadActivity();
  events.push({ id: newId(), ts: Date.now(), ...event });
  saveActivity(events);
}

export function clearActivity() {
  localStorage.removeItem(KEY);
}