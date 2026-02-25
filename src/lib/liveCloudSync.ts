import { createClient } from "@supabase/supabase-js";

const EVENT_NAME = "loadout:state-updated";
const STATUS_EVENT_NAME = "loadout:sync-status";
const LOCAL_WRITE_EVENT_NAME = "loadout:local-write";
const DEVICE_ID_KEY = "loadout.syncDeviceId.v1";
const LAST_SYNC_TS_KEY = "loadout.syncLastTimestamp.v1";
const STATUS_KEY = "loadout.syncStatus.v1";

const SYNC_URL_RAW = import.meta.env.VITE_SYNC_SUPABASE_URL as string | undefined;
const SYNC_ANON_KEY_RAW = import.meta.env.VITE_SYNC_SUPABASE_ANON_KEY as string | undefined;
const SYNC_TABLE = (import.meta.env.VITE_SYNC_TABLE as string | undefined) || "loadout_sync";
const SYNC_SPACE = (import.meta.env.VITE_SYNC_SPACE as string | undefined) || "default";

const POLL_MS = 2500;
const KEY_PREFIXES = ["inventory.", "loadout."];
const EXCLUDED_KEYS = new Set([
  "inventory.session.v1",
  "loadout.activeTab",
  "loadout.pdfBackup.lastSyncAt.v1",
  "loadout.pdfBackup.lastError.v1",
]);

declare global {
  interface Window {
    __loadoutSyncLocalStorageHookInstalled?: boolean;
  }
}

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

function writeStatus(next: Partial<LiveCloudSyncStatus>) {
  const prev = readStatusRaw();
  const merged: LiveCloudSyncStatus = {
    state: next.state ?? prev.state,
    lastSyncAt: typeof next.lastSyncAt === "number" ? next.lastSyncAt : prev.lastSyncAt,
    lastError: typeof next.lastError === "string" ? next.lastError : prev.lastError,
  };
  window.localStorage.setItem(STATUS_KEY, JSON.stringify(merged));
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
  return KEY_PREFIXES.some((prefix) => key.startsWith(prefix)) && !EXCLUDED_KEYS.has(key);
}

function emitLocalWriteSignal(changedKey?: string | null) {
  if (changedKey && !shouldTrackKey(changedKey)) return;
  window.dispatchEvent(new Event(LOCAL_WRITE_EVENT_NAME));
}

function installLocalStorageHook() {
  if (window.__loadoutSyncLocalStorageHookInstalled) return;
  window.__loadoutSyncLocalStorageHookInstalled = true;

  const rawSetItem = window.localStorage.setItem.bind(window.localStorage);
  const rawRemoveItem = window.localStorage.removeItem.bind(window.localStorage);
  const rawClear = window.localStorage.clear.bind(window.localStorage);

  window.localStorage.setItem = (key: string, value: string) => {
    rawSetItem(key, value);
    emitLocalWriteSignal(key);
  };

  window.localStorage.removeItem = (key: string) => {
    rawRemoveItem(key);
    emitLocalWriteSignal(key);
  };

  window.localStorage.clear = () => {
    const hadTrackedKeys = getTrackedKeys().length > 0;
    rawClear();
    if (hadTrackedKeys) {
      emitLocalWriteSignal();
    }
  };
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
  return JSON.stringify(values);
}

function getOrCreateDeviceId(): string {
  const existing = window.localStorage.getItem(DEVICE_ID_KEY);
  if (existing) return existing;
  const created = Math.random().toString(36).slice(2, 10) + "-" + Date.now().toString(36);
  window.localStorage.setItem(DEVICE_ID_KEY, created);
  return created;
}

function readLastSyncTimestamp(): number {
  return safeNumber(window.localStorage.getItem(LAST_SYNC_TS_KEY), 0);
}

function writeLastSyncTimestamp(timestamp: number) {
  window.localStorage.setItem(LAST_SYNC_TS_KEY, String(timestamp || 0));
}

function notifyStateUpdated() {
  window.dispatchEvent(new Event(EVENT_NAME));
}

function applyRemoteValues(values: Record<string, string>) {
  const existingTracked = new Set(getTrackedKeys());
  const incomingKeys = Object.keys(values);

  for (const key of incomingKeys) {
    if (!shouldTrackKey(key)) continue;
    const next = values[key] ?? "";
    if (window.localStorage.getItem(key) !== next) {
      window.localStorage.setItem(key, next);
    }
    existingTracked.delete(key);
  }

  for (const key of existingTracked) {
    window.localStorage.removeItem(key);
  }
}

export function startLiveCloudSync(appVersion: string) {
  if (typeof window === "undefined") return;
  writeStatus({ state: "connecting", lastError: "" });
  installLocalStorageHook();

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

    const { error } = await client.from(SYNC_TABLE).upsert({
      id: SYNC_SPACE,
      payload: snapshot,
      updated_at: new Date(snapshot.updatedAt).toISOString(),
    });

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
    const { data, error } = await client.from(SYNC_TABLE).select("payload").eq("id", SYNC_SPACE).maybeSingle();
    if (error) {
      console.warn("[Loadout Sync] Pull failed:", error.message);
      writeStatus({ state: "error", lastError: `Pull failed: ${error.message}` });
      return;
    }

    const snapshot = normalizeSnapshot(data?.payload);
    if (!snapshot) return;

    if (snapshot.updatedAt <= readLastSyncTimestamp()) {
      return;
    }

    applyingRemote = true;
    try {
      applyRemoteValues(snapshot.values);
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
        const nextRow = payload.new as Record<string, unknown> | null;
        const snapshot = normalizeSnapshot(nextRow?.payload);
        if (!snapshot) return;
        if (snapshot.updatedBy === deviceId) return;
        if (snapshot.updatedAt <= readLastSyncTimestamp()) return;

        applyingRemote = true;
        try {
          applyRemoteValues(snapshot.values);
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
        writeStatus({ state: "error", lastError: `Realtime status: ${status}` });
      }
    });

  const syncTick = async () => {
    await pullRemoteValues();
    await pushLocalValues();
  };

  const timer = window.setInterval(() => {
    void syncTick();
  }, POLL_MS);

  const onLocalWrite = () => {
    if (applyingRemote) return;
    void syncTick();
  };
  window.addEventListener(LOCAL_WRITE_EVENT_NAME, onLocalWrite);

  const onBeforeUnload = () => {
    void syncTick();
  };
  window.addEventListener("beforeunload", onBeforeUnload);

  const teardown = () => {
    window.removeEventListener(LOCAL_WRITE_EVENT_NAME, onLocalWrite);
    window.removeEventListener("beforeunload", onBeforeUnload);
    window.clearInterval(timer);
    void client.removeChannel(channel);
  };

  window.addEventListener("unload", teardown, { once: true });
}
