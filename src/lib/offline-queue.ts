export type OfflineQueueScope = "inventory" | "jobs" | "tools" | "settings" | "general";
export type OfflineQueueStatus = "queued" | "syncing" | "failed" | "conflict";

export interface OfflineQueueEntry {
  id: string;
  url: string;
  method: string;
  scope: OfflineQueueScope;
  queuedAt: string;
  headers?: Record<string, string>;
  body?: unknown;
  status: OfflineQueueStatus;
  lastError?: string;
}

export interface OfflineQueueSummary {
  total: number;
  queued: number;
  syncing: number;
  failed: number;
  conflict: number;
}

const STORAGE_KEY = "loadout:offline-queue";
const EVENT_NAME = "loadout:offline-queue-change";

function isBrowser() {
  return typeof window !== "undefined";
}

function createId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function readQueue(): OfflineQueueEntry[] {
  if (!isBrowser()) {
    return [];
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeQueue(entries: OfflineQueueEntry[]) {
  if (!isBrowser()) {
    return;
  }

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  window.dispatchEvent(new CustomEvent(EVENT_NAME));
}

export function getOfflineQueueEntries() {
  return readQueue();
}

export function getOfflineQueueSummary(): OfflineQueueSummary {
  const entries = readQueue();
  return {
    total: entries.length,
    queued: entries.filter((entry) => entry.status === "queued").length,
    syncing: entries.filter((entry) => entry.status === "syncing").length,
    failed: entries.filter((entry) => entry.status === "failed").length,
    conflict: entries.filter((entry) => entry.status === "conflict").length,
  };
}

export function subscribeToOfflineQueue(listener: () => void) {
  if (!isBrowser()) {
    return () => undefined;
  }

  window.addEventListener(EVENT_NAME, listener);
  return () => window.removeEventListener(EVENT_NAME, listener);
}

export function clearOfflineQueue() {
  writeQueue([]);
}

export function createOfflineMutationPayload<T extends Record<string, unknown>>(body: T) {
  return {
    ...body,
    clientRequestId: createId(),
    submittedOfflineAt: new Date().toISOString(),
  };
}

export function queueOfflineMutation(input: Omit<OfflineQueueEntry, "id" | "queuedAt" | "status">) {
  const entry: OfflineQueueEntry = {
    id: createId(),
    queuedAt: new Date().toISOString(),
    status: "queued",
    ...input,
  };

  writeQueue([...readQueue(), entry]);
  return entry;
}

export async function runMutationWithOfflineSupport(input: {
  url: string;
  method: string;
  scope: OfflineQueueScope;
  body?: unknown;
  headers?: Record<string, string>;
}) {
  const headers = input.headers ?? { "Content-Type": "application/json" };

  if (isBrowser() && !window.navigator.onLine) {
    const entry = queueOfflineMutation({
      url: input.url,
      method: input.method,
      scope: input.scope,
      headers,
      body: input.body,
    });

    return { queued: true, entry };
  }

  const response = await fetch(input.url, {
    method: input.method,
    headers,
    body: input.body === undefined ? undefined : JSON.stringify(input.body),
  });

  return { queued: false, response };
}

export async function flushOfflineQueue() {
  if (!isBrowser() || !window.navigator.onLine) {
    return getOfflineQueueSummary();
  }

  let entries = readQueue();

  for (const entry of entries) {
    if (entry.status === "conflict") {
      continue;
    }

    entries = entries.map((current) =>
      current.id === entry.id ? { ...current, status: "syncing", lastError: undefined } : current
    );
    writeQueue(entries);

    try {
      const response = await fetch(entry.url, {
        method: entry.method,
        headers: entry.headers,
        body: entry.body === undefined ? undefined : JSON.stringify(entry.body),
      });

      if (response.ok) {
        entries = readQueue().filter((current) => current.id !== entry.id);
        writeQueue(entries);
        continue;
      }

      const payload = await response.json().catch(() => null);
      const message = payload?.error || `Request failed (${response.status})`;
      const nextStatus: OfflineQueueStatus = response.status === 409 ? "conflict" : "failed";
      entries = readQueue().map((current) =>
        current.id === entry.id ? { ...current, status: nextStatus, lastError: message } : current
      );
      writeQueue(entries);
    } catch (error) {
      entries = readQueue().map((current) =>
        current.id === entry.id
          ? {
              ...current,
              status: "failed",
              lastError: error instanceof Error ? error.message : "Sync failed",
            }
          : current
      );
      writeQueue(entries);
    }
  }

  return getOfflineQueueSummary();
}
