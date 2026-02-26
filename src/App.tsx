import { useEffect, useReducer, useState } from "react";

import DashboardScreen from "./components/DashboardScreen";
import InventoryScreen from "./components/InventoryScreen";
import ManagementScreen from "./components/ManagementScreen";
import PartsUsedScreen from "./components/PartsUsedScreen";
import SettingsScreen from "./components/SettingsScreen";
import ToolSignoutScreen from "./components/ToolSignoutScreen";

import {
  ensureDefaults,
  loadUsers,
  loadSession,
  setCurrentUser,
  currentUser,
  isUnlocked,
  unlockWithPin,
  lockNow,
  isDeviceRemembered,
  loadRememberDevicePreference,
  saveRememberDevicePreference,
  canAccessPartsUsed,
  canAccessToolSignout,
  canManageToolSignout,
  canReceiveLowStockAlerts,
} from "./lib/authStore";
import { getUnreadCountForUser } from "./lib/jobNotificationsStore";
import { getToolAlertsForUser } from "./lib/toolSignoutStore";
import { readLiveCloudSyncStatus, requestLiveCloudSyncNow, type LiveCloudSyncStatus } from "./lib/liveCloudSync";

declare const __APP_VERSION__: string;

ensureDefaults();
if (!isDeviceRemembered()) {
  lockNow();
}

const APP_VERSION = __APP_VERSION__;

type Tab = "dashboard" | "inventory" | "management" | "partsUsed" | "toolSignout" | "settings";

type StoredStockRow = { quantity?: number };
type StoredInventoryItem = { lowStock?: number; stockByLocation?: StoredStockRow[] };

function getLowStockCountFromStorage() {
  try {
    const raw = window.localStorage.getItem("inventory.items.v2");
    if (!raw) return 0;
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return 0;
    return (parsed as StoredInventoryItem[]).filter((item) => {
      if (typeof item.lowStock !== "number" || item.lowStock <= 0) return false;
      const total = (item.stockByLocation ?? []).reduce((sum, row) => sum + (Number(row.quantity) || 0), 0);
      return total <= item.lowStock;
    }).length;
  } catch {
    return 0;
  }
}

function isTab(value: string | null): value is Tab {
  return value === "dashboard" || value === "inventory" || value === "management" || value === "partsUsed" || value === "toolSignout" || value === "settings";
}

