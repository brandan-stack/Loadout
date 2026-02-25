import { createClient } from "@supabase/supabase-js";

const EVENT_NAME = "loadout:state-updated";
const DEVICE_ID_KEY = "loadout.syncDeviceId.v1";
const LAST_SYNC_TS_KEY = "loadout.syncLastTimestamp.v1";

const SYNC_URL = import.meta.env.VITE_SYNC_SUPABASE_URL as string | undefined;
const SYNC_ANON_KEY = import.meta.env.VITE_SYNC_SUPABASE_ANON_KEY as string | undefined;
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

type CloudSnapshot = {
  updatedAt: number;
  updatedBy: string;
  appVersion: string;
  values: Record<string, string>;
};

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

  if (!SYNC_URL || !SYNC_ANON_KEY) {
    console.info("[Loadout Sync] Cloud sync disabled (missing VITE_SYNC_SUPABASE_URL or VITE_SYNC_SUPABASE_ANON_KEY).");
    return;
  }

  if (!/^https?:\/\//i.test(SYNC_URL)) {
    console.warn("[Loadout Sync] Cloud sync disabled (invalid VITE_SYNC_SUPABASE_URL format).");
    return;
  }

  const maybeClient = (() => {
    try {
      return createClient(SYNC_URL, SYNC_ANON_KEY, {
        auth: { persistSession: false, autoRefreshToken: false },
      });
    } catch (error) {
      console.error("[Loadout Sync] Cloud sync failed to initialize:", error);
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
      return;
    }

    currentSignature = nextSignature;
    writeLastSyncTimestamp(snapshot.updatedAt);
  }

  async function pullRemoteValues() {
    const { data, error } = await client.from(SYNC_TABLE).select("payload").eq("id", SYNC_SPACE).maybeSingle();
    if (error) {
      console.warn("[Loadout Sync] Pull failed:", error.message);
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
          notifyStateUpdated();
        } finally {
          applyingRemote = false;
        }
      }
    )
    .subscribe((status) => {
      if (status === "SUBSCRIBED") {
        void pullRemoteValues();
      }
    });

  const syncTick = async () => {
    await pullRemoteValues();
    await pushLocalValues();
  };

  const timer = window.setInterval(() => {
    void syncTick();
  }, POLL_MS);

  const onBeforeUnload = () => {
    void syncTick();
  };
  window.addEventListener("beforeunload", onBeforeUnload);

  const teardown = () => {
    window.removeEventListener("beforeunload", onBeforeUnload);
    window.clearInterval(timer);
    void client.removeChannel(channel);
  };

  window.addEventListener("unload", teardown, { once: true });
}
