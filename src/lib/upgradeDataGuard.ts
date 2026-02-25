type BackupEnvelope = {
  version: number;
  savedAt: number;
  entries: Record<string, string>;
};

const BACKUP_KEY = "loadout.upgradeBackup.v1";
const LAST_VERSION_KEY = "loadout.lastAppVersion.v1";

const PROTECTED_KEYS = [
  "inventory.items.v2",
  "inventory.items.v1",
  "inventory.items",
  "inventory.items.v0",
  "inventory.categories.v2",
  "inventory.locations.v1",
  "inventory.jobs.v1",
  "inventory.jobUsage.v1",
  "inventory.jobNotifications.v1",
  "inventory.partsUsedDraft.v1",
  "inventory.activity.v1",
  "inventory.users.v1",
  "inventory.session.v1",
  "inventory.securitySettings.v1",
  "audit.log.v1",
  "audit.redo.v1",
  "users.list.v1",
  "users.current.v1",
  "loadout.activeTab",
] as const;

const JSON_KEYS = new Set([
  "inventory.items.v2",
  "inventory.items.v1",
  "inventory.items",
  "inventory.items.v0",
  "inventory.categories.v2",
  "inventory.locations.v1",
  "inventory.jobs.v1",
  "inventory.jobUsage.v1",
  "inventory.jobNotifications.v1",
  "inventory.partsUsedDraft.v1",
  "inventory.activity.v1",
  "inventory.users.v1",
  "inventory.session.v1",
  "inventory.securitySettings.v1",
  "audit.log.v1",
  "audit.redo.v1",
  "users.list.v1",
]);

function canUseStorage() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function safeParseEnvelope(raw: string | null): BackupEnvelope | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as BackupEnvelope;
    if (!parsed || typeof parsed !== "object") return null;
    if (typeof parsed.version !== "number" || !parsed.entries || typeof parsed.entries !== "object") return null;
    return parsed;
  } catch {
    return null;
  }
}

function isCorruptValue(key: string, raw: string | null) {
  if (raw === null) return false;
  if (!JSON_KEYS.has(key)) return false;
  try {
    JSON.parse(raw);
    return false;
  } catch {
    return true;
  }
}

function captureCurrentEntries() {
  const entries: Record<string, string> = {};
  for (const key of PROTECTED_KEYS) {
    const raw = window.localStorage.getItem(key);
    if (raw === null) continue;
    if (isCorruptValue(key, raw)) continue;
    entries[key] = raw;
  }
  return entries;
}

function saveBackupSnapshot() {
  const envelope: BackupEnvelope = {
    version: 1,
    savedAt: Date.now(),
    entries: captureCurrentEntries(),
  };
  window.localStorage.setItem(BACKUP_KEY, JSON.stringify(envelope));
}

function recoverOnVersionChange(nextVersion: string, envelope: BackupEnvelope | null) {
  if (!envelope) return;
  const restored: string[] = [];
  for (const key of PROTECTED_KEYS) {
    const currentRaw = window.localStorage.getItem(key);
    const backupRaw = envelope.entries[key];
    if (!backupRaw) continue;
    const shouldRestore = currentRaw === null || isCorruptValue(key, currentRaw);
    if (!shouldRestore) continue;
    window.localStorage.setItem(key, backupRaw);
    restored.push(key);
  }

  if (restored.length) {
    console.info(`[upgradeDataGuard] Restored ${restored.length} storage keys during upgrade to ${nextVersion}.`);
  }
}

export function runUpgradeDataGuard(appVersion: string) {
  if (!canUseStorage()) return;

  try {
    const previousVersion = window.localStorage.getItem(LAST_VERSION_KEY) ?? "";
    const isVersionChange = !!appVersion && previousVersion !== appVersion;
    const envelope = safeParseEnvelope(window.localStorage.getItem(BACKUP_KEY));

    if (isVersionChange) {
      recoverOnVersionChange(appVersion, envelope);
      window.localStorage.setItem(LAST_VERSION_KEY, appVersion);
    }

    saveBackupSnapshot();
  } catch (error) {
    console.warn("[upgradeDataGuard] Failed to run upgrade guard:", error);
  }
}
