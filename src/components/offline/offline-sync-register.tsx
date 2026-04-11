"use client";

import { useEffect } from "react";
import { flushOfflineQueue } from "@/lib/offline-queue";

export function OfflineSyncRegister() {
  useEffect(() => {
    const syncQueuedWork = () => {
      void flushOfflineQueue();
    };

    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        syncQueuedWork();
      }
    };

    if ("serviceWorker" in navigator) {
      void navigator.serviceWorker.register("/loadout-sw.js").catch(() => undefined);
    }

    window.addEventListener("online", syncQueuedWork);
    document.addEventListener("visibilitychange", handleVisibility);
    syncQueuedWork();

    return () => {
      window.removeEventListener("online", syncQueuedWork);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, []);

  return null;
}
