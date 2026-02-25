import { jsPDF } from "jspdf";
import { captureProtectedStorageEntries, PROTECTED_KEYS } from "./upgradeDataGuard";

type BackupStatus = {
  enabled: boolean;
  hasFileHandle: boolean;
  lastSyncedAt: number;
  lastHash: string;
  lastError: string;
};

const ENABLED_KEY = "loadout.pdfBackup.enabled.v1";
const LAST_HASH_KEY = "loadout.pdfBackup.lastHash.v1";
const LAST_SYNC_KEY = "loadout.pdfBackup.lastSyncAt.v1";
const LAST_ERROR_KEY = "loadout.pdfBackup.lastError.v1";
const DB_NAME = "loadoutPdfBackupDb";
const STORE_NAME = "handles";
const HANDLE_ID = "backup-file";
const DEFAULT_FILE_NAME = "loadout-backup-latest.pdf";
const AUTO_SYNC_MS = 30 * 60 * 1000;
const BACKUP_MARKER_BEGIN = "LOADOUT_BACKUP_B64_BEGIN";
const BACKUP_MARKER_END = "LOADOUT_BACKUP_B64_END";

let syncTimerId: number | null = null;
let running = false;

function canUseStorage() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function getStoredBool(key: string) {
  if (!canUseStorage()) return false;
  return window.localStorage.getItem(key) === "1";
}

function setStoredBool(key: string, value: boolean) {
  if (!canUseStorage()) return;
  window.localStorage.setItem(key, value ? "1" : "0");
}

function getStoredString(key: string) {
  if (!canUseStorage()) return "";
  return window.localStorage.getItem(key) ?? "";
}

function setStoredString(key: string, value: string) {
  if (!canUseStorage()) return;
  window.localStorage.setItem(key, value || "");
}

function getStoredNumber(key: string) {
  const v = Number(getStoredString(key) || 0);
  return Number.isFinite(v) ? v : 0;
}

function setStoredNumber(key: string, value: number) {
  setStoredString(key, String(Number.isFinite(value) ? value : 0));
}

function stableHash(input: string) {
  let hash = 2166136261;
  for (let index = 0; index < input.length; index++) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16);
}

function snapshotPayload(appVersion: string) {
  const entries = captureProtectedStorageEntries();
  const keySummaries = Object.entries(entries)
    .sort(([keyA], [keyB]) => keyA.localeCompare(keyB))
    .map(([key, raw]) => {
      let summary = "text";
      let count = 0;
      try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          summary = "array";
          count = parsed.length;
        } else if (parsed && typeof parsed === "object") {
          summary = "object";
          count = Object.keys(parsed as Record<string, unknown>).length;
        } else {
          summary = typeof parsed;
        }
      } catch {
        summary = "text";
      }
      return {
        key,
        sizeBytes: raw.length,
        summary,
        count,
      };
    });

  const normalized = JSON.stringify(entries, Object.keys(entries).sort());
  const hash = stableHash(normalized);

  return {
    appVersion,
    generatedAt: Date.now(),
    protectedKeysExpected: PROTECTED_KEYS.length,
    protectedKeysSaved: Object.keys(entries).length,
    hash,
    keySummaries,
    entries,
  };
}

function toBase64Utf8(value: string) {
  return btoa(unescape(encodeURIComponent(value)));
}

function fromBase64Utf8(value: string) {
  return decodeURIComponent(escape(atob(value)));
}

function addWrappedText(doc: jsPDF, text: string, x: number, y: number, maxWidth: number, lineHeight = 6) {
  const lines = doc.splitTextToSize(text, maxWidth) as string[];
  let curY = y;
  for (const line of lines) {
    if (curY > 285) {
      doc.addPage();
      curY = 16;
    }
    doc.text(line, x, curY);
    curY += lineHeight;
  }
  return curY;
}

