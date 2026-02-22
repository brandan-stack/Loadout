import { useMemo, useState } from "react";
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
  const [tick, setTick] = useState(0);
  const [pin, setPin] = useState("");

  const users = useMemo(() => loadUsers(), [tick]);
  const session = useMemo(() => loadSession(), [tick]);
  const me = useMemo(() => currentUser(), [tick]);
  const unlocked = isUnlocked();
  const isAdmin = canManageUsers(me);

  const sec = useMemo(() => loadSecuritySettings(), [tick]);

  const [themeMode, setThemeMode] = useState<ThemeMode>(() => loadThemeMode());

  const activeUsers = users.filter((u) => u.isActive);

  return (
    <div style={{ maxWidth: 1100, display: "grid", gap: 12 }}>
      <div>
        <div style={{ fontSize: 26, fontWeight: 1000 }}>Settings</div>
        <div className="muted">Theme, users, security, and permissions.</div>
      </div>

      {/* Appearance */}
      <div className="card">
        <div className="label">Appearance</div>
        <div className="muted" style={{ marginBottom: 10 }}>
          Choose how the app looks on this device.
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 260px", gap: 10, alignItems: "center" }}>
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
      <div className="card">
        <div className="label">User & PIN</div>
        <div className="muted" style={{ marginBottom: 10 }}>
          Tap a user below (no dropdown bugs), then enter PIN and Unlock.
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
                if (!confirm("Reset users to defaults (Admin/Stock/Invoicing/Viewer)? Inventory will NOT be touched.")) return;
                resetUsersToDefaults();
                setTick((x) => x + 1);
              }}
            >
              Reset Users (safe)
            </button>
          </div>
        ) : (
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            {activeUsers.map((u) => (
              <button
                key={u.id}
                className="btn"
                style={{
                  minWidth: 220,
                  justifyContent: "space-between",
                  background: u.id === session.currentUserId ? "var(--panel2)" : "var(--panel)",
                }}
                onClick={() => {
                  setCurrentUser(u.id);
                  setPin("");
                  setTick((x) => x + 1);
                }}
              >
                <span style={{ display: "grid" }}>
                  <span style={{ fontWeight: 1000 }}>{u.name}</span>
                  <span className="muted" style={{ fontSize: 12 }}>
                    {roleLabel(u.role)}
                  </span>
                </span>
                <span className="pill">{u.id === session.currentUserId ? "Selected" : "Select"}</span>
              </button>
            ))}
          </div>
        )}

        <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "1fr 160px 120px 120px", gap: 10, alignItems: "center" }}>
          <div className="muted">
            Current: <b style={{ color: "var(--text)" }}>{me ? me.name : "None"}</b> •{" "}
            {unlocked ? <span style={{ color: "var(--accent)" }}>Unlocked</span> : <span style={{ color: "var(--warn)" }}>Locked</span>}
          </div>

          <input
            className="input"
            value={pin}
            onChange={(e) => setPin(e.target.value)}
            placeholder="PIN"
            inputMode="numeric"
          />

          <button
            className="btn"
            onClick={() => {
              const ok = unlockWithPin(pin || "", undefined);
              setPin("");
              setTick((x) => x + 1);
              if (!ok) alert("Wrong PIN.");
            }}
          >
            Unlock
          </button>

          <button
            className="btn"
            onClick={() => {
              lockNow();
              setTick((x) => x + 1);
            }}
          >
            Lock
          </button>
        </div>

        <div className="muted" style={{ marginTop: 10, fontSize: 12 }}>
          Defaults: Admin 1234 • Stock 1111 • Invoicing 2222
        </div>
      </div>

      {/* Security */}
      <div className="card">
        <div className="label">Security</div>
        <div className="muted" style={{ marginBottom: 10 }}>
          These rules apply on this device (local-first).
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 200px", gap: 10, alignItems: "center" }}>
          <div>
            <div style={{ fontWeight: 900 }}>Auto-lock (minutes)</div>
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

        <div style={{ display: "grid", gap: 10, marginTop: 12 }}>
          <label style={{ display: "flex", gap: 10, alignItems: "center" }}>
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

          <label style={{ display: "flex", gap: 10, alignItems: "center" }}>
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
      <div className="card">
        <div className="label">Admin</div>
        {isAdmin && unlocked ? (
          <AdminPanel />
        ) : (
          <div className="muted">
            Select <b style={{ color: "var(--text)" }}>Admin</b> above and press <b style={{ color: "var(--text)" }}>Unlock</b> to manage users & PINs.
          </div>
        )}
      </div>
    </div>
  );
}