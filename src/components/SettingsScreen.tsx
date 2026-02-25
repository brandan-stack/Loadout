import { useEffect, useRef, useState } from "react";
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
import {
  disableAutoPdfBackup,
  downloadBackupPdfNow,
  enableAutoPdfBackup,
  importBackupPdf,
  refreshPdfBackupStatus,
  resetAutoPdfBackupState,
  runAutoPdfBackupNow,
} from "../lib/pdfBackup";

declare const __APP_VERSION__: string;

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
  const [pdfBackupStatus, setPdfBackupStatus] = useState<{
    enabled: boolean;
    hasFileHandle: boolean;
    lastSyncedAt: number;
    lastHash: string;
    lastError: string;
  }>({
    enabled: false,
    hasFileHandle: false,
    lastSyncedAt: 0,
    lastHash: "",
    lastError: "",
  });
  const [pdfBusy, setPdfBusy] = useState(false);
  const [pdfFeedback, setPdfFeedback] = useState("");
  const pdfUploadRef = useRef<HTMLInputElement | null>(null);

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

  useEffect(() => {
    const pullStatus = () => {
      void refreshPdfBackupStatus().then((status) => setPdfBackupStatus(status));
    };
    pullStatus();
    const id = window.setInterval(pullStatus, 15_000);
    return () => window.clearInterval(id);
  }, []);

  async function refreshBackupStatusNow() {
    const status = await refreshPdfBackupStatus();
    setPdfBackupStatus(status);
  }

  async function handleDownloadPdfNow() {
    setPdfBusy(true);
    setPdfFeedback("");
    try {
      await downloadBackupPdfNow(__APP_VERSION__);
      await refreshBackupStatusNow();
      setPdfFeedback("Backup PDF downloaded.");
    } catch (error) {
      setPdfFeedback(error instanceof Error ? error.message : "Failed to download backup PDF.");
    } finally {
      setPdfBusy(false);
    }
  }

  async function handleEnableAutoPdfSync() {
    setPdfBusy(true);
    setPdfFeedback("");
    try {
      await enableAutoPdfBackup(__APP_VERSION__);
      await refreshBackupStatusNow();
      setPdfFeedback("Auto PDF sync enabled. This will overwrite the selected file every 30 minutes when data changes.");
    } catch (error) {
      setPdfFeedback(error instanceof Error ? error.message : "Could not enable auto PDF sync.");
    } finally {
      setPdfBusy(false);
    }
  }

  async function handleRunAutoNow() {
    setPdfBusy(true);
    setPdfFeedback("");
    try {
      await runAutoPdfBackupNow(__APP_VERSION__, true);
      await refreshBackupStatusNow();
      setPdfFeedback("Auto PDF sync ran now.");
    } catch (error) {
      setPdfFeedback(error instanceof Error ? error.message : "Auto PDF sync failed.");
    } finally {
      setPdfBusy(false);
    }
  }

  async function handleDisableAuto() {
    setPdfBusy(true);
    setPdfFeedback("");
    try {
      await disableAutoPdfBackup();
      await refreshBackupStatusNow();
      setPdfFeedback("Auto PDF sync disabled.");
    } catch (error) {
      setPdfFeedback(error instanceof Error ? error.message : "Failed to disable auto PDF sync.");
    } finally {
      setPdfBusy(false);
    }
  }

  async function handleResetAutoState() {
    setPdfBusy(true);
    setPdfFeedback("");
    try {
      await resetAutoPdfBackupState();
      await refreshBackupStatusNow();
      setPdfFeedback("Auto PDF sync file target reset.");
    } catch (error) {
      setPdfFeedback(error instanceof Error ? error.message : "Failed to reset auto PDF sync state.");
    } finally {
      setPdfBusy(false);
    }
  }

  async function handleUploadRestorePdf(file: File | null) {
    if (!file) return;
    setPdfBusy(true);
    setPdfFeedback("");
    try {
      const { restoredCount } = await importBackupPdf(file);
      await refreshBackupStatusNow();
      setPdfFeedback(`Backup restored from PDF. Restored ${restoredCount} data keys. Reloading...`);
      window.setTimeout(() => window.location.reload(), 900);
    } catch (error) {
      setPdfFeedback(error instanceof Error ? error.message : "Failed to restore backup PDF.");
    } finally {
      setPdfBusy(false);
      if (pdfUploadRef.current) {
        pdfUploadRef.current.value = "";
      }
    }
  }

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

      {/* Data Backup */}
      <div className="card cardSoft settingsCard">
        <div className="label">Data Backup (PDF)</div>
        <div className="muted settingsSubtleGap">
          Download a full data snapshot PDF now. You can also enable auto-overwrite sync every 30 minutes when data changes.
        </div>

        <div className="settingsUserCards" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))" }}>
          <button className="btn" disabled={pdfBusy} onClick={handleDownloadPdfNow}>Download Backup PDF Now</button>
          <button className="btn" disabled={pdfBusy} onClick={() => pdfUploadRef.current?.click()}>Upload Backup PDF Restore</button>
          <button className="btn" disabled={pdfBusy} onClick={handleEnableAutoPdfSync}>Enable Auto PDF Sync</button>
          <button className="btn" disabled={pdfBusy || !pdfBackupStatus.enabled} onClick={handleRunAutoNow}>Run Auto Sync Now</button>
          <button className="btn" disabled={pdfBusy || !pdfBackupStatus.enabled} onClick={handleDisableAuto}>Disable Auto Sync</button>
          <button className="btn" disabled={pdfBusy} onClick={handleResetAutoState}>Reset Auto Sync File</button>
        </div>

        <input
          ref={pdfUploadRef}
          type="file"
          accept="application/pdf,.pdf"
          style={{ display: "none" }}
          onChange={(event) => {
            const file = event.target.files?.[0] ?? null;
            void handleUploadRestorePdf(file);
          }}
        />

        <div className="muted settingsSubtleGap">
          Auto Sync: <b style={{ color: "var(--text)" }}>{pdfBackupStatus.enabled ? "Enabled" : "Disabled"}</b> •
          File Linked: <b style={{ color: "var(--text)" }}>{pdfBackupStatus.hasFileHandle ? "Yes" : "No"}</b> •
          Last Sync: <b style={{ color: "var(--text)" }}>{pdfBackupStatus.lastSyncedAt ? new Date(pdfBackupStatus.lastSyncedAt).toLocaleString() : "Never"}</b>
        </div>

        <div className="muted settingsSubtleGap" style={{ wordBreak: "break-all" }}>
          Last Data Hash: <b style={{ color: "var(--text)" }}>{pdfBackupStatus.lastHash || "—"}</b>
        </div>

        {pdfBackupStatus.lastError ? (
          <div className="bannerFeedback bannerFeedback--warning" role="status" aria-live="polite">{pdfBackupStatus.lastError}</div>
        ) : null}

        {pdfFeedback ? (
          <div className="bannerFeedback bannerFeedback--success" role="status" aria-live="polite">{pdfFeedback}</div>
        ) : null}
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