function fmt(ts: number) {
  try {
    return new Date(ts).toLocaleString();
  } catch {
    return String(ts);
  }
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
  const [rememberDevice, setRememberDevice] = useState<boolean>(() => loadRememberDevicePreference());
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [gateFeedback, setGateFeedback] = useState<string>("");
  const [syncStatus, setSyncStatus] = useState<LiveCloudSyncStatus>(() => readLiveCloudSyncStatus());
  const [syncPanelOpen, setSyncPanelOpen] = useState(false);

  const users = loadUsers().filter((u) => u.isActive);
  const session = loadSession();
  const me = currentUser();
  const unlocked = isUnlocked();
  const mePendingCount = me ? getUnreadCountForUser(me.id) : 0;
  const canOpenToolSignoutTab = !!me && canAccessToolSignout(me);
  const canManageTools = !!me && canManageToolSignout(me);
  const toolPendingCount = me && canOpenToolSignoutTab ? getToolAlertsForUser(me.id, canManageTools) : 0;
  const lowStockCount = typeof window !== "undefined" && canReceiveLowStockAlerts(me) ? getLowStockCountFromStorage() : 0;
  const alertCount = mePendingCount + lowStockCount;
  const canOpenPartsUsedTab = !!me && (canAccessPartsUsed(me) || !!me.receivesJobNotifications);
  const activeTab: Tab =
    tab === "partsUsed" && !canOpenPartsUsedTab
      ? "dashboard"
      : tab === "toolSignout" && !canOpenToolSignoutTab
      ? "dashboard"
      : tab;

  const tabLabel =
    activeTab === "dashboard"
      ? "Dashboard"
      : activeTab === "inventory"
      ? "Inventory"
      : activeTab === "management"
      ? "Management"
      : activeTab === "partsUsed"
      ? "Parts Used"
      : activeTab === "toolSignout"
      ? "Tool Signout"
      : "Settings";

  const setActiveTab = (nextTab: Tab) => {
    if (nextTab === "partsUsed" && !canOpenPartsUsedTab) {
      setTab("dashboard");
    } else if (nextTab === "toolSignout" && !canOpenToolSignoutTab) {
      setTab("dashboard");
    } else {
      setTab(nextTab);
    }
    setMobileNavOpen(false);
  };

  const jumpToRecentPartsUsed = () => {
    setActiveTab("partsUsed");
    window.setTimeout(() => {
      const node = document.getElementById("recent-parts-used");
      if (!node) return;
      node.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 40);
  };

  const jumpToDashboardRestock = () => {
    setActiveTab("dashboard");
    window.setTimeout(() => {
      const node = document.getElementById("dashboard-restock-list");
      if (!node) return;
      node.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 40);
  };

  useEffect(() => {
    const id = window.setInterval(() => {
      refresh();
    }, 15_000);

    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    const onStateChanged = () => refresh();
    window.addEventListener("loadout:state-updated", onStateChanged);
    window.addEventListener("storage", onStateChanged);
    return () => {
      window.removeEventListener("loadout:state-updated", onStateChanged);
      window.removeEventListener("storage", onStateChanged);
    };
  }, []);

  useEffect(() => {
    const updateSyncStatus = () => setSyncStatus(readLiveCloudSyncStatus());
    window.addEventListener("loadout:sync-status", updateSyncStatus);
    window.addEventListener("loadout:state-updated", updateSyncStatus);
    window.addEventListener("storage", updateSyncStatus);
    return () => {
      window.removeEventListener("loadout:sync-status", updateSyncStatus);
      window.removeEventListener("loadout:state-updated", updateSyncStatus);
      window.removeEventListener("storage", updateSyncStatus);
    };
  }, []);

  const syncLabel =
    syncStatus.state === "connected"
      ? "Sync On"
      : syncStatus.state === "connecting"
      ? "Sync…"
      : syncStatus.state === "error"
      ? "Sync Error"
      : "Sync Off";
  const syncTitle =
    syncStatus.state === "connected"
      ? syncStatus.lastSyncAt > 0
        ? `Live sync active. Last sync: ${fmt(syncStatus.lastSyncAt)}`
        : "Live sync active."
      : syncStatus.lastError || "Live sync is disabled.";
  const syncStateText =
    syncStatus.state === "connected"
      ? "Connected"
      : syncStatus.state === "connecting"
      ? "Connecting"
      : syncStatus.state === "error"
      ? "Error"
      : "Disabled";

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
    window.localStorage.setItem("loadout.activeTab", activeTab);
  }, [activeTab]);

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

  useEffect(() => {
    if (!syncPanelOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setSyncPanelOpen(false);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [syncPanelOpen]);

  if (!unlocked) {
    return (
      <div className="appShell appGateShell">
        <div className="appGateCard cardSoft">
          <div className="appBrand">Loadout</div>
          <div className="muted">Enter your password / PIN to continue.</div>

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
                const ok = unlockWithPin(pin || "", undefined, rememberDevice);
                setPin("");
                refresh();
                if (!ok) setGateFeedback("Wrong password / PIN. Try again.");
                else setGateFeedback("");
              }}
              placeholder="password / PIN"
              inputMode="numeric"
            />
            <button
              className="btn primary"
              type="button"
              onClick={() => {
                const ok = unlockWithPin(pin || "", undefined, rememberDevice);
                setPin("");
                refresh();
                if (!ok) setGateFeedback("Wrong password / PIN. Try again.");
                else setGateFeedback("");
              }}
            >
              Enter Site
            </button>
          </div>

          <label className="appGateRemember">
            <input
              type="checkbox"
              checked={rememberDevice}
              onChange={(e) => {
                const checked = e.target.checked;
                setRememberDevice(checked);
                saveRememberDevicePreference(checked);
              }}
            />
            Remember this device
          </label>

          <div className="muted appGateHint">
            {me?.pin ? "Use the selected user password / PIN from Settings." : "Selected user has no PIN set. Select a user with a PIN."}
          </div>

          {gateFeedback ? (
            <div className="bannerFeedback bannerFeedback--error" role="status" aria-live="polite">
              {gateFeedback}
            </div>
          ) : null}

          <div className="muted" style={{ marginTop: 8, fontSize: 12 }}>
            v{APP_VERSION}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="appShell">
      <div className="appTopbar">
        <div className="appTopbarInner">
          <div className="appBrand">Loadout</div>

          <div className="appDesktopNav">
            <div className="appNavGroup">
              <button className={"appNavBtn " + (activeTab === "inventory" ? "active" : "")} onClick={() => setActiveTab("inventory")}>
                Inventory
              </button>
              <button className={"appNavBtn " + (activeTab === "management" ? "active" : "")} onClick={() => setActiveTab("management")}>
                Management
              </button>
              {canOpenPartsUsedTab ? (
                <button className={"appNavBtn " + (activeTab === "partsUsed" ? "active" : "")} onClick={() => setActiveTab("partsUsed")}>
                  Parts Used
                  {mePendingCount > 0 ? <span className="appWarnDot" aria-hidden="true">●</span> : null}
                </button>
              ) : null}
              {canOpenToolSignoutTab ? (
                <button className={"appNavBtn " + (activeTab === "toolSignout" ? "active" : "")} onClick={() => setActiveTab("toolSignout")}>
                  Tool Signout
                  {toolPendingCount > 0 ? <span className="appWarnDot appWarnDotYellow" aria-hidden="true">●</span> : null}
                </button>
              ) : null}
            </div>

            <div className="appTopbarRight">
              <div className="appSignedInPill" title="Signed in user">
                Signed in: {me?.name ?? "None"}
              </div>

              <button
                type="button"
                className={`appSyncPill ${syncStatus.state}`}
                title={syncTitle}
                aria-label="Open sync status details"
                onClick={() => setSyncPanelOpen((open) => !open)}
              >
                <span className={`appSyncDot ${syncStatus.state}`} aria-hidden="true" />
                {syncLabel}
              </button>

              <button
                type="button"
                className={"appStatusPill " + (alertCount > 0 ? "alert" : "")}
                onClick={() => {
                  if (lowStockCount > 0) jumpToDashboardRestock();
                  else if (canOpenPartsUsedTab) jumpToRecentPartsUsed();
                  else setActiveTab("settings");
                }}
                title={lowStockCount > 0 ? `Low-stock alerts: ${lowStockCount}` : canOpenPartsUsedTab ? (mePendingCount > 0 ? "Open Parts Used notifications" : "No new notifications") : "Enable notification access in Settings"}
              >
                Alerts {alertCount}
              </button>

              <button
                type="button"
                className={"appStatusPill " + (activeTab === "dashboard" ? "alert" : "")}
                onClick={() => setActiveTab("dashboard")}
                title="Open Dashboard"
              >
                Dashboard
              </button>

              <button
                className={"appNavBtn appSettingsBtn appIconOnly " + (activeTab === "settings" ? "active" : "")}
                onClick={() => setActiveTab("settings")}
                title="Settings"
                aria-label="Settings"
              >
                <GearIcon />
              </button>
            </div>
          </div>

          <div className="appMobileNav">
            <div className="appMobileTopRow">
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

              <button
                type="button"
                className={`appSyncPill ${syncStatus.state}`}
                title={syncTitle}
                aria-label="Open sync status details"
                onClick={() => setSyncPanelOpen((open) => !open)}
              >
                <span className={`appSyncDot ${syncStatus.state}`} aria-hidden="true" />
                Sync
              </button>
            </div>

            <div id="mobile-main-nav" className={"appMobileNavMenu " + (mobileNavOpen ? "open" : "")}>
              <div className="appMobileUserRow">
                <div className="appSignedInPill" title="Signed in user">
                  Signed in: {me?.name ?? "None"}
                </div>
                <button
                  type="button"
                  className={"appStatusPill " + (alertCount > 0 ? "alert" : "")}
                  onClick={() => {
                    if (lowStockCount > 0) jumpToDashboardRestock();
                    else if (canOpenPartsUsedTab) jumpToRecentPartsUsed();
                    else setActiveTab("settings");
                  }}
                  title={lowStockCount > 0 ? `Low-stock alerts: ${lowStockCount}` : canOpenPartsUsedTab ? (mePendingCount > 0 ? "Open Parts Used notifications" : "No new notifications") : "Enable notification access in Settings"}
                >
                  Alerts {alertCount}
                </button>
              </div>

              <div className="appMobileQuickRow">
                <button
                  type="button"
                  className={"appStatusPill " + (activeTab === "dashboard" ? "alert" : "")}
                  onClick={() => setActiveTab("dashboard")}
                  title="Open Dashboard"
                >
                  Dashboard
                </button>
              </div>

              <button className={"appNavBtn " + (activeTab === "inventory" ? "active" : "")} onClick={() => setActiveTab("inventory")}>Inventory</button>
              <button className={"appNavBtn " + (activeTab === "management" ? "active" : "")} onClick={() => setActiveTab("management")}>Management</button>
              {canOpenPartsUsedTab ? (
                <button className={"appNavBtn " + (activeTab === "partsUsed" ? "active" : "")} onClick={() => setActiveTab("partsUsed")}>
                  Parts Used
                  {mePendingCount > 0 ? <span className="appWarnDot" aria-hidden="true">●</span> : null}
                </button>
              ) : null}
              {canOpenToolSignoutTab ? (
                <button className={"appNavBtn " + (activeTab === "toolSignout" ? "active" : "")} onClick={() => setActiveTab("toolSignout")}>
                  Tool Signout
                  {toolPendingCount > 0 ? <span className="appWarnDot appWarnDotYellow" aria-hidden="true">●</span> : null}
                </button>
              ) : null}
              <button className={"appNavBtn appSettingsBtn appIconOnly " + (activeTab === "settings" ? "active" : "")} onClick={() => setActiveTab("settings")} title="Settings" aria-label="Settings">
                <GearIcon />
              </button>
            </div>
          </div>
        </div>

        {syncPanelOpen ? (
          <div className={`appSyncPanel ${syncStatus.state}`} role="status" aria-live="polite">
            <div className="appSyncPanelTitle">Sync Status</div>
            <div className="appSyncPanelLine">State: {syncStateText}</div>
            <div className="appSyncPanelLine">Last Sync: {syncStatus.lastSyncAt > 0 ? fmt(syncStatus.lastSyncAt) : "—"}</div>
            <div className="appSyncPanelLine">Last Push: {syncStatus.lastPushAt > 0 ? fmt(syncStatus.lastPushAt) : "—"}</div>
            <div className="appSyncPanelLine">Last Pull: {syncStatus.lastPullAt > 0 ? fmt(syncStatus.lastPullAt) : "—"}</div>
            <div className="appSyncPanelLine">Inbound Pull: {syncStatus.pullSuspended ? "Suspended" : "Active"}</div>
            <div className="appSyncPanelLine">Push Error: {syncStatus.lastPushError || "None"}</div>
            <div className="appSyncPanelLine">Pull Error: {syncStatus.lastPullError || "None"}</div>
            <div className="appSyncPanelLine">Details: {syncStatus.lastError || "No active errors."}</div>
            <div className="appSyncPanelActions">
              <button
                type="button"
                className="btn"
                onClick={() => {
                  requestLiveCloudSyncNow();
                }}
              >
                Retry Sync
              </button>
              <button type="button" className="btn" onClick={() => setSyncPanelOpen(false)}>
                Close
              </button>
            </div>
          </div>
        ) : null}
      </div>

      <button
        type="button"
        className={"appMobileNavBackdrop " + (mobileNavOpen ? "open" : "")}
        aria-label="Close navigation menu"
        onClick={() => setMobileNavOpen(false)}
      />

      <div className="appContent">
        {activeTab === "dashboard" && <DashboardScreen />}
        {activeTab === "inventory" && <InventoryScreen />}
        {activeTab === "management" && <ManagementScreen />}
        {activeTab === "partsUsed" && canOpenPartsUsedTab && <PartsUsedScreen onChanged={refresh} />}
        {activeTab === "toolSignout" && canOpenToolSignoutTab && <ToolSignoutScreen onChanged={refresh} />}
        {activeTab === "settings" && <SettingsScreen />}
      </div>

      <div className="appFooter">
        Inventory App • Local-first • Works offline (this device) • v{APP_VERSION}
      </div>
    </div>
  );
}
