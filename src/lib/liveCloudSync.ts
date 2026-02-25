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

const POLL_MS = 6000;
const RETRY_DELAY_MS = 1000;
const PUSH_RETRIES = 2;
const PULL_RETRIES = 1;
const REQUEST_TIMEOUT_MS = 45000;
const PULL_META_TIMEOUT_MS = 30000;
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

function delay(ms: number) {
  return new Promise<void>((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

async function withRetry<T>(action: () => Promise<T>, retries: number): Promise<T> {
  let attempt = 0;
  let lastError: unknown;

  while (attempt <= retries) {
    try {
      return await action();
    } catch (error) {
      lastError = error;
      if (attempt >= retries) break;
      await delay(RETRY_DELAY_MS * (attempt + 1));
    }
    attempt += 1;
  }

  throw lastError;
}

async function withTimeout<T>(promise: PromiseLike<T>, timeoutMs: number, label: string): Promise<T> {
  return await Promise.race<T>([
    Promise.resolve(promise),
    new Promise<T>((_, reject) => {
      window.setTimeout(() => {
        reject(new Error(`${label} timed out after ${timeoutMs}ms`));
      }, timeoutMs);
    }),
  ]);
}

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
  lastPushAt: number;
  lastPullAt: number;
  lastPushError: string;
  lastPullError: string;
};

function readStatusRaw(): LiveCloudSyncStatus {
  try {
    const raw = window.localStorage.getItem(STATUS_KEY);
    if (!raw) {
      return {
        state: "disabled",
        lastSyncAt: 0,
        lastError: "",
        lastPushAt: 0,
        lastPullAt: 0,
        lastPushError: "",
        lastPullError: "",
      };
    }
    const parsed = JSON.parse(raw) as Partial<LiveCloudSyncStatus>;
    const state = parsed.state;
    return {
      state: state === "disabled" || state === "connecting" || state === "connected" || state === "error" ? state : "disabled",
      lastSyncAt: safeNumber(parsed.lastSyncAt, 0),
      lastError: safeString(parsed.lastError, ""),
      lastPushAt: safeNumber(parsed.lastPushAt, 0),
      lastPullAt: safeNumber(parsed.lastPullAt, 0),
      lastPushError: safeString(parsed.lastPushError, ""),
      lastPullError: safeString(parsed.lastPullError, ""),
    };
  } catch {
    return {
      state: "disabled",
      lastSyncAt: 0,
      lastError: "",
      lastPushAt: 0,
      lastPullAt: 0,
      lastPushError: "",
      lastPullError: "",
    };
  }
}

export function readLiveCloudSyncStatus(): LiveCloudSyncStatus {
  if (typeof window === "undefined") {
    return {
      state: "disabled",
      lastSyncAt: 0,
      lastError: "",
      lastPushAt: 0,
      lastPullAt: 0,
      lastPushError: "",
      lastPullError: "",
    };
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
    lastPushAt: typeof next.lastPushAt === "number" ? next.lastPushAt : prev.lastPushAt,
    lastPullAt: typeof next.lastPullAt === "number" ? next.lastPullAt : prev.lastPullAt,
    lastPushError: typeof next.lastPushError === "string" ? next.lastPushError : prev.lastPushError,
    lastPullError: typeof next.lastPullError === "string" ? next.lastPullError : prev.lastPullError,
  };
  try {
    window.localStorage.setItem(STATUS_KEY, JSON.stringify(merged));
  } catch (error) {
    console.warn("[Loadout Sync] Failed to persist status:", error);
  }
  window.dispatchEvent(new Event(STATUS_EVENT_NAME));
}

function isRecentSync(lastSyncAt: number): boolean {
  if (!lastSyncAt || lastSyncAt <= 0) return false;
  return Date.now() - lastSyncAt <= POLL_MS * 4;
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

function normalizeUpdatedAt(value: unknown): string {
  return safeString(value, "").trim();
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
  let lastRemoteUpdatedAt = "";
  let applyingRemote = false;
  let syncInFlight = false;
  let syncQueued = false;

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

    try {
      await withRetry(async () => {
        const upsertResult: { error: { message?: string } | null } = await withTimeout(
          client.from(SYNC_TABLE).upsert(row, { onConflict: "id" }),
          REQUEST_TIMEOUT_MS,
          "push upsert"
        );
        if (upsertResult.error) {
          const updateResult: { error: { message?: string } | null } = await withTimeout(
            client.from(SYNC_TABLE).update(row).eq("id", SYNC_SPACE),
            REQUEST_TIMEOUT_MS,
            "push update"
          );
          if (updateResult.error) {
            const insertResult: { error: { message?: string } | null } = await withTimeout(
              client.from(SYNC_TABLE).insert(row),
              REQUEST_TIMEOUT_MS,
              "push insert"
            );
            if (insertResult.error) {
              throw insertResult.error;
            }
          }
        }
      }, PUSH_RETRIES);
    } catch (err) {
      error = (err as { message?: string }) ?? { message: "Unknown push error" };
    }

    if (error) {
      console.warn("[Loadout Sync] Push failed:", error.message);
      writeStatus({
        state: "error",
        lastError: `Push failed: ${error.message}`,
        lastPushError: error.message || "Push failed",
      });
      return;
    }

    const pushTs = Date.now();
    currentSignature = nextSignature;
    lastRemoteUpdatedAt = row.updated_at;
    writeLastSyncTimestamp(snapshot.updatedAt);
    writeStatus({
      state: "connected",
      lastSyncAt: snapshot.updatedAt,
      lastError: "",
      lastPushAt: pushTs,
      lastPushError: "",
    });
  }

  async function pullRemoteValues() {
    const localValues = collectLocalValues();
    const localSignature = signatureFor(localValues);
    const hasUnsyncedLocalChanges = localSignature !== currentSignature;
    if (hasUnsyncedLocalChanges) {
      return;
    }

    let metaData: { updated_at?: unknown } | null = null;
    let data: { updated_at?: unknown; payload?: unknown } | null = null;
    let error: { message?: string } | null = null;
    try {
      const metaResult = await withRetry(async (): Promise<{ data: { updated_at?: unknown } | null; error: { message?: string } | null }> => {
        const next: { data: { updated_at?: unknown } | null; error: { message?: string } | null } = await withTimeout(
          client.from(SYNC_TABLE).select("updated_at").eq("id", SYNC_SPACE).maybeSingle(),
          PULL_META_TIMEOUT_MS,
          "pull meta"
        );
        if (next.error) {
          throw next.error;
        }
        return next;
      }, PULL_RETRIES);
      metaData = metaResult.data;
    } catch (err) {
      error = (err as { message?: string }) ?? { message: "Unknown pull error" };
    }

    if (error) {
      console.warn("[Loadout Sync] Pull failed:", error.message);
      writeStatus({
        state: "error",
        lastError: `Pull failed: ${error.message}`,
        lastPullError: error.message || "Pull failed",
      });
      return;
    }

    const heartbeatTs = Date.now();
    writeLastSyncTimestamp(heartbeatTs);
    writeStatus({
      state: "connected",
      lastSyncAt: heartbeatTs,
      lastError: "",
      lastPullAt: heartbeatTs,
      lastPullError: "",
    });

    const remoteUpdatedAt = normalizeUpdatedAt(metaData?.updated_at);
    if (!remoteUpdatedAt) {
      lastRemoteUpdatedAt = "";
      return;
    }

    if (remoteUpdatedAt === lastRemoteUpdatedAt) {
      return;
    }

    error = null;
    try {
      const result = await withRetry(async (): Promise<{ data: { updated_at?: unknown; payload?: unknown } | null; error: { message?: string } | null }> => {
        const next: { data: { updated_at?: unknown; payload?: unknown } | null; error: { message?: string } | null } = await withTimeout(
          client.from(SYNC_TABLE).select("updated_at,payload").eq("id", SYNC_SPACE).maybeSingle(),
          REQUEST_TIMEOUT_MS,
          "pull select"
        );
        if (next.error) {
          throw next.error;
        }
        return next;
      }, PULL_RETRIES);
      data = result.data;
    } catch (err) {
      error = (err as { message?: string }) ?? { message: "Unknown pull error" };
    }

    if (error) {
      console.warn("[Loadout Sync] Pull failed:", error.message);
      writeStatus({
        state: "error",
        lastError: `Pull failed: ${error.message}`,
        lastPullError: error.message || "Pull failed",
      });
      return;
    }

    lastRemoteUpdatedAt = normalizeUpdatedAt(data?.updated_at) || remoteUpdatedAt;

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
      writeStatus({
        state: "connected",
        lastSyncAt: snapshot.updatedAt,
        lastError: "",
        lastPullAt: Date.now(),
        lastPullError: "",
      });
      notifyStateUpdated();
    } finally {
      applyingRemote = false;
    }
  }

  const runSyncTick = async () => {
    if (syncInFlight) {
      syncQueued = true;
      return;
    }
    syncInFlight = true;
    try {
      await pushLocalValues();
      await pullRemoteValues();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown sync error";
      console.error("[Loadout Sync] Sync tick failed:", error);
      writeStatus({ state: "error", lastError: `Sync failed: ${message}` });
    } finally {
      syncInFlight = false;
      if (syncQueued) {
        syncQueued = false;
        void runSyncTick();
      }
    }
  };

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
        const nextUpdatedAt = normalizeUpdatedAt(nextRow?.updated_at);
        if (nextUpdatedAt) {
          lastRemoteUpdatedAt = nextUpdatedAt;
        }
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
          writeStatus({
            state: "connected",
            lastSyncAt: snapshot.updatedAt,
            lastError: "",
            lastPullAt: Date.now(),
            lastPullError: "",
          });
          notifyStateUpdated();
        } finally {
          applyingRemote = false;
        }
      }
    )
    .subscribe((status) => {
      if (status === "SUBSCRIBED") {
        const current = readStatusRaw();
        if (current.state === "disabled") {
          writeStatus({ state: "connecting", lastError: "Realtime channel connected. Running sync..." });
        }
        void runSyncTick();
      } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
        const current = readStatusRaw();
        if (isRecentSync(current.lastSyncAt)) {
          writeStatus({ state: "connected", lastError: `Realtime degraded, polling active: ${status}` });
        } else {
          writeStatus({ state: "connecting", lastError: `Realtime reconnecting: ${status}` });
        }
        void runSyncTick();
      }
    });

  const timer = window.setInterval(() => {
    void runSyncTick();
  }, POLL_MS);

  const onVisibilityOrFocus = () => {
    void runSyncTick();
  };
  window.addEventListener("focus", onVisibilityOrFocus);
  document.addEventListener("visibilitychange", onVisibilityOrFocus);

  const onLocalStateUpdated = () => {
    if (applyingRemote) return;
    void runSyncTick();
  };
  window.addEventListener(EVENT_NAME, onLocalStateUpdated);

  const onStorage = (event: StorageEvent) => {
    if (!event.key || !shouldTrackKey(event.key)) return;
    void runSyncTick();
  };
  window.addEventListener("storage", onStorage);

  const onSyncNow = () => {
    writeStatus({ state: "connecting", lastError: "" });
    void runSyncTick();
  };
  window.addEventListener(SYNC_NOW_EVENT_NAME, onSyncNow);

  const onBeforeUnload = () => {
    void runSyncTick();
  };
  window.addEventListener("beforeunload", onBeforeUnload);

  const teardown = () => {
    window.removeEventListener("focus", onVisibilityOrFocus);
    document.removeEventListener("visibilitychange", onVisibilityOrFocus);
    window.removeEventListener(EVENT_NAME, onLocalStateUpdated);
    window.removeEventListener("storage", onStorage);
    window.removeEventListener(SYNC_NOW_EVENT_NAME, onSyncNow);
    window.removeEventListener("beforeunload", onBeforeUnload);
    window.clearInterval(timer);
    void client.removeChannel(channel);
  };

  window.addEventListener("unload", teardown, { once: true });
}
