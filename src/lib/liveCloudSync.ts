import { createClient } from "@supabase/supabase-js";

const EVENT_NAME = "loadout:state-updated";
const STATUS_EVENT_NAME = "loadout:sync-status";
const SYNC_NOW_EVENT_NAME = "loadout:sync-now";
const SYNC_IMPORT_EVENT_NAME = "loadout:sync-import-latest";
const DEVICE_ID_KEY = "loadout.syncDeviceId.v1";
const LAST_SYNC_TS_KEY = "loadout.syncLastTimestamp.v1";
const STATUS_KEY = "loadout.syncStatus.v1";

const SYNC_URL_RAW = import.meta.env.VITE_SYNC_SUPABASE_URL as string | undefined;
const SYNC_ANON_KEY_RAW = import.meta.env.VITE_SYNC_SUPABASE_ANON_KEY as string | undefined;
const SYNC_TABLE = (import.meta.env.VITE_SYNC_TABLE as string | undefined) || "loadout_sync";
const SYNC_SPACE = (import.meta.env.VITE_SYNC_SPACE as string | undefined) || "default";

const POLL_MS = 6000;
const BACKGROUND_PULL_MS = 120000;
const FALLBACK_PULL_MS = 30000;
const PULL_COOLDOWN_MS = 180000;
const PULL_TIMEOUT_SUSPEND_AFTER = 4;
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

async function withAbortTimeout<T>(
  run: (signal: AbortSignal) => PromiseLike<T>,
  timeoutMs: number,
  label: string
): Promise<T> {
  const controller = new AbortController();
  const timer = window.setTimeout(() => {
    controller.abort();
  }, timeoutMs);

  try {
    return await Promise.resolve(run(controller.signal));
  } catch (error) {
    if (controller.signal.aborted) {
      throw new Error(`${label} timed out after ${timeoutMs}ms`);
    }
    throw error;
  } finally {
    window.clearTimeout(timer);
  }
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
  pullSuspended: boolean;
  pullBackoffUntil: number;
  consecutivePullTimeouts: number;
  realtimeDisabled: boolean;
  lastOperation: string;
  lastOperationAt: number;
  lastOperationDetail: string;
  pullCooldownActive: boolean;
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
        pullSuspended: false,
        pullBackoffUntil: 0,
        consecutivePullTimeouts: 0,
        realtimeDisabled: false,
        lastOperation: "idle",
        lastOperationAt: 0,
        lastOperationDetail: "",
        pullCooldownActive: false,
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
      pullSuspended: !!parsed.pullSuspended,
      pullBackoffUntil: safeNumber(parsed.pullBackoffUntil, 0),
      consecutivePullTimeouts: safeNumber(parsed.consecutivePullTimeouts, 0),
      realtimeDisabled: !!parsed.realtimeDisabled,
      lastOperation: safeString(parsed.lastOperation, "idle"),
      lastOperationAt: safeNumber(parsed.lastOperationAt, 0),
      lastOperationDetail: safeString(parsed.lastOperationDetail, ""),
      pullCooldownActive: !!parsed.pullCooldownActive,
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
      pullSuspended: false,
      pullBackoffUntil: 0,
      consecutivePullTimeouts: 0,
      realtimeDisabled: false,
      lastOperation: "idle",
      lastOperationAt: 0,
      lastOperationDetail: "",
      pullCooldownActive: false,
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
      pullSuspended: false,
      pullBackoffUntil: 0,
      consecutivePullTimeouts: 0,
      realtimeDisabled: false,
      lastOperation: "idle",
      lastOperationAt: 0,
      lastOperationDetail: "",
      pullCooldownActive: false,
    };
  }
  return readStatusRaw();
}

export function requestLiveCloudSyncNow() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(SYNC_NOW_EVENT_NAME));
}

