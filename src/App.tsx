import { useEffect, useReducer, useState } from "react";

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

ensureDefaults();
lockNow();

type Tab = "dashboard" | "inventory" | "management" | "settings";

function isTab(value: string | null): value is Tab {
  return value === "dashboard" || value === "inventory" || value === "management" || value === "settings";
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
  const [tab, setTab] = useState<Tab>(() => {
    const saved = typeof window !== "undefined" ? window.localStorage.getItem("loadout.activeTab") : null;
    return isTab(saved) ? saved : "dashboard";
  });
  const [, refresh] = useReducer((value: number) => value + 1, 0);
  const [pin, setPin] = useState("");
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const tabLabel =
    tab === "dashboard"
      ? "Dashboard"
      : tab === "inventory"
      ? "Inventory"
      : tab === "management"
      ? "Management"
      : "Settings";

  const setActiveTab = (nextTab: Tab) => {
    setTab(nextTab);
    setMobileNavOpen(false);
  };

  useEffect(() => {
    const id = window.setInterval(() => {
      refresh();
    }, 15_000);

    return () => window.clearInterval(id);
  }, []);

  const users = loadUsers().filter((u) => u.isActive);
  const session = loadSession();
  const me = currentUser();
  const unlocked = isUnlocked();

  useEffect(() => {
    const onResize = () => {
      if (window.innerWidth > 980) {
        setMobileNavOpen(false);
      }
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => {
    window.localStorage.setItem("loadout.activeTab", tab);
  }, [tab]);

  useEffect(() => {
    if (!mobileNavOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setMobileNavOpen(false);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [mobileNavOpen]);

  if (!unlocked) {
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
                  refresh();
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
                refresh();
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
                refresh();
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

          <div className="appDesktopNav">
            <div className="appNavGroup">
              <button
                className={"appNavBtn " + (tab === "dashboard" ? "active" : "")}
                onClick={() => setActiveTab("dashboard")}
              >
                Dashboard
              </button>
              <button
                className={"appNavBtn " + (tab === "inventory" ? "active" : "")}
                onClick={() => setActiveTab("inventory")}
              >
                Inventory
              </button>
              <button
                className={"appNavBtn " + (tab === "management" ? "active" : "")}
                onClick={() => setActiveTab("management")}
              >
                Management
              </button>
            </div>

            <div className="appTopbarRight">
              <button
                className={"appNavBtn appSettingsBtn " + (tab === "settings" ? "active" : "")}
                onClick={() => setActiveTab("settings")}
                title="Settings"
              >
                <GearIcon />
                Settings
              </button>
            </div>
          </div>

          <div className="appMobileNav">
            <button
              className={"appNavBtn appMobileNavToggle " + (mobileNavOpen ? "active" : "")}
              type="button"
              aria-expanded={mobileNavOpen}
              aria-controls="mobile-main-nav"
              onClick={() => setMobileNavOpen((open) => !open)}
            >
              <span>{tabLabel}</span>
              <span>{mobileNavOpen ? "Close" : "Menu"}</span>
            </button>

            <div
              id="mobile-main-nav"
              className={"appMobileNavMenu " + (mobileNavOpen ? "open" : "")}
            >
              <button
                className={"appNavBtn " + (tab === "dashboard" ? "active" : "")}
                onClick={() => setActiveTab("dashboard")}
              >
                Dashboard
              </button>
              <button
                className={"appNavBtn " + (tab === "inventory" ? "active" : "")}
                onClick={() => setActiveTab("inventory")}
              >
                Inventory
              </button>
              <button
                className={"appNavBtn " + (tab === "management" ? "active" : "")}
                onClick={() => setActiveTab("management")}
              >
                Management
              </button>
              <button
                className={"appNavBtn appSettingsBtn " + (tab === "settings" ? "active" : "")}
                onClick={() => setActiveTab("settings")}
                title="Settings"
              >
                <GearIcon />
                Settings
              </button>
            </div>
          </div>
        </div>
      </div>

      <button
        type="button"
        className={"appMobileNavBackdrop " + (mobileNavOpen ? "open" : "")}
        aria-label="Close navigation menu"
        onClick={() => setMobileNavOpen(false)}
      />

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