function buildPdfBlob(appVersion: string) {
  const payload = snapshotPayload(appVersion);
  const payloadB64 = toBase64Utf8(JSON.stringify(payload.entries));
  const doc = new jsPDF({ unit: "mm", format: "a4" });

  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text("Loadout Data Backup", 14, 16);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);

  let y = 24;
  y = addWrappedText(doc, `Generated: ${new Date(payload.generatedAt).toLocaleString()}`, 14, y, 182);
  y = addWrappedText(doc, `App Version: ${payload.appVersion || "unknown"}`, 14, y, 182);
  y = addWrappedText(doc, `Data Hash: ${payload.hash}`, 14, y, 182);
  y = addWrappedText(doc, `Protected Keys Saved: ${payload.protectedKeysSaved}/${payload.protectedKeysExpected}`, 14, y, 182);

  y += 3;
  doc.setFont("helvetica", "bold");
  doc.text("Key Summary", 14, y);
  y += 6;

  doc.setFont("helvetica", "normal");
  for (const row of payload.keySummaries) {
    const line = `${row.key} | ${row.summary}${row.count ? ` (${row.count})` : ""} | ${row.sizeBytes} bytes`;
    y = addWrappedText(doc, line, 14, y, 182);
  }

  y += 3;
  doc.setFont("helvetica", "bold");
  doc.text("Raw Storage Snapshot", 14, y);
  y += 6;

  doc.setFont("courier", "normal");
  doc.setFontSize(8);
  y = addWrappedText(doc, JSON.stringify(payload.entries, null, 2), 14, y, 182, 4);

  y += 4;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  y = addWrappedText(doc, "Backup Restore Marker", 14, y, 182);
  doc.setFont("courier", "normal");
  doc.setFontSize(7);
  y = addWrappedText(doc, BACKUP_MARKER_BEGIN, 14, y, 182, 4);
  y = addWrappedText(doc, payloadB64, 14, y, 182, 4);
  addWrappedText(doc, BACKUP_MARKER_END, 14, y, 182, 4);

  return {
    blob: doc.output("blob"),
    hash: payload.hash,
    generatedAt: payload.generatedAt,
  };
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("Failed to open IndexedDB"));
  });
}

async function saveHandle(handle: FileSystemFileHandle) {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).put(handle, HANDLE_ID);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error("Failed to save file handle"));
  });
  db.close();
}

async function loadHandle(): Promise<FileSystemFileHandle | null> {
  const db = await openDb();
  const handle = await new Promise<FileSystemFileHandle | null>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const req = tx.objectStore(STORE_NAME).get(HANDLE_ID);
    req.onsuccess = () => resolve((req.result as FileSystemFileHandle | undefined) ?? null);
    req.onerror = () => reject(req.error ?? new Error("Failed to load file handle"));
  });
  db.close();
  return handle;
}

async function clearHandle() {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).delete(HANDLE_ID);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error("Failed to clear file handle"));
  });
  db.close();
}

async function canWriteHandle(handle: FileSystemFileHandle) {
  const permissionApi = handle as FileSystemFileHandle & {
    queryPermission?: (opts: { mode: "readwrite" }) => Promise<"granted" | "denied" | "prompt">;
    requestPermission?: (opts: { mode: "readwrite" }) => Promise<"granted" | "denied" | "prompt">;
  };

  const permission = permissionApi.queryPermission
    ? await permissionApi.queryPermission({ mode: "readwrite" })
    : "prompt";
  if (permission === "granted") return true;
  if (!permissionApi.requestPermission) return false;
  const requested = await permissionApi.requestPermission({ mode: "readwrite" });
  return requested === "granted";
}

async function writeBlobToHandle(handle: FileSystemFileHandle, blob: Blob) {
  const writable = await handle.createWritable();
  await writable.write(blob);
  await writable.close();
}

function supportsFileSystemSaveApi() {
  return typeof window !== "undefined" && "showSaveFilePicker" in window;
}

export async function downloadBackupPdfNow(appVersion: string) {
  const { blob, hash, generatedAt } = buildPdfBlob(appVersion);
  downloadBlob(blob, DEFAULT_FILE_NAME);
  setStoredString(LAST_HASH_KEY, hash);
  setStoredNumber(LAST_SYNC_KEY, generatedAt);
  setStoredString(LAST_ERROR_KEY, "");
}

function parseEntriesFromPdfText(rawText: string): Record<string, string> {
  const beginIndex = rawText.indexOf(BACKUP_MARKER_BEGIN);
  const endIndex = rawText.indexOf(BACKUP_MARKER_END);

  if (beginIndex >= 0 && endIndex > beginIndex) {
    const encoded = rawText
      .slice(beginIndex + BACKUP_MARKER_BEGIN.length, endIndex)
      .replace(/[^A-Za-z0-9+/=]/g, "");
    if (encoded) {
      const decoded = fromBase64Utf8(encoded);
      const parsed = JSON.parse(decoded) as Record<string, string>;
      if (parsed && typeof parsed === "object") return parsed;
    }
  }

  const firstBrace = rawText.indexOf("{");
  const lastBrace = rawText.lastIndexOf("}");
  if (firstBrace >= 0 && lastBrace > firstBrace) {
    const candidate = rawText.slice(firstBrace, lastBrace + 1);
    const parsed = JSON.parse(candidate) as Record<string, string>;
    if (parsed && typeof parsed === "object") return parsed;
  }

  throw new Error("Could not find a valid Loadout backup payload in this PDF.");
}

function normalizeBackupEntries(entries: Record<string, string>) {
  const out: Record<string, string> = {};
  for (const key of PROTECTED_KEYS) {
    const raw = entries[key];
    if (typeof raw !== "string") continue;
    out[key] = raw;
  }
  return out;
}

