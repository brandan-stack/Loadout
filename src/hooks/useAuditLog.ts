import { useEffect, useState } from "react";

export type AuditAction =
  | "ADD_ITEM"
  | "DELETE_ITEM"
  | "EDIT_ITEM"
  | "ADJUST_QTY"
  | "MOVE_QTY"
  | "ADD_TO_LOCATION";

export type UndoPayload = { kind: "RESTORE_KEYS"; keys: Record<string, string | null> };

export type AuditEntry = {
  id: string;
  ts: number;
  user: string;
  action: AuditAction;
  itemId?: string;
  itemName?: string;
  partNumber?: string;
  manufacturer?: string;
  modelNumber?: string;
  serialNumber?: string;
  qty?: number;
  qtyBefore?: number;
  qtyAfter?: number;
  fromLocation?: string;
  toLocation?: string;
  note?: string;
  undo?: UndoPayload;
};

const KEY = "audit.log.v1";
const REDO_KEY = "audit.redo.v1";

function newId() {
  return crypto.randomUUID();
}

function safeLoad(storageKey: string): AuditEntry[] {
  try {
    const raw = localStorage.getItem(storageKey);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as AuditEntry[]) : [];
  } catch {
    return [];
  }
}

function safeSave(storageKey: string, value: unknown) {
  try {
    localStorage.setItem(storageKey, JSON.stringify(value));
  } catch {
    void 0;
  }
}

function snapshotKeys(keys: string[]) {
  const out: Record<string, string | null> = {};
  keys.forEach((k) => (out[k] = localStorage.getItem(k)));
  return out;
}

function restoreKeys(map: Record<string, string | null>) {
  Object.entries(map).forEach(([k, v]) => {
    if (v === null) localStorage.removeItem(k);
    else localStorage.setItem(k, v);
  });
}

export function useAuditLog() {
  const [entries, setEntries] = useState<AuditEntry[]>(() => safeLoad(KEY));
  const [redoStack, setRedoStack] = useState<AuditEntry[]>(() => safeLoad(REDO_KEY));

  useEffect(() => safeSave(KEY, entries), [entries]);
  useEffect(() => safeSave(REDO_KEY, redoStack), [redoStack]);

  return {
    entries,
    redoStack,

    makeUndo(keysToSnapshot: string[]): UndoPayload {
      return { kind: "RESTORE_KEYS", keys: snapshotKeys(keysToSnapshot) };
    },

    addEntry(partial: Omit<AuditEntry, "id" | "ts"> & { ts?: number }) {
      const entry: AuditEntry = {
        id: newId(),
        ts: typeof partial.ts === "number" ? partial.ts : Date.now(),
        ...partial,
      };
      setEntries((prev) => [entry, ...prev].slice(0, 2000));
      setRedoStack([]); // new action clears redo
      return entry.id;
    },

    undoLast() {
      const last = entries[0];
      if (!last?.undo) return false;

      const keys = Object.keys(last.undo.keys);
      const redoUndo: UndoPayload = { kind: "RESTORE_KEYS", keys: snapshotKeys(keys) };

      restoreKeys(last.undo.keys);

      setEntries((prev) => prev.slice(1));
      setRedoStack((prev) => [{ ...last, undo: redoUndo }, ...prev].slice(0, 2000));

      window.location.reload();
      return true;
    },

    redoLast() {
      const lastRedo = redoStack[0];
      if (!lastRedo?.undo) return false;

      const keys = Object.keys(lastRedo.undo.keys);
      const undoAgain: UndoPayload = { kind: "RESTORE_KEYS", keys: snapshotKeys(keys) };

      restoreKeys(lastRedo.undo.keys);

      setRedoStack((prev) => prev.slice(1));
      setEntries((prev) => [{ ...lastRedo, undo: undoAgain, ts: Date.now() }, ...prev].slice(0, 2000));

      window.location.reload();
      return true;
    },
  };
}