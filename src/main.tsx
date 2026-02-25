import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./theme.css";
import "./index.css";

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