function restoreEntries(entries: Record<string, string>) {
  const normalized = normalizeBackupEntries(entries);
  let restored = 0;
  for (const [key, value] of Object.entries(normalized)) {
    window.localStorage.setItem(key, value);
    restored += 1;
  }
  return restored;
}

export async function importBackupPdf(file: File) {
  if (!file) throw new Error("No file selected.");

  const buf = await file.arrayBuffer();
  const text = new TextDecoder("latin1").decode(new Uint8Array(buf));

  const entries = parseEntriesFromPdfText(text);
  const restoredCount = restoreEntries(entries);
  if (!restoredCount) {
    throw new Error("Backup loaded but no protected keys were found.");
  }

  const normalized = JSON.stringify(normalizeBackupEntries(entries), Object.keys(normalizeBackupEntries(entries)).sort());
  const hash = stableHash(normalized);
  setStoredString(LAST_HASH_KEY, hash);
  setStoredNumber(LAST_SYNC_KEY, Date.now());
  setStoredString(LAST_ERROR_KEY, "");
  return { restoredCount };
}

export async function enableAutoPdfBackup(appVersion: string) {
  if (!supportsFileSystemSaveApi()) {
    throw new Error("This browser does not support overwrite-capable auto PDF backup.");
  }

  const picker = window.showSaveFilePicker as (options: SaveFilePickerOptions) => Promise<FileSystemFileHandle>;
  const handle = await picker({
    suggestedName: DEFAULT_FILE_NAME,
    types: [{ description: "PDF", accept: { "application/pdf": [".pdf"] } }],
  });

  await saveHandle(handle);
  setStoredBool(ENABLED_KEY, true);
  setStoredString(LAST_ERROR_KEY, "");
  await runAutoPdfBackupNow(appVersion, true);
}

export async function disableAutoPdfBackup() {
  setStoredBool(ENABLED_KEY, false);
  setStoredString(LAST_ERROR_KEY, "");
}

export async function runAutoPdfBackupNow(appVersion: string, force = false) {
  if (running) return;
  running = true;

  try {
    if (!getStoredBool(ENABLED_KEY)) return;

    const { blob, hash, generatedAt } = buildPdfBlob(appVersion);
    const lastHash = getStoredString(LAST_HASH_KEY);
    if (!force && lastHash && lastHash === hash) {
      setStoredString(LAST_ERROR_KEY, "");
      return;
    }

    const handle = await loadHandle();
    if (!handle) {
      setStoredString(LAST_ERROR_KEY, "Auto backup file handle missing. Re-enable Auto PDF Sync.");
      setStoredBool(ENABLED_KEY, false);
      return;
    }

    const permitted = await canWriteHandle(handle);
    if (!permitted) {
      setStoredString(LAST_ERROR_KEY, "Auto backup write permission was denied.");
      setStoredBool(ENABLED_KEY, false);
      return;
    }

    await writeBlobToHandle(handle, blob);
    setStoredString(LAST_HASH_KEY, hash);
    setStoredNumber(LAST_SYNC_KEY, generatedAt);
    setStoredString(LAST_ERROR_KEY, "");
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    setStoredString(LAST_ERROR_KEY, message || "Auto backup failed.");
  } finally {
    running = false;
  }
}

export function getPdfBackupStatus(): BackupStatus {
  return {
    enabled: getStoredBool(ENABLED_KEY),
    hasFileHandle: false,
    lastSyncedAt: getStoredNumber(LAST_SYNC_KEY),
    lastHash: getStoredString(LAST_HASH_KEY),
    lastError: getStoredString(LAST_ERROR_KEY),
  };
}

export async function refreshPdfBackupStatus(): Promise<BackupStatus> {
  let hasFileHandle = false;
  try {
    hasFileHandle = !!(await loadHandle());
  } catch {
    hasFileHandle = false;
  }
  const status = getPdfBackupStatus();
  return {
    ...status,
    hasFileHandle,
  };
}

export function startAutoPdfBackupSync(appVersion: string) {
  if (syncTimerId !== null || typeof window === "undefined") return;

  void runAutoPdfBackupNow(appVersion, false);
  syncTimerId = window.setInterval(() => {
    void runAutoPdfBackupNow(appVersion, false);
  }, AUTO_SYNC_MS);
}

export async function resetAutoPdfBackupState() {
  await clearHandle();
  setStoredBool(ENABLED_KEY, false);
  setStoredString(LAST_ERROR_KEY, "");
}

declare global {
  interface Window {
    showSaveFilePicker?: (options?: SaveFilePickerOptions) => Promise<FileSystemFileHandle>;
  }

  interface SaveFilePickerOptions {
    suggestedName?: string;
    types?: Array<{
      description?: string;
      accept: Record<string, string[]>;
    }>;
  }
}