export function requestLiveCloudImportLatest() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(SYNC_IMPORT_EVENT_NAME));
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
    pullSuspended: typeof next.pullSuspended === "boolean" ? next.pullSuspended : prev.pullSuspended,
    pullBackoffUntil: typeof next.pullBackoffUntil === "number" ? next.pullBackoffUntil : prev.pullBackoffUntil,
    consecutivePullTimeouts:
      typeof next.consecutivePullTimeouts === "number" ? next.consecutivePullTimeouts : prev.consecutivePullTimeouts,
    realtimeDisabled: typeof next.realtimeDisabled === "boolean" ? next.realtimeDisabled : prev.realtimeDisabled,
    lastOperation: typeof next.lastOperation === "string" ? next.lastOperation : prev.lastOperation,
    lastOperationAt: typeof next.lastOperationAt === "number" ? next.lastOperationAt : prev.lastOperationAt,
    lastOperationDetail: typeof next.lastOperationDetail === "string" ? next.lastOperationDetail : prev.lastOperationDetail,
    pullCooldownActive: typeof next.pullCooldownActive === "boolean" ? next.pullCooldownActive : prev.pullCooldownActive,
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

function isRetryablePullNetworkError(message: string): boolean {
  const text = message.toLowerCase();
  return text.includes("timed out") || text.includes("aborted") || text.includes("networkerror") || text.includes("failed to fetch");
}

function isPullTimeoutError(message: string): boolean {
  return message.toLowerCase().includes("timed out");
}

