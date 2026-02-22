import { useEffect, useMemo, useState } from "react";

import DashboardScreen from "./components/DashboardScreen";
import InventoryScreen from "./components/InventoryScreen";
import LocationsInventoryScreen from "./components/LocationsInventoryScreen";
import CategoryManager from "./components/CategoryManager";
import SettingsScreen from "./components/SettingsScreen";

import {
  ensureDefaults,
  loadUsers,
  loadSession,
  setCurrentUser,
  currentUser,
  isUnlocked,
  type Role,
} from "./lib/authStore";

type Tab = "dashboard" | "inventory" | "locations" | "categories" | "settings";

function roleLabel(r: Role) {
  if (r === "admin") return "Admin";
  if (r === "stock") return "Stock";
  if (r === "invoicing") return "Invoicing";
  return "Viewer";
}

function GearIcon({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z" stroke="currentColor" strokeWidth="2" />
      <path
        d="M19.4 13.5a7.9 7.9 0 0 0 .1-1.5c0-.5 0-1-.1-1.5l2-1.6-2-3.4-2.5 1a8.2 8.2 0 0 0-2.6-1.5l-.4-2.7H10l-.4 2.7a8.2 8.2 0 0 0-2.6 1.5l-2.5-1-2 3.4 2 1.6c-.1.5-.1 1-.1 1.5s0 1 .1 1.5l-2 1.6 2 3.4 2.5-1a8.2 8.2 0 0 0 2.6 1.5l.4 2.7h4l.4-2.7a8.2 8.2 0 0 0 2.6-1.5l2.5 1 2-3.4-2-1.6Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function App() {
  const [tab, setTab] = useState<Tab>("dashboard");
  const [tick, setTick] = useState(0);

  // Ensure defaults exist (users/session/security settings)
  useEffect(() => {
    ensureDefaults();
  }, []);

  // Re-render periodically so lock status updates without user interaction
  useEffect(() => {
    const t = setInterval(() => setTick((x) => x + 1), 1200);
    return () => clearInterval(t);
  }, []);

  const users = useMemo(() => loadUsers(), [tick]);
  const session = useMemo(() => loadSession(), [tick]);
  const me = useMemo(() => currentUser(), [tick]);
  const unlocked = isUnlocked();

  // Nav button styling (uses your global theme.css variables)
  const navBtn = (active: boolean): React.CSSProperties => ({
    padding: "10px 12px",
    borderRadius: 14,
    border: "1px solid var(--border2)",
    background: active ? "var(--panel2)" : "var(--panel)",
    color: "var(--text)",
    fontWeight: 900,
    cursor: "pointer",
  });

  const statusPill: React.CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    padding: "6px 10px",
    borderRadius: 999,
    border: "1px solid var(--border2)",
    background: "var(--panel2)",
    fontWeight: 900,
    fontSize: 12,
  };

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", color: "var(--text)" }}>
      {/* Top bar */}
      <div
        style={{
          position: "sticky",
          top: 0,
          zIndex: 50,
          background: "color-mix(in srgb, var(--bg) 92%, transparent)",
          backdropFilter: "blur(10px)",
          borderBottom: "1px solid var(--border)",
        }}
      >
        <div style={{ padding: 12, display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          <div style={{ fontWeight: 1000, marginRight: 6 }}>Loadout</div>

          <button style={navBtn(tab === "dashboard")} onClick={() => setTab("dashboard")}>
            Dashboard
          </button>
          <button style={navBtn(tab === "inventory")} onClick={() => setTab("inventory")}>
            Inventory
          </button>
          <button style={navBtn(tab === "locations")} onClick={() => setTab("locations")}>
            Locations
          </button>
          <button style={navBtn(tab === "categories")} onClick={() => setTab("categories")}>
            Categories
          </button>

          <div style={{ marginLeft: "auto", display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
            {/* Current user status */}
            <div style={statusPill}>
              {me ? (
                <>
                  <span>{me.name}</span>
                  <span style={{ opacity: 0.7 }}>•</span>
                  <span style={{ opacity: 0.85 }}>{roleLabel(me.role)}</span>
                  <span style={{ opacity: 0.7 }}>•</span>
                  {unlocked ? (
                    <span style={{ color: "var(--accent)" }}>Unlocked</span>
                  ) : (
                    <span style={{ color: "var(--warn)" }}>Locked</span>
                  )}
                </>
              ) : (
                <span style={{ opacity: 0.85 }}>No user</span>
              )}
            </div>

            {/* Quick user switch (optional but handy) */}
            <select
              value={session.currentUserId || ""}
              onChange={(e) => {
                setCurrentUser(e.target.value);
                setTick((x) => x + 1);
              }}
              style={{
                borderRadius: 14,
                border: "1px solid var(--border2)",
                background: "var(--panel2)",
                color: "var(--text)",
                padding: "10px 12px",
                fontWeight: 900,
              }}
              title="Switch user"
            >
              {users
                .filter((u) => u.isActive)
                .map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name} ({roleLabel(u.role)})
                  </option>
                ))}
            </select>

            {/* Settings */}
            <button
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 10,
                padding: "10px 14px",
                borderRadius: 14,
                border: "1px solid var(--border2)",
                background: tab === "settings" ? "var(--panel2)" : "var(--panel)",
                color: "var(--text)",
                fontWeight: 1000,
                cursor: "pointer",
              }}
              onClick={() => setTab("settings")}
              title="Settings"
            >
              <GearIcon />
              Settings
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div style={{ padding: 10 }}>
        {tab === "dashboard" && <DashboardScreen />}
        {tab === "inventory" && <InventoryScreen />}
        {tab === "locations" && <LocationsInventoryScreen />}
        {tab === "categories" && <CategoryManager />}
        {tab === "settings" && <SettingsScreen />}
      </div>

      {/* Footer */}
      <div style={{ padding: 14, textAlign: "center", opacity: 0.65, fontSize: 12 }}>
        Inventory App • Local-first • Works offline (this device)
      </div>
    </div>
  );
}