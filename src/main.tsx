import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./theme.css";
import "./index.css";
import { runUpgradeDataGuard } from "./lib/upgradeDataGuard";
import { startAutoPdfBackupSync } from "./lib/pdfBackup";
import { startLiveCloudSync } from "./lib/liveCloudSync";

declare const __APP_VERSION__: string;

runUpgradeDataGuard(__APP_VERSION__);
startAutoPdfBackupSync(__APP_VERSION__);
try {
  startLiveCloudSync(__APP_VERSION__);
} catch (error) {
  console.error("[Loadout Sync] Startup skipped after error:", error);
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// Disable stale service workers to ensure latest auth gate logic is always loaded
if ("serviceWorker" in navigator) {
  navigator.serviceWorker.getRegistrations().then((registrations) => {
    registrations.forEach((registration) => {
      registration.unregister();
    });

    if ("caches" in window) {
      caches.keys().then((cacheKeys) => {
        cacheKeys
          .filter((key) => key.includes("loadout"))
          .forEach((key) => {
            caches.delete(key);
          });
      });
    }
  }).catch((err) => {
    console.log("Service Worker cleanup failed:", err);
  });
}