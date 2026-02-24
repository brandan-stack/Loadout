import { useEffect, useMemo, useState } from "react";

import DashboardScreen from "./components/DashboardScreen";
import InventoryScreen from "./components/InventoryScreen";
import ManagementScreen from "./components/ManagementScreen";
import SettingsScreen from "./components/SettingsScreen";

import {
  ensureDefaults,
  loadUsers,
  loadSession,
  setCurrentUser,
  currentUser,
  isUnlocked,
  unlockWithPin,
  lockNow,
} from "./lib/authStore";

type Tab = "dashboard" | "inventory" | "management" | "settings";

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
  const [pin, setPin] = useState("");
  const [bootReady, setBootReady] = useState(false);

  // Ensure defaults exist (users/session/security settings)
  useEffect(() => {
    ensureDefaults();
    lockNow();
    setTick((x) => x + 1);
    setBootReady(true);

    const id = window.setInterval(() => {
      setTick((x) => x + 1);
    }, 15_000);

    return () => window.clearInterval(id);
  }, []);

  const users = useMemo(() => loadUsers().filter((u) => u.isActive), [tick]);
  const session = useMemo(() => loadSession(), [tick]);
  const me = useMemo(() => currentUser(), [tick]);
  const unlocked = isUnlocked();

  if (!bootReady || !unlocked) {
    return (
      <div className="appShell appGateShell">
        <div className="appGateCard cardSoft">
          <div className="appBrand">Loadout</div>
          <div className="muted">Enter your password (PIN) to continue.</div>

          <div className="settingsUserCards appGateUsers">
            {users.map((u) => (
              <button
                key={u.id}
                className={"btn settingsUserCard" + (u.id === session.currentUserId ? " selected" : "")}
                style={{ justifyContent: "space-between" }}
                onClick={() => {
                  setCurrentUser(u.id);
                  setPin("");
                  setTick((x) => x + 1);
                }}
              >
                <span style={{ display: "grid" }}>
                  <span style={{ fontWeight: 1000 }}>{u.name}</span>
                  <span className="muted" style={{ fontSize: 12 }}>{u.role}</span>
                </span>
                <span className="pill">{u.id === session.currentUserId ? "Selected" : "Select"}</span>
              </button>
            ))}
          </div>

          <div className="appGateUnlockRow">
            <input
              className="input"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              onKeyDown={(e) => {
                if (e.key !== "Enter") return;
                const ok = unlockWithPin(pin || "", undefined);
                setPin("");
                setTick((x) => x + 1);
                if (!ok) alert("Wrong password (PIN).");
              }}
              placeholder="Password / PIN"
              inputMode="numeric"
            />
            <button
              className="btn primary"
              type="button"
              onClick={() => {
                const ok = unlockWithPin(pin || "", undefined);
                setPin("");
                setTick((x) => x + 1);
                if (!ok) alert("Wrong password (PIN).");
              }}
            >
              Enter Site
            </button>
          </div>

          <div className="muted appGateHint">
            {me?.pin ? "Use the selected user PIN from Settings." : "Selected user has no PIN set. Select a user with a PIN."}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="appShell">
      {/* Top bar */}
      <div className="appTopbar">
        <div className="appTopbarInner">
          <div className="appBrand">Loadout</div>

          <div className="appNavGroup">
            <button
              className={"appNavBtn " + (tab === "dashboard" ? "active" : "")}
              onClick={() => setTab("dashboard")}
            >
              Dashboard
            </button>
            <button
              className={"appNavBtn " + (tab === "inventory" ? "active" : "")}
              onClick={() => setTab("inventory")}
            >
              Inventory
            </button>
            <button
              className={"appNavBtn " + (tab === "management" ? "active" : "")}
              onClick={() => setTab("management")}
            >
              Management
            </button>
          </div>

          <div className="appTopbarRight">
            <button
              className={"appNavBtn appSettingsBtn " + (tab === "settings" ? "active" : "")}
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
      <div className="appContent">
        {tab === "dashboard" && <DashboardScreen />}
        {tab === "inventory" && <InventoryScreen />}
        {tab === "management" && <ManagementScreen />}
        {tab === "settings" && <SettingsScreen />}
      </div>

      {/* Footer */}
      <div className="appFooter">
        Inventory App • Local-first • Works offline (this device)
      </div>
    </div>
  );
}