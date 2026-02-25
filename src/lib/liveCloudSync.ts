import { createClient } from "@supabase/supabase-js";

const EVENT_NAME = "loadout:state-updated";
const STATUS_EVENT_NAME = "loadout:sync-status";
const SYNC_NOW_EVENT_NAME = "loadout:sync-now";
const DEVICE_ID_KEY = "loadout.syncDeviceId.v1";
const LAST_SYNC_TS_KEY = "loadout.syncLastTimestamp.v1";
const STATUS_KEY = "loadout.syncStatus.v1";

const SYNC_URL_RAW = import.meta.env.VITE_SYNC_SUPABASE_URL as string | undefined;
const SYNC_ANON_KEY_RAW = import.meta.env.VITE_SYNC_SUPABASE_ANON_KEY as string | undefined;
const SYNC_TABLE = (import.meta.env.VITE_SYNC_TABLE as string | undefined) || "loadout_sync";
const SYNC_SPACE = (import.meta.env.VITE_SYNC_SPACE as string | undefined) || "default";

const POLL_MS = 3000;
const TRACKED_KEYS = new Set([
  "inventory.items.v2",
  "inventory.categories.v2",
  "inventory.locations.v1",
  "inventory.users.v1",
  "inventory.securitySettings.v1",
  "inventory.jobNotifications.v1",
  "inventory.jobs.v1",
  "inventory.jobUsage.v1",
  "inventory.toolSignoutRequests.v1",
]);

type CloudSnapshot = {
  updatedAt: number;
  updatedBy: string;
  appVersion: string;
  values: Record<string, string>;
};

function sanitizeEnv(value?: string): string {
  if (!value) return "";
  const trimmed = value.trim();
  if ((trimmed.startsWith('"') && trimmed.endsWith('"')) || (trimmed.startsWith("'") && trimmed.endsWith("'"))) {
    return trimmed.slice(1, -1).trim();
  }
  return trimmed;
}

function normalizeSyncUrl(value?: string): string {
  const clean = sanitizeEnv(value);
  if (!clean) return "";
  if (/^https?:\/\//i.test(clean)) return clean;
  if (/^[a-z0-9.-]+\.[a-z]{2,}(\/.*)?$/i.test(clean)) return `https://${clean}`;
  return clean;
}

const SYNC_URL = normalizeSyncUrl(SYNC_URL_RAW);
const SYNC_ANON_KEY = sanitizeEnv(SYNC_ANON_KEY_RAW);

export type LiveCloudSyncStatus = {
  state: "disabled" | "connecting" | "connected" | "error";
  lastSyncAt: number;
  lastError: string;
};

function readStatusRaw(): LiveCloudSyncStatus {
  try {
    const raw = window.localStorage.getItem(STATUS_KEY);
    if (!raw) {
      return { state: "disabled", lastSyncAt: 0, lastError: "" };
    }
    const parsed = JSON.parse(raw) as Partial<LiveCloudSyncStatus>;
    const state = parsed.state;
    return {
      state: state === "disabled" || state === "connecting" || state === "connected" || state === "error" ? state : "disabled",
      lastSyncAt: safeNumber(parsed.lastSyncAt, 0),
      lastError: safeString(parsed.lastError, ""),
    };
  } catch {
    return { state: "disabled", lastSyncAt: 0, lastError: "" };
  }
}

export function readLiveCloudSyncStatus(): LiveCloudSyncStatus {
  if (typeof window === "undefined") {
    return { state: "disabled", lastSyncAt: 0, lastError: "" };
  }
  return readStatusRaw();
}

export function requestLiveCloudSyncNow() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(SYNC_NOW_EVENT_NAME));
}

function writeStatus(next: Partial<LiveCloudSyncStatus>) {
  const prev = readStatusRaw();
  const merged: LiveCloudSyncStatus = {
    state: next.state ?? prev.state,
    lastSyncAt: typeof next.lastSyncAt === "number" ? next.lastSyncAt : prev.lastSyncAt,
    lastError: typeof next.lastError === "string" ? next.lastError : prev.lastError,
  };
  try {
    window.localStorage.setItem(STATUS_KEY, JSON.stringify(merged));
  } catch (error) {
    console.warn("[Loadout Sync] Failed to persist status:", error);
  }
  window.dispatchEvent(new Event(STATUS_EVENT_NAME));
}

