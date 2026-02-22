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

// Register service worker for PWA functionality
if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("/service-worker.js").catch((err) => {
    console.log("Service Worker registration failed:", err);
  });
}