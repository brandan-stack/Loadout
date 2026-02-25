import { useEffect, useState } from "react";
import AdminPanel from "./AdminPanel";
import {
  loadUsers,
  loadSession,
  setCurrentUser,
  currentUser,
  unlockWithPin,
  lockNow,
  isUnlocked,
  canManageUsers,
  resetUsersToDefaults,
  loadSecuritySettings,
  saveSecuritySettings,
  getAccessSummary,
  type Role,
} from "../lib/authStore";

import { loadThemeMode, saveThemeMode, type ThemeMode } from "../lib/themeStore";

function roleLabel(r: Role) {
  if (r === "admin") return "Admin";
  if (r === "stock") return "Stock";
  if (r === "invoicing") return "Invoicing";
  return "Viewer";
}

export default function SettingsScreen() {
  const [, setTick] = useState(0);
  const [pin, setPin] = useState("");
  const [unlockFeedback, setUnlockFeedback] = useState("");
  const [compactAdmin, setCompactAdmin] = useState(() =>
    typeof window !== "undefined" ? window.innerWidth <= 980 : false
  );
  const [adminExpanded, setAdminExpanded] = useState(false);

  const users = loadUsers();
  const session = loadSession();
  const me = currentUser();
  const unlocked = isUnlocked();
  const isAdmin = canManageUsers(me);

  const sec = loadSecuritySettings();

  const [themeMode, setThemeMode] = useState<ThemeMode>(() => loadThemeMode());

  const activeUsers = users.filter((u) => u.isActive);
  const accessAdd = me ? getAccessSummary(me, "add") : "Blocked";
  const accessEdit = me ? getAccessSummary(me, "edit") : "Blocked";
  const accessPartsUsed = me?.canAccessPartsUsed ? "Allowed" : "Blocked";
  const accessNotifications = me?.receivesJobNotifications ? "Allowed" : "Blocked";
  const accessPricing = me?.canViewPricingMargin ? "Allowed" : "Blocked";

  function refreshScreen() {
    setTick((x) => x + 1);
  }

  function handleUnlock() {
    const ok = unlockWithPin(pin || "", undefined);
    setPin("");
    refreshScreen();
    if (!ok) setUnlockFeedback("Wrong password / PIN. Try again.");
    else setUnlockFeedback("");
  }

  function handleLock() {
    lockNow();
    refreshScreen();
  }

  useEffect(() => {
    const onResize = () => {
      const compact = window.innerWidth <= 980;
      setCompactAdmin(compact);
      if (!compact) setAdminExpanded(false);
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  return (
    <div className="page screenWrap settingsPage">
      <div className="settingsHeader">
        <div className="settingsTitle">Settings</div>
        <div className="muted">Theme, users, security, and admin permissions.</div>
        <div className="chips settingsChips">
          <span className="chip">Active Users: {activeUsers.length}</span>
          <span className="chip">Current: {me?.name ?? "None"}</span>
          <span className="chip">Parts Used: {accessPartsUsed}</span>
          <span className="chip">Job Notifications: {accessNotifications}</span>
          <span className="chip">Pricing/Margin: {accessPricing}</span>
          <span className="chip">Add Access: {accessAdd}</span>
          <span className="chip">Edit/Stock Access: {accessEdit}</span>
          {unlocked ? <span className="chip">Session: Unlocked</span> : <span className="chip">Session: Locked</span>}
        </div>
      </div>

      {/* Appearance */}
      <div className="card cardSoft settingsCard">
        <div className="label">Appearance</div>
        <div className="muted settingsSubtleGap">
          Choose how the app looks on this device.
        </div>

        <div className="settingsRow2">
          <div className="muted">Theme mode</div>
          <select
            value={themeMode}
            onChange={(e) => {
              const v = e.target.value as ThemeMode;
              setThemeMode(v);
              saveThemeMode(v);
            }}
          >
            <option value="system">System</option>
            <option value="dark">Dark</option>
            <option value="light">Light</option>
          </select>
        </div>
      </div>

      {/* User & PIN */}
      <div className="card cardSoft settingsCard">
        <div className="label">User & password (PIN)</div>
        <div className="muted settingsSubtleGap">
          Select a user, enter password / PIN, then unlock.
        </div>

        {activeUsers.length === 0 ? (
          <div style={{ display: "grid", gap: 10 }}>
            <div className="muted">
              No active users are visible (old save format). Click below to rebuild defaults.
              <br />
              <b>Inventory is NOT touched.</b>
            </div>
            <button
              className="btn"
              onClick={() => {
                if (!confirm("Reset users to defaults with the same passwords (Admin 1234, Stock 1111, Invoicing 2222)? Inventory will NOT be touched.")) return;
                resetUsersToDefaults();
                refreshScreen();
              }}
            >
              Reset Users (same passwords)
            </button>
          </div>
        ) : (
          <div className="settingsUserCards">
            {activeUsers.map((u) => (
              <button
                key={u.id}
                className={"btn settingsUserCard" + (u.id === session.currentUserId ? " selected" : "")}
                onClick={() => {
                  setCurrentUser(u.id);
                  setPin("");
                  refreshScreen();
                }}
              >
                  <span className="settingsUserMain">
                    <span className="settingsUserName">{u.name}</span>
                    <span className="muted settingsUserMeta">
                    {roleLabel(u.role)} • Parts Used: {u.canAccessPartsUsed ? "Allowed" : "Blocked"}
                  </span>
                </span>
                <span className="pill">{u.id === session.currentUserId ? "Selected" : "Select"}</span>
              </button>
            ))}
          </div>
        )}

        <div className="settingsUnlockGrid">
            <div className="muted settingsCurrentStatus">
              <div>
                Current: <b style={{ color: "var(--text)" }}>{me ? me.name : "None"}</b> •{" "}
                {unlocked ? <span style={{ color: "var(--accent)" }}>Unlocked</span> : <span style={{ color: "var(--warn)" }}>Locked</span>}
              </div>
              <div className="settingsCurrentAccess">Parts Used: {accessPartsUsed} • Job Notifications: {accessNotifications} • Pricing/Margin: {accessPricing} • Add Access: {accessAdd} • Edit/Stock Access: {accessEdit}</div>
          </div>

          <input
            className="input"
            value={pin}
            onChange={(e) => setPin(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleUnlock();
            }}
            placeholder="password / PIN"
            inputMode="numeric"
          />

          <button className="btn" onClick={handleUnlock}>
            Unlock
          </button>

          <button className="btn" onClick={handleLock}>
            Lock Session
          </button>
        </div>

        {unlockFeedback ? (
          <div className="bannerFeedback bannerFeedback--error" role="status" aria-live="polite">{unlockFeedback}</div>
        ) : null}

        <div className="muted settingsFootnote">
          Default passwords (unchanged): Admin 1234 • Stock 1111 • Invoicing 2222
        </div>
      </div>

      {/* Security */}
      <div className="card cardSoft settingsCard">
        <div className="label">Security</div>
        <div className="muted settingsSubtleGap">
          These rules apply on this device (local-first).
        </div>

        <div className="settingsRow2 settingsSecurityRow">
          <div>
            <div className="settingsStrong">Auto-lock (minutes)</div>
            <div className="muted">After unlocking, lock again automatically.</div>
          </div>
          <input
            className="input"
            type="number"
            min={0}
            value={sec.autoLockMinutes}
            onChange={(e) => {
              const v = Math.max(0, Number(e.target.value || 0));
              saveSecuritySettings({ autoLockMinutes: v });
              setTick((x) => x + 1);
            }}
          />
        </div>

        <div className="settingsChecks">
          <label className="settingsCheckLabel">
            <input
              type="checkbox"
              checked={sec.requirePinForStock}
              onChange={(e) => {
                saveSecuritySettings({ requirePinForStock: e.target.checked });
                setTick((x) => x + 1);
              }}
            />
            <span>
              <b>Require PIN</b> for stock actions (receive/take out/move)
            </span>
          </label>

          <label className="settingsCheckLabel">
            <input
              type="checkbox"
              checked={sec.requirePinForCosts}
              onChange={(e) => {
                saveSecuritySettings({ requirePinForCosts: e.target.checked });
                setTick((x) => x + 1);
              }}
            />
            <span>
              <b>Require PIN</b> to view costs/profit fields
            </span>
          </label>
        </div>
      </div>

      {/* Admin */}
      <div className="card cardSoft settingsCard">
        <div className="settingsAdminHeader">
          <div className="label">Admin</div>
          {isAdmin && unlocked && compactAdmin ? (
            <button
              className="btn settingsAdminToggle"
              type="button"
              onClick={() => setAdminExpanded((v) => !v)}
            >
              {adminExpanded ? "Hide Admin Tools" : "Show Admin Tools"}
            </button>
          ) : null}
        </div>
        {isAdmin && unlocked ? (
          !compactAdmin || adminExpanded ? <AdminPanel /> : null
        ) : (
          <div className="muted">
            Select <b style={{ color: "var(--text)" }}>Admin</b> above and press <b style={{ color: "var(--text)" }}>Unlock</b> to manage users & PINs.
          </div>
        )}
      </div>
    </div>
  );
}