function safeString(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

function safeNumber(value: unknown, fallback = 0): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function normalizeSnapshot(value: unknown): CloudSnapshot | null {
  if (!value || typeof value !== "object") return null;
  const rec = value as Record<string, unknown>;
  const valuesRaw = rec.values;
  if (!valuesRaw || typeof valuesRaw !== "object") return null;

  const values: Record<string, string> = {};
  for (const [key, raw] of Object.entries(valuesRaw as Record<string, unknown>)) {
    if (typeof raw !== "string") continue;
    values[key] = raw;
  }

  return {
    updatedAt: safeNumber(rec.updatedAt, 0),
    updatedBy: safeString(rec.updatedBy, ""),
    appVersion: safeString(rec.appVersion, ""),
    values,
  };
}

function shouldTrackKey(key: string): boolean {
  return TRACKED_KEYS.has(key);
}

function getTrackedKeys(): string[] {
  const keys: string[] = [];
  for (let index = 0; index < window.localStorage.length; index += 1) {
    const key = window.localStorage.key(index);
    if (!key || !shouldTrackKey(key)) continue;
    keys.push(key);
  }
  keys.sort();
  return keys;
}

function collectLocalValues(): Record<string, string> {
  const values: Record<string, string> = {};
  for (const key of getTrackedKeys()) {
    const value = window.localStorage.getItem(key);
    if (typeof value === "string") values[key] = value;
  }
  return values;
}

function signatureFor(values: Record<string, string>): string {
  const sortedKeys = Object.keys(values).sort();
  const normalized: Record<string, string> = {};
  for (const key of sortedKeys) {
    normalized[key] = values[key] ?? "";
  }
  return JSON.stringify(normalized);
}

function extractTrackedValues(values: Record<string, string>): Record<string, string> {
  const tracked: Record<string, string> = {};
  for (const key of Array.from(TRACKED_KEYS).sort()) {
    const value = values[key];
    if (typeof value === "string") {
      tracked[key] = value;
    }
  }
  return tracked;
}

function getOrCreateDeviceId(): string {
  const existing = window.localStorage.getItem(DEVICE_ID_KEY);
  if (existing) return existing;
  const created = Math.random().toString(36).slice(2, 10) + "-" + Date.now().toString(36);
  window.localStorage.setItem(DEVICE_ID_KEY, created);
  return created;
}

function writeLastSyncTimestamp(timestamp: number) {
  try {
    window.localStorage.setItem(LAST_SYNC_TS_KEY, String(timestamp || 0));
  } catch (error) {
    console.warn("[Loadout Sync] Failed to persist sync timestamp:", error);
  }
}

function notifyStateUpdated() {
  window.dispatchEvent(new Event(EVENT_NAME));
}

function applyRemoteValues(values: Record<string, string>) {
  const trackedRemote = extractTrackedValues(values);

  for (const key of Array.from(TRACKED_KEYS).sort()) {
    const hasRemoteValue = Object.prototype.hasOwnProperty.call(trackedRemote, key);

    try {
      if (hasRemoteValue) {
        const next = trackedRemote[key] ?? "";
        if (window.localStorage.getItem(key) !== next) {
          window.localStorage.setItem(key, next);
        }
      } else if (window.localStorage.getItem(key) !== null) {
        window.localStorage.removeItem(key);
      }
    } catch (error) {
      console.warn(`[Loadout Sync] Failed to apply key ${key}:`, error);
    }
  }
}

export function startLiveCloudSync(appVersion: string) {
  if (typeof window === "undefined") return;
  writeStatus({ state: "connecting", lastError: "" });

  if (!SYNC_URL || !SYNC_ANON_KEY) {
    console.info("[Loadout Sync] Cloud sync disabled (missing VITE_SYNC_SUPABASE_URL or VITE_SYNC_SUPABASE_ANON_KEY).");
    writeStatus({ state: "disabled", lastError: "Missing sync environment variables." });
    return;
  }

  if (!/^https?:\/\//i.test(SYNC_URL)) {
    console.warn("[Loadout Sync] Cloud sync disabled (invalid VITE_SYNC_SUPABASE_URL format).");
    writeStatus({ state: "disabled", lastError: "Invalid sync URL format." });
    return;
  }

  const maybeClient = (() => {
    try {
      return createClient(SYNC_URL, SYNC_ANON_KEY, {
        auth: { persistSession: false, autoRefreshToken: false },
      });
    } catch (error) {
      console.error("[Loadout Sync] Cloud sync failed to initialize:", error);
      writeStatus({ state: "error", lastError: "Cloud sync client initialization failed." });
      return null;
    }
  })();
  if (!maybeClient) return;
  const client = maybeClient;

  let deviceId = "";
  try {
    deviceId = getOrCreateDeviceId();
  } catch (error) {
    console.error("[Loadout Sync] Cloud sync disabled (device id setup failed):", error);
    writeStatus({ state: "error", lastError: "Device sync identity setup failed." });
    return;
  }
  let currentSignature = signatureFor(collectLocalValues());
  let applyingRemote = false;

  async function pushLocalValues() {
    if (applyingRemote) return;

    const values = collectLocalValues();
    const nextSignature = signatureFor(values);
    if (nextSignature === currentSignature) return;

    const snapshot: CloudSnapshot = {
      updatedAt: Date.now(),
      updatedBy: deviceId,
      appVersion,
      values,
    };

    const row = {
      id: SYNC_SPACE,
      payload: snapshot,
      updated_at: new Date(snapshot.updatedAt).toISOString(),
    };

    let error: { message?: string } | null = null;

    const upsertResult = await client.from(SYNC_TABLE).upsert(row, { onConflict: "id" });
    if (upsertResult.error) {
      const updateResult = await client.from(SYNC_TABLE).update(row).eq("id", SYNC_SPACE);
      if (updateResult.error) {
        const insertResult = await client.from(SYNC_TABLE).insert(row);
        if (insertResult.error) {
          error = insertResult.error;
        }
      }
    }

    if (error) {
      console.warn("[Loadout Sync] Push failed:", error.message);
      writeStatus({ state: "error", lastError: `Push failed: ${error.message}` });
      return;
    }

    currentSignature = nextSignature;
    writeLastSyncTimestamp(snapshot.updatedAt);
    writeStatus({ state: "connected", lastSyncAt: snapshot.updatedAt, lastError: "" });
  }

  async function pullRemoteValues() {
    const localValues = collectLocalValues();
    const localSignature = signatureFor(localValues);
    const hasUnsyncedLocalChanges = localSignature !== currentSignature;
    if (hasUnsyncedLocalChanges) {
      return;
    }

    const { data, error } = await client.from(SYNC_TABLE).select("payload").eq("id", SYNC_SPACE).maybeSingle();
    if (error) {
      console.warn("[Loadout Sync] Pull failed:", error.message);
      writeStatus({ state: "error", lastError: `Pull failed: ${error.message}` });
      return;
    }

    writeStatus({ state: "connected", lastError: "" });

    const snapshot = normalizeSnapshot(data?.payload);
    if (!snapshot) {
      return;
    }

    const remoteValues = extractTrackedValues(snapshot.values);
    const remoteSignature = signatureFor(remoteValues);
    if (remoteSignature === currentSignature) {
      return;
    }

    applyingRemote = true;
    try {
      applyRemoteValues(remoteValues);
      currentSignature = signatureFor(collectLocalValues());
      writeLastSyncTimestamp(snapshot.updatedAt);
      writeStatus({ state: "connected", lastSyncAt: snapshot.updatedAt, lastError: "" });
      notifyStateUpdated();
    } finally {
      applyingRemote = false;
    }
  }

  void pullRemoteValues().then(() => pushLocalValues()).catch(() => {
    // no-op: already logged by pull/push
  });

  const channel = client
    .channel(`loadout-sync:${SYNC_SPACE}`)
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: SYNC_TABLE, filter: `id=eq.${SYNC_SPACE}` },
      (payload) => {
        const localSignature = signatureFor(collectLocalValues());
        if (localSignature !== currentSignature) {
          return;
        }

        const nextRow = payload.new as Record<string, unknown> | null;
        const snapshot = normalizeSnapshot(nextRow?.payload);
        if (!snapshot) return;

        const remoteValues = extractTrackedValues(snapshot.values);
        const remoteSignature = signatureFor(remoteValues);
        if (remoteSignature === currentSignature) return;

        applyingRemote = true;
        try {
          applyRemoteValues(remoteValues);
          currentSignature = signatureFor(collectLocalValues());
          writeLastSyncTimestamp(snapshot.updatedAt);
          writeStatus({ state: "connected", lastSyncAt: snapshot.updatedAt, lastError: "" });
          notifyStateUpdated();
        } finally {
          applyingRemote = false;
        }
      }
    )
    .subscribe((status) => {
      if (status === "SUBSCRIBED") {
        writeStatus({ state: "connected", lastError: "" });
        void pullRemoteValues();
      } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
        writeStatus({ state: "connecting", lastError: `Realtime reconnecting: ${status}` });
      }
    });

  const syncTick = async () => {
    try {
      await pushLocalValues();
      await pullRemoteValues();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown sync error";
      console.error("[Loadout Sync] Sync tick failed:", error);
      writeStatus({ state: "error", lastError: `Sync failed: ${message}` });
    }
  };

  const timer = window.setInterval(() => {
    void syncTick();
  }, POLL_MS);

  const onVisibilityOrFocus = () => {
    void syncTick();
  };
  window.addEventListener("focus", onVisibilityOrFocus);
  document.addEventListener("visibilitychange", onVisibilityOrFocus);

  const onSyncNow = () => {
    writeStatus({ state: "connecting", lastError: "" });
    void syncTick();
  };
  window.addEventListener(SYNC_NOW_EVENT_NAME, onSyncNow);

  const onBeforeUnload = () => {
    void syncTick();
  };
  window.addEventListener("beforeunload", onBeforeUnload);

  const teardown = () => {
    window.removeEventListener("focus", onVisibilityOrFocus);
    document.removeEventListener("visibilitychange", onVisibilityOrFocus);
    window.removeEventListener(SYNC_NOW_EVENT_NAME, onSyncNow);
    window.removeEventListener("beforeunload", onBeforeUnload);
    window.clearInterval(timer);
    void client.removeChannel(channel);
  };

  window.addEventListener("unload", teardown, { once: true });
}