function isPullAbortError(message: string): boolean {
  return message.toLowerCase().includes("aborted");
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
  writeStatus({
    state: "connecting",
    lastError: "",
    pullSuspended: false,
    pullBackoffUntil: 0,
    consecutivePullTimeouts: 0,
    realtimeDisabled: false,
    lastOperation: "startup",
    lastOperationAt: Date.now(),
    lastOperationDetail: "Initializing cloud sync",
    pullCooldownActive: false,
  });

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
  let lastForcedPullAt = 0;
  let pullBackoffUntil = 0;
  let consecutivePullTimeouts = 0;
  let pullSuspended = false;
  let applyingRemote = false;
  let syncInFlight = false;
  let syncQueued = false;
  let syncQueuedForcePull = false;
  let syncQueuedFullPull = false;
  let realtimeDisabled = false;

  async function pushLocalValues() {
    if (applyingRemote) return;

    writeStatus({
      lastOperation: "push",
      lastOperationAt: Date.now(),
      lastOperationDetail: "Pushing local changes",
    });

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
        const upsertResult: { error: { message?: string } | null } = await withAbortTimeout(
          (signal) => client.from(SYNC_TABLE).upsert(row, { onConflict: "id" }).abortSignal(signal),
          REQUEST_TIMEOUT_MS,
          "push upsert"
        );
        if (upsertResult.error) {
          const updateResult: { error: { message?: string } | null } = await withAbortTimeout(
            (signal) => client.from(SYNC_TABLE).update(row).eq("id", SYNC_SPACE).abortSignal(signal),
            REQUEST_TIMEOUT_MS,
            "push update"
          );
          if (updateResult.error) {
            const insertResult: { error: { message?: string } | null } = await withAbortTimeout(
              (signal) => client.from(SYNC_TABLE).insert(row).abortSignal(signal),
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
        lastOperation: "push",
        lastOperationAt: Date.now(),
        lastOperationDetail: `Push failed: ${error.message || "unknown error"}`,
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
      pullSuspended,
      pullBackoffUntil,
      consecutivePullTimeouts,
      realtimeDisabled,
      pullCooldownActive: false,
      lastOperation: "push",
      lastOperationAt: pushTs,
      lastOperationDetail: "Push successful",
    });
  }

  async function pullRemoteValues(opts?: { force?: boolean; full?: boolean }) {
    const force = !!opts?.force;
    const fullPull = !!opts?.full;

    writeStatus({
      lastError: "",
      lastOperation: fullPull ? "pull-full" : "pull",
      lastOperationAt: Date.now(),
      lastOperationDetail: fullPull ? "Running full cloud import" : "Running cloud pull",
      pullSuspended,
      pullBackoffUntil,
      consecutivePullTimeouts,
      realtimeDisabled,
      pullCooldownActive: Date.now() < pullBackoffUntil,
    });

    if (pullSuspended && !force) {
      writeStatus({
        state: "connected",
        lastError: "Automatic pull suspended after repeated mobile network timeouts. Use Retry Sync for manual pull attempts.",
        pullSuspended: true,
        pullBackoffUntil,
        consecutivePullTimeouts,
        realtimeDisabled,
        lastOperation: "pull",
        lastOperationAt: Date.now(),
        lastOperationDetail: "Automatic pull skipped: suspended",
      });
      return;
    }

    const nowTs = Date.now();
    if (!force && nowTs < pullBackoffUntil) {
      const current = readStatusRaw();
      if (current.state !== "error") {
        writeStatus({
          state: "connected",
          lastError: "Pull temporarily paused due to mobile network timeouts. Push + realtime fallback still active.",
          pullSuspended,
          pullBackoffUntil,
          consecutivePullTimeouts,
          realtimeDisabled,
          pullCooldownActive: true,
          lastOperation: "pull",
          lastOperationAt: Date.now(),
          lastOperationDetail: "Pull skipped: in cooldown window",
        });
      }
      return;
    }

    const localValues = collectLocalValues();
    const localSignature = signatureFor(localValues);
    const hasUnsyncedLocalChanges = localSignature !== currentSignature;
    if (hasUnsyncedLocalChanges) {
      return;
    }

    let metaData: { updated_at?: unknown } | null = null;
    let data: { updated_at?: unknown; payload?: unknown } | null = null;
    let error: { message?: string } | null = null;
    if (!fullPull) {
      try {
        const metaResult = await withRetry(async (): Promise<{ data: { updated_at?: unknown } | null; error: { message?: string } | null }> => {
          const next: { data: { updated_at?: unknown } | null; error: { message?: string } | null } = await withAbortTimeout(
            (signal) => client.from(SYNC_TABLE).select("updated_at").eq("id", SYNC_SPACE).abortSignal(signal).maybeSingle(),
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
    }

    if (error) {
      console.warn("[Loadout Sync] Pull failed:", error.message);
      const message = error.message || "";
      const isRetryableNetwork = isRetryablePullNetworkError(message);
      const isTimeout = isPullTimeoutError(message);
      const isAborted = isPullAbortError(message);
      if (isRetryableNetwork) {
        if (isTimeout) {
          consecutivePullTimeouts += 1;
          pullBackoffUntil = Date.now() + PULL_COOLDOWN_MS;
          if (consecutivePullTimeouts >= PULL_TIMEOUT_SUSPEND_AFTER) {
            pullSuspended = true;
          }
        } else {
          pullBackoffUntil = Date.now() + 15000;
        }
      }
      const current = readStatusRaw();
      if (isRecentSync(current.lastSyncAt)) {
        writeStatus({
          state: "connected",
          lastError: isTimeout
            ? `Pull timed out on this network; retrying after cooldown (${Math.round(PULL_COOLDOWN_MS / 1000)}s).`
            : isAborted
            ? "Pull request was interrupted on mobile; retrying automatically."
            : isRetryableNetwork
            ? "Pull network interruption detected; retrying automatically."
            : `Pull degraded (using realtime/push): ${error.message}`,
          lastPullError: isRetryableNetwork ? "" : error.message || "Pull failed",
          pullSuspended,
          pullBackoffUntil,
          consecutivePullTimeouts,
          realtimeDisabled,
          pullCooldownActive: isRetryableNetwork,
          lastOperation: "pull",
          lastOperationAt: Date.now(),
          lastOperationDetail: `Pull issue: ${error.message || "network interruption"}`,
        });
      } else {
        if (isRetryableNetwork) {
          writeStatus({
            state: "connecting",
            lastError: isTimeout
              ? `Pull timed out on this network; retrying after cooldown (${Math.round(PULL_COOLDOWN_MS / 1000)}s).`
              : isAborted
              ? "Pull request was interrupted on mobile; retrying automatically."
              : "Pull network interruption detected; retrying automatically.",
            lastPullError: "",
            pullSuspended,
            pullBackoffUntil,
            consecutivePullTimeouts,
            realtimeDisabled,
            pullCooldownActive: isRetryableNetwork,
            lastOperation: "pull",
            lastOperationAt: Date.now(),
            lastOperationDetail: `Pull retry queued: ${error.message || "interruption"}`,
          });
        } else {
          writeStatus({
            state: "error",
            lastError: `Pull failed: ${error.message}`,
            lastPullError: error.message || "Pull failed",
            pullSuspended,
            pullBackoffUntil,
            consecutivePullTimeouts,
            realtimeDisabled,
            pullCooldownActive: false,
            lastOperation: "pull",
            lastOperationAt: Date.now(),
            lastOperationDetail: `Pull failed: ${error.message || "unknown error"}`,
          });
        }
      }
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
      pullSuspended,
      pullBackoffUntil,
      consecutivePullTimeouts,
      realtimeDisabled,
      pullCooldownActive: false,
      lastOperation: fullPull ? "pull-full" : "pull",
      lastOperationAt: heartbeatTs,
      lastOperationDetail: "Pull metadata check successful",
    });

    let remoteUpdatedAt = "";
    if (!fullPull) {
      remoteUpdatedAt = normalizeUpdatedAt(metaData?.updated_at);
      if (!remoteUpdatedAt) {
        lastRemoteUpdatedAt = "";
        return;
      }

      if (remoteUpdatedAt === lastRemoteUpdatedAt) {
        return;
      }
    }

    error = null;
    try {
      const result = await withRetry(async (): Promise<{ data: { updated_at?: unknown; payload?: unknown } | null; error: { message?: string } | null }> => {
        const next: { data: { updated_at?: unknown; payload?: unknown } | null; error: { message?: string } | null } = await withAbortTimeout(
          (signal) => client.from(SYNC_TABLE).select("updated_at,payload").eq("id", SYNC_SPACE).abortSignal(signal).maybeSingle(),
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
      const message = error.message || "";
      const isRetryableNetwork = isRetryablePullNetworkError(message);
      const isTimeout = isPullTimeoutError(message);
      const isAborted = isPullAbortError(message);
      if (isRetryableNetwork) {
        if (isTimeout) {
          consecutivePullTimeouts += 1;
          pullBackoffUntil = Date.now() + PULL_COOLDOWN_MS;
          if (consecutivePullTimeouts >= PULL_TIMEOUT_SUSPEND_AFTER) {
            pullSuspended = true;
          }
        } else {
          pullBackoffUntil = Date.now() + 15000;
        }
      }
      const current = readStatusRaw();
      if (isRecentSync(current.lastSyncAt)) {
        writeStatus({
          state: "connected",
          lastError: isTimeout
            ? `Pull timed out on this network; retrying after cooldown (${Math.round(PULL_COOLDOWN_MS / 1000)}s).`
            : isAborted
            ? "Pull request was interrupted on mobile; retrying automatically."
            : isRetryableNetwork
            ? "Pull network interruption detected; retrying automatically."
            : `Pull degraded (using realtime/push): ${error.message}`,
          lastPullError: isRetryableNetwork ? "" : error.message || "Pull failed",
          pullSuspended,
          pullBackoffUntil,
          consecutivePullTimeouts,
          realtimeDisabled,
          pullCooldownActive: isRetryableNetwork,
          lastOperation: "pull",
          lastOperationAt: Date.now(),
          lastOperationDetail: `Pull payload issue: ${error.message || "network interruption"}`,
        });
      } else {
        if (isRetryableNetwork) {
          writeStatus({
            state: "connecting",
            lastError: isTimeout
              ? `Pull timed out on this network; retrying after cooldown (${Math.round(PULL_COOLDOWN_MS / 1000)}s).`
              : isAborted
              ? "Pull request was interrupted on mobile; retrying automatically."
              : "Pull network interruption detected; retrying automatically.",
            lastPullError: "",
            pullSuspended,
            pullBackoffUntil,
            consecutivePullTimeouts,
            realtimeDisabled,
            pullCooldownActive: isRetryableNetwork,
            lastOperation: "pull",
            lastOperationAt: Date.now(),
            lastOperationDetail: `Pull payload retry queued: ${error.message || "interruption"}`,
          });
        } else {
          writeStatus({
            state: "error",
            lastError: `Pull failed: ${error.message}`,
            lastPullError: error.message || "Pull failed",
            pullSuspended,
            pullBackoffUntil,
            consecutivePullTimeouts,
            realtimeDisabled,
            pullCooldownActive: false,
            lastOperation: "pull",
            lastOperationAt: Date.now(),
            lastOperationDetail: `Pull payload failed: ${error.message || "unknown error"}`,
          });
        }
      }
      return;
    }

    lastRemoteUpdatedAt = normalizeUpdatedAt(data?.updated_at) || remoteUpdatedAt;
    consecutivePullTimeouts = 0;
    pullSuspended = false;

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
        pullSuspended,
        pullBackoffUntil,
        consecutivePullTimeouts,
        realtimeDisabled,
        pullCooldownActive: false,
        lastOperation: fullPull ? "pull-full" : "pull",
        lastOperationAt: Date.now(),
        lastOperationDetail: "Pull payload applied",
      });
      notifyStateUpdated();
    } finally {
      applyingRemote = false;
    }
  }

  const runSyncTick = async (opts?: { forcePull?: boolean; fullPull?: boolean }) => {
    const forcePull = !!opts?.forcePull;
    const fullPull = !!opts?.fullPull;
    if (syncInFlight) {
      syncQueued = true;
      syncQueuedForcePull = syncQueuedForcePull || forcePull;
      syncQueuedFullPull = syncQueuedFullPull || fullPull;
      return;
    }
    syncInFlight = true;
    try {
      await pushLocalValues();

      const nowTs = Date.now();
      const pullInterval = realtimeDisabled ? FALLBACK_PULL_MS : BACKGROUND_PULL_MS;
      const shouldRunPull = fullPull || forcePull || nowTs - lastForcedPullAt >= pullInterval;
      if (shouldRunPull) {
        lastForcedPullAt = nowTs;
        await pullRemoteValues({ force: forcePull, full: fullPull });
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown sync error";
      console.error("[Loadout Sync] Sync tick failed:", error);
      writeStatus({ state: "error", lastError: `Sync failed: ${message}`, pullSuspended });
    } finally {
      syncInFlight = false;
      if (syncQueued) {
        const queuedForcePull = syncQueuedForcePull;
        const queuedFullPull = syncQueuedFullPull;
        syncQueued = false;
        syncQueuedForcePull = false;
        syncQueuedFullPull = false;
        void runSyncTick({ forcePull: queuedForcePull, fullPull: queuedFullPull });
      }
    }
  };

  void pullRemoteValues({ force: true }).then(() => pushLocalValues()).catch(() => {
    // no-op: already logged by pull/push
  });

  let channel: ReturnType<typeof client.channel> | null = client
    .channel(`loadout-sync:${SYNC_SPACE}`)
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: SYNC_TABLE, filter: `id=eq.${SYNC_SPACE}` },
      (payload) => {
        if (realtimeDisabled) return;
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
            pullSuspended,
            pullBackoffUntil,
            consecutivePullTimeouts,
            realtimeDisabled,
            pullCooldownActive: false,
            lastOperation: "realtime",
            lastOperationAt: Date.now(),
            lastOperationDetail: "Realtime payload applied",
          });
          notifyStateUpdated();
        } finally {
          applyingRemote = false;
        }
      }
    )
    .subscribe((status) => {
      if (status === "SUBSCRIBED") {
        realtimeDisabled = false;
        const current = readStatusRaw();
        if (current.state === "disabled") {
          writeStatus({ state: "connecting", lastError: "Realtime channel connected. Running sync..." });
        }
        writeStatus({
          realtimeDisabled,
          pullCooldownActive: Date.now() < pullBackoffUntil,
          lastOperation: "realtime",
          lastOperationAt: Date.now(),
          lastOperationDetail: "Realtime channel subscribed",
        });
        void runSyncTick({ forcePull: true });
      } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
        realtimeDisabled = true;
        writeStatus({ state: "connected", lastError: `Realtime channel unavailable (${status}). Fallback polling active.` });
        writeStatus({
          realtimeDisabled,
          pullCooldownActive: Date.now() < pullBackoffUntil,
          lastOperation: "realtime",
          lastOperationAt: Date.now(),
          lastOperationDetail: `Realtime channel degraded: ${status}`,
        });
        if (channel) {
          void client.removeChannel(channel);
          channel = null;
        }
        void runSyncTick({ forcePull: true });
      }
    });

  const timer = window.setInterval(() => {
    void runSyncTick({ forcePull: false });
  }, POLL_MS);

  const onVisibilityOrFocus = () => {
    void runSyncTick({ forcePull: true });
  };
  window.addEventListener("focus", onVisibilityOrFocus);
  document.addEventListener("visibilitychange", onVisibilityOrFocus);

  const onLocalStateUpdated = () => {
    if (applyingRemote) return;
    void runSyncTick({ forcePull: false });
  };
  window.addEventListener(EVENT_NAME, onLocalStateUpdated);

  const onStorage = (event: StorageEvent) => {
    if (!event.key || !shouldTrackKey(event.key)) return;
    void runSyncTick({ forcePull: false });
  };
  window.addEventListener("storage", onStorage);

  const onSyncNow = () => {
    pullBackoffUntil = 0;
    pullSuspended = false;
    consecutivePullTimeouts = 0;
    writeStatus({ state: "connecting", lastError: "", pullSuspended: false });
    void runSyncTick({ forcePull: true });
  };
  window.addEventListener(SYNC_NOW_EVENT_NAME, onSyncNow);

  const onSyncImport = () => {
    pullBackoffUntil = 0;
    pullSuspended = false;
    consecutivePullTimeouts = 0;
    writeStatus({
      state: "connecting",
      lastError: "Importing latest cloud data...",
      pullSuspended: false,
      pullCooldownActive: false,
      lastOperation: "pull-full",
      lastOperationAt: Date.now(),
      lastOperationDetail: "Manual Import Latest requested",
    });
    void runSyncTick({ forcePull: true, fullPull: true });
  };
  window.addEventListener(SYNC_IMPORT_EVENT_NAME, onSyncImport);

  const onBeforeUnload = () => {
    void runSyncTick({ forcePull: true });
  };
  window.addEventListener("beforeunload", onBeforeUnload);

  const teardown = () => {
    window.removeEventListener("focus", onVisibilityOrFocus);
    document.removeEventListener("visibilitychange", onVisibilityOrFocus);
    window.removeEventListener(EVENT_NAME, onLocalStateUpdated);
    window.removeEventListener("storage", onStorage);
    window.removeEventListener(SYNC_NOW_EVENT_NAME, onSyncNow);
    window.removeEventListener(SYNC_IMPORT_EVENT_NAME, onSyncImport);
    window.removeEventListener("beforeunload", onBeforeUnload);
    window.clearInterval(timer);
    if (channel) {
      void client.removeChannel(channel);
      channel = null;
    }
  };

  window.addEventListener("unload", teardown, { once: true });
}
