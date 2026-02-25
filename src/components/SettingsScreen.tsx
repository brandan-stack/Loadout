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
import { getActiveToolSignouts, getPendingToolRequests } from "../lib/toolSignoutStore";

declare const __APP_VERSION__: string;

type SettingsTab = "users" | "system" | "admin";
type TutorialTopic = "gettingStarted" | "inventory" | "partsUsed" | "toolSignout";

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
  const [activeTab, setActiveTab] = useState<SettingsTab>("users");
  const [tutorialTopic, setTutorialTopic] = useState<TutorialTopic>("gettingStarted");
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
  const selectedUser = activeUsers.find((u) => u.id === session.currentUserId) ?? null;
  const accessAdd = me ? getAccessSummary(me, "add") : "Blocked";
  const accessEdit = me ? getAccessSummary(me, "edit") : "Blocked";
  const accessPartsUsed = me?.canAccessPartsUsed ? "Allowed" : "Blocked";
  const accessToolSignout = me?.canAccessToolSignout || me?.role === "admin" ? "Allowed" : "Blocked";
  const accessToolDashboard = me?.canManageToolSignout || me?.role === "admin" ? "Allowed" : "Blocked";
  const accessNotifications = me?.receivesJobNotifications ? "Allowed" : "Blocked";
  const accessPricing = me?.canViewPricingMargin ? "Allowed" : "Blocked";
  const canManagePdf = !!isAdmin && unlocked;
  const pendingToolRequests = getPendingToolRequests();
  const activeToolSignouts = getActiveToolSignouts();

  const tutorialTitle =
    tutorialTopic === "gettingStarted"
      ? "Getting Started"
      : tutorialTopic === "inventory"
      ? "Inventory Workflow"
      : tutorialTopic === "partsUsed"
      ? "Parts Used Workflow"
      : "Tool Signout Workflow";

  const tutorialSteps =
    tutorialTopic === "gettingStarted"
      ? [
          "Select your user on the lock screen and unlock with your PIN.",
          "Open Dashboard to check low-stock and alerts first.",
          "Use Inventory to add/edit items and keep location quantities accurate.",
          "Use Settings > Users tab to verify your active access permissions.",
        ]
      : tutorialTopic === "inventory"
      ? [
          "Open Inventory and search by name, part number, model, or serial.",
          "Use Add/Edit to update item details, low-stock threshold, price, and margin.",
          "Receive, Take Out, or Move stock so quantity by location stays correct.",
          "Review Dashboard low-stock cards and restock before threshold is reached.",
        ]
      : tutorialTopic === "partsUsed"
      ? [
          "Open Parts Used and enter the required Job Number.",
          "Select part + quantity and add as many lines as needed to the queue.",
          "Verify required checklist is fully valid, then run Final Step logging.",
          "Confirm recent history shows submitter, picture, and cost snapshot for each line.",
        ]
      : [
          "Open Tool Signout and submit a request with selected tool and quantity.",
          "Admin users review pending requests and Accept or Reject.",
          "Approved requests appear in Who Has the Tool dashboard.",
          "Mark tools returned when checked back in to close the signout.",
        ];

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
        <div className="muted">Clean controls for users, system settings, and admin permissions.</div>
        <div className="chips settingsChips">
          <span className="chip">Active Users: {activeUsers.length}</span>
          <span className="chip">Current: {me?.name ?? "None"}</span>
          <span className="chip">Parts Used: {accessPartsUsed}</span>
          <span className="chip">Tool Signout: {accessToolSignout}</span>
          <span className="chip">Tool Dashboard: {accessToolDashboard}</span>
          <span className="chip">Job Notifications: {accessNotifications}</span>
          <span className="chip">Pricing/Margin: {accessPricing}</span>
          <span className="chip">Add Access: {accessAdd}</span>
          <span className="chip">Edit/Stock Access: {accessEdit}</span>
          {unlocked ? <span className="chip">Session: Unlocked</span> : <span className="chip">Session: Locked</span>}
        </div>
      </div>

      <div className="settingsTabs" role="tablist" aria-label="Settings sections">
        <button
          className={`btn settingsTab ${activeTab === "users" ? "active" : ""}`}
          type="button"
          role="tab"
          aria-selected={activeTab === "users"}
          onClick={() => setActiveTab("users")}
        >
          Users
        </button>
        <button
          className={`btn settingsTab ${activeTab === "system" ? "active" : ""}`}
          type="button"
          role="tab"
          aria-selected={activeTab === "system"}
          onClick={() => setActiveTab("system")}
        >
          System Settings
        </button>
        <button
          className={`btn settingsTab ${activeTab === "admin" ? "active" : ""}`}
          type="button"
          role="tab"
          aria-selected={activeTab === "admin"}
          onClick={() => setActiveTab("admin")}
        >
          Admin
        </button>
      </div>

      {activeTab === "users" ? (
        <div className="card cardSoft settingsCard settingsTabPanel">
          <div className="label">User & password (PIN)</div>
          <div className="muted settingsSubtleGap">
            View users independently, then unlock with the selected user password / PIN.
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
              <div className="settingsCurrentAccess">Parts Used: {accessPartsUsed} • Tool Signout: {accessToolSignout} • Tool Dashboard: {accessToolDashboard} • Job Notifications: {accessNotifications} • Pricing/Margin: {accessPricing} • Add Access: {accessAdd} • Edit/Stock Access: {accessEdit}</div>
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

          {selectedUser ? (
            <div className="settingsSelectedUserCard">
              <div className="settingsStrong">Selected User Details</div>
              <div className="muted settingsCurrentAccess">
                {selectedUser.name} • {roleLabel(selectedUser.role)} • Parts Used: {selectedUser.canAccessPartsUsed ? "Allowed" : "Blocked"} • Tool Signout: {selectedUser.canAccessToolSignout || selectedUser.role === "admin" ? "Allowed" : "Blocked"} • Tool Dashboard: {selectedUser.canManageToolSignout || selectedUser.role === "admin" ? "Allowed" : "Blocked"} • Job Notifications: {selectedUser.receivesJobNotifications ? "Allowed" : "Blocked"} • Pricing/Margin: {selectedUser.canViewPricingMargin ? "Allowed" : "Blocked"}
              </div>
            </div>
          ) : null}
        </div>
      ) : null}

      {activeTab === "system" ? (
        <>
          <div className="card cardSoft settingsCard settingsTabPanel">
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

          <div className="card cardSoft settingsCard settingsTabPanel">
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

          <div className="card cardSoft settingsCard settingsTabPanel">
            <div className="label">Tutorials</div>
            <div className="muted settingsSubtleGap">
              Quick in-app training guides for day-to-day workflows.
            </div>

            <div className="settingsTutorialTabs">
              <button className={`btn ${tutorialTopic === "gettingStarted" ? "primary" : ""}`} type="button" onClick={() => setTutorialTopic("gettingStarted")}>Getting Started</button>
              <button className={`btn ${tutorialTopic === "inventory" ? "primary" : ""}`} type="button" onClick={() => setTutorialTopic("inventory")}>Inventory</button>
              <button className={`btn ${tutorialTopic === "partsUsed" ? "primary" : ""}`} type="button" onClick={() => setTutorialTopic("partsUsed")}>Parts Used</button>
              <button className={`btn ${tutorialTopic === "toolSignout" ? "primary" : ""}`} type="button" onClick={() => setTutorialTopic("toolSignout")}>Tool Signout</button>
            </div>

            <div className="settingsTutorialCard">
              <div className="settingsStrong">{tutorialTitle}</div>
              <ol className="settingsTutorialList">
                {tutorialSteps.map((step, index) => (
                  <li key={`${tutorialTopic}-${index}`}>{step}</li>
                ))}
              </ol>
            </div>
          </div>

          <div className="card cardSoft settingsCard settingsTabPanel">
            <div className="label">Data Backup (PDF)</div>
            <div className="muted settingsSubtleGap">
              Download and upload backup PDFs, with optional auto-overwrite sync every 30 minutes when data changes.
            </div>

            {!canManagePdf ? (
              <div className="bannerFeedback bannerFeedback--warning" role="status" aria-live="polite">
                Only an unlocked Admin can download or upload backup PDFs.
              </div>
            ) : null}

            <div className="settingsUserCards" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))" }}>
              <button className="btn" disabled={pdfBusy || !canManagePdf} onClick={handleDownloadPdfNow}>Download Backup PDF Now</button>
              <button className="btn" disabled={pdfBusy || !canManagePdf} onClick={() => pdfUploadRef.current?.click()}>Upload Backup PDF Restore</button>
              <button className="btn" disabled={pdfBusy || !canManagePdf} onClick={handleEnableAutoPdfSync}>Enable Auto PDF Sync</button>
              <button className="btn" disabled={pdfBusy || !canManagePdf || !pdfBackupStatus.enabled} onClick={handleRunAutoNow}>Run Auto Sync Now</button>
              <button className="btn" disabled={pdfBusy || !canManagePdf || !pdfBackupStatus.enabled} onClick={handleDisableAuto}>Disable Auto Sync</button>
              <button className="btn" disabled={pdfBusy || !canManagePdf} onClick={handleResetAutoState}>Reset Auto Sync File</button>
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

          {isAdmin ? (
            <div className="card cardSoft settingsCard settingsTabPanel">
              <div className="label">Tools Dashboard</div>
              <div className="muted settingsSubtleGap">
                Live view of tool requests and who currently has each approved tool.
              </div>

              <div className="dashboardPills">
                <span className="dashboardBadge">Pending Requests: {pendingToolRequests.length}</span>
                <span className="dashboardBadge">Checked Out Tools: {activeToolSignouts.length}</span>
              </div>

              <div className="dashboardStack settingsSubtleGap">
                {activeToolSignouts.slice(0, 20).map((row) => (
                  <div key={row.id} className="dashboardRowCard">
                    <div className="dashboardItemMain">
                      <div className="dashboardItemName">{row.itemName}</div>
                      <div className="dashboardUsageMeta">
                        Holder: {row.requestedByName} • Qty {row.qty}
                        {row.partNumber ? ` • Part Number: ${row.partNumber}` : ""}
                        {row.decidedByName ? ` • Approved by ${row.decidedByName}` : ""}
                      </div>
                    </div>
                    <span className="dashboardBadge">Checked Out</span>
                  </div>
                ))}
                {!activeToolSignouts.length ? <div className="dashboardMuted">No active tool signouts.</div> : null}
              </div>
            </div>
          ) : null}
        </>
      ) : null}

      {activeTab === "admin" ? (
        <div className="card cardSoft settingsCard settingsTabPanel">
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
      ) : null}
    </div>
  );
}
