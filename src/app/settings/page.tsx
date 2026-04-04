"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { clearUserCache } from "@/hooks/useCurrentUser";

interface AppSettings {
  simpleMode: boolean;
  premiumEnabled: boolean;
  enableMultiLocation: boolean;
  enableVariants: boolean;
  enableImportWizard: boolean;
  enableBackupZip: boolean;
  enableAITagging: boolean;
  preferredEmailClient: string;
  composeSubjectTemplate: string;
  defaultLowStockAmber: number;
  defaultLowStockRed: number;
}

export default function SettingsPage() {
  const router = useRouter();
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [signOutError, setSignOutError] = useState("");
  const [cleared, setCleared] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [storageUsage, setStorageUsage] = useState<{
    usedMB: number;
    quotaMB: number;
    percent: number;
  } | null>(null);

  useEffect(() => {
    fetchSettings();
    void refreshStorageUsage();
  }, []);

  async function refreshStorageUsage() {
    try {
      if (!("storage" in navigator) || !("estimate" in navigator.storage)) {
        setStorageUsage(null);
        return;
      }
      const estimate = await navigator.storage.estimate();
      const used = estimate.usage ?? 0;
      const quota = estimate.quota ?? 0;
      const usedMB = Math.round((used / (1024 * 1024)) * 100) / 100;
      const quotaMB = Math.round((quota / (1024 * 1024)) * 100) / 100;
      const percent = quota > 0 ? Math.round((used / quota) * 100) : 0;
      setStorageUsage({ usedMB, quotaMB, percent });
    } catch {
      setStorageUsage(null);
    }
  }

  async function clearAppStorage() {
    setClearing(true);
    setCleared(false);
    try {
      // Clear local/session storage
      if (typeof window !== "undefined") {
        localStorage.clear();
        sessionStorage.clear();
      }

      // Clear Cache Storage entries
      if (typeof window !== "undefined" && "caches" in window) {
        const keys = await caches.keys();
        await Promise.all(keys.map((key) => caches.delete(key)));
      }

      // Unregister service workers
      if ("serviceWorker" in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        await Promise.all(registrations.map((reg) => reg.unregister()));
      }

      // Clear IndexedDB databases where supported
      if (typeof indexedDB !== "undefined" && "databases" in indexedDB) {
        const databases = await (indexedDB as IDBFactory & {
          databases?: () => Promise<Array<{ name?: string }>>;
        }).databases?.();

        if (databases) {
          await Promise.all(
            databases
              .filter((db) => !!db.name)
              .map(
                (db) =>
                  new Promise<void>((resolve) => {
                    const request = indexedDB.deleteDatabase(db.name as string);
                    request.onsuccess = () => resolve();
                    request.onerror = () => resolve();
                    request.onblocked = () => resolve();
                  })
              )
          );
        }
      }

      await refreshStorageUsage();
      setCleared(true);
      setTimeout(() => setCleared(false), 2500);
    } finally {
      setClearing(false);
    }
  }

  async function fetchSettings() {
    try {
      const res = await fetch("/api/settings");
      const data = await res.json();
      setSettings(data);
    } catch (error) {
      console.error("Failed to load settings:", error);
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    if (!settings) return;
    setSaving(true);
    setSaveError("");
    try {
      const res = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });
      if (res.ok) {
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
      } else {
        const body = await res.json().catch(() => null);
        setSaveError(body?.error || "Failed to save settings.");
      }
    } catch (error) {
      console.error("Failed to save settings:", error);
      setSaveError("Failed to save settings. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  async function handleSignOut() {
    setSignOutError("");
    try {
      const res = await fetch("/api/auth/logout", { method: "POST" });
      if (!res.ok) {
        setSignOutError("Sign out failed. Please try again.");
        return;
      }
    } catch {
      setSignOutError("Sign out failed. Please try again.");
      return;
    }
    clearUserCache();
    router.push("/login");
    router.refresh();
  }

  const toggle = (key: keyof AppSettings) => {
    if (!settings) return;
    setSettings({ ...settings, [key]: !settings[key as keyof AppSettings] });
  };

  if (loading) {
    return (
      <main className="mx-auto w-full max-w-[1280px] px-4 sm:px-6 lg:px-8 py-8 form-screen">
        <p className="text-sm text-slate-400 animate-pulse">Loading settings...</p>
      </main>
    );
  }

  if (!settings) return null;

  const ToggleRow = ({
    label,
    description,
    settingKey,
    badge,
  }: {
    label: string;
    description: string;
    settingKey: keyof AppSettings;
    badge?: string;
  }) => (
    <div className="flex items-start justify-between py-3.5 border-b border-white/[0.04] last:border-0">
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <span className="font-medium text-sm text-slate-200">{label}</span>
          {badge && (
            <span
              className="px-1.5 py-0.5 text-[10px] font-semibold rounded-md"
              style={{
                background: "rgba(99,102,241,0.12)",
                border: "1px solid rgba(129,140,248,0.18)",
                color: "#a5b4fc",
              }}
            >
              {badge}
            </span>
          )}
        </div>
        <p className="text-xs text-slate-500 mt-0.5">{description}</p>
      </div>
      <button
        onClick={() => toggle(settingKey)}
        className="relative ml-5 shrink-0 inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none"
        style={{
          background: settings[settingKey] ? "rgba(99,102,241,0.75)" : "rgba(51,65,85,0.8)",
        }}
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform ${
            settings[settingKey] ? "translate-x-6" : "translate-x-1"
          }`}
        />
      </button>
    </div>
  );

  return (
    <main className="mx-auto w-full max-w-[1280px] px-4 sm:px-6 lg:px-8 py-8 form-screen">

      {/* ─── Header ─── */}
      <div className="mb-8">
        <h1
          className="font-bold text-white leading-none"
          style={{ fontSize: "24px", letterSpacing: "-0.02em" }}
        >
          Settings
        </h1>
        <p className="text-xs text-slate-500 mt-1.5 uppercase tracking-widest font-medium">
          App configuration
        </p>
      </div>

      {/* User management */}
      <Link href="/admin/users">
        <div
          className="mb-5 rounded-2xl px-5 py-4 flex items-center justify-between cursor-pointer transition-colors hover:bg-white/[0.04]"
          style={{
            background: "rgba(99,102,241,0.06)",
            border: "1px solid rgba(99,102,241,0.16)",
          }}
        >
          <div>
            <h2 className="font-semibold text-sm text-slate-100">Manage Users</h2>
            <p className="text-xs text-slate-500 mt-0.5">Add technicians, office staff, and admins. Set passwords and roles.</p>
          </div>
          <svg className="text-slate-500" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M9 18l6-6-6-6"/></svg>
        </div>
      </Link>

      {/* Core settings */}
      <div
        className="mb-5 rounded-2xl overflow-hidden"
        style={{ background: "rgba(12,17,36,0.85)", border: "1px solid rgba(255,255,255,0.06)" }}
      >
        <div className="px-5 py-3 border-b border-white/[0.04]">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest">Core Settings</p>
        </div>
        <div className="px-5">
          <ToggleRow
            label="Simple Mode"
            description="Hides advanced features for a clean, minimal view"
            settingKey="simpleMode"
          />
          <ToggleRow
            label="Premium Features"
            description="Enable all premium features and capabilities"
            settingKey="premiumEnabled"
            badge="Premium"
          />
        </div>
      </div>

      {/* Advanced modules */}
      <div
        className="mb-5 rounded-2xl overflow-hidden"
        style={{ background: "rgba(12,17,36,0.85)", border: "1px solid rgba(255,255,255,0.06)" }}
      >
        <div className="px-5 py-3 border-b border-white/[0.04]">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest">Advanced Modules</p>
        </div>
        <div className="px-5">
          <ToggleRow
            label="Multi-Location Support"
            description="Track inventory across multiple locations with transfers"
            settingKey="enableMultiLocation"
            badge="Advanced"
          />
          <ToggleRow
            label="Item Variants"
            description="Track different variants of items (sizes, colors, etc.)"
            settingKey="enableVariants"
            badge="Advanced"
          />
          <ToggleRow
            label="Import Wizard"
            description="Import inventory from CSV files with mapping tools"
            settingKey="enableImportWizard"
            badge="Advanced"
          />
          <ToggleRow
            label="Backup & Restore"
            description="Create and restore inventory backups as ZIP files"
            settingKey="enableBackupZip"
            badge="Advanced"
          />
          <ToggleRow
            label="AI Tagging (Beta)"
            description="Auto-categorize items using AI analysis"
            settingKey="enableAITagging"
            badge="Beta"
          />
        </div>
      </div>
      {/* Low-stock thresholds */}
      <div
        className="mb-5 rounded-2xl overflow-hidden"
        style={{ background: "rgba(12,17,36,0.85)", border: "1px solid rgba(255,255,255,0.06)" }}
      >
        <div className="px-5 py-3 border-b border-white/[0.04]">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest">Default Thresholds</p>
        </div>
        <div className="px-5 py-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-amber-400/80 uppercase tracking-wider mb-2">
              Low Stock Threshold
            </label>
            <input
              type="number"
              min={0}
              value={settings.defaultLowStockAmber}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  defaultLowStockAmber: parseInt(e.target.value) || 0,
                })
              }
              className="w-full rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
              style={{ background: "rgba(15,23,42,0.6)", border: "1px solid rgba(148,163,184,0.12)" }}
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-red-400/80 uppercase tracking-wider mb-2">
              Critical Stock Threshold
            </label>
            <input
              type="number"
              min={0}
              value={settings.defaultLowStockRed}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  defaultLowStockRed: parseInt(e.target.value) || 0,
                })
              }
              className="w-full rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
              style={{ background: "rgba(15,23,42,0.6)", border: "1px solid rgba(148,163,184,0.12)" }}
            />
          </div>
        </div>
      </div>

      {/* Email settings */}
      <div
        className="mb-5 rounded-2xl overflow-hidden"
        style={{ background: "rgba(12,17,36,0.85)", border: "1px solid rgba(255,255,255,0.06)" }}
      >
        <div className="px-5 py-3 border-b border-white/[0.04]">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest">Email Settings</p>
        </div>
        <div className="px-5 py-4 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
              Preferred Email Client
            </label>
            <select
              value={settings.preferredEmailClient}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  preferredEmailClient: e.target.value,
                })
              }
              className="w-full rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
              style={{ background: "rgba(15,23,42,0.6)", border: "1px solid rgba(148,163,184,0.12)" }}
            >
              <option value="default">Default Client</option>
              <option value="gmail">Gmail</option>
              <option value="outlook">Outlook</option>
              <option value="apple">Apple Mail</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
              Subject Template
            </label>
            <input
              type="text"
              value={settings.composeSubjectTemplate}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  composeSubjectTemplate: e.target.value,
                })
              }
              className="w-full rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
              style={{ background: "rgba(15,23,42,0.6)", border: "1px solid rgba(148,163,184,0.12)" }}
            />
            <p className="text-xs text-slate-600 mt-1">
              Use {"${reportType}"} and {"${date}"} as placeholders
            </p>
          </div>
        </div>
      </div>

      {/* Save button */}
      <div className="mt-2 mb-6">
        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full py-3 text-white rounded-xl font-semibold text-sm transition-all disabled:opacity-50"
          style={{
            background: saved
              ? "rgba(99,102,241,0.18)"
              : "linear-gradient(135deg, #5b5ef4 0%, #818cf8 100%)",
            border: saved ? "1px solid rgba(129,140,248,0.28)" : "none",
            color: saved ? "#c7d2fe" : "white",
            boxShadow: saved ? "none" : "0 3px 14px rgba(91,94,244,0.32)",
          }}
        >
          {saving ? "Saving…" : saved ? "Saved" : "Save Settings"}
        </button>
        {saveError && (
          <p className="mt-2 text-xs text-red-400 text-center">{saveError}</p>
        )}
      </div>

      {/* Storage controls */}
      <div
        className="rounded-2xl overflow-hidden"
        style={{ background: "rgba(12,17,36,0.85)", border: "1px solid rgba(255,255,255,0.06)" }}
      >
        <div className="px-5 py-3 border-b border-white/[0.04]">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest">Storage &amp; Cache</p>
        </div>
        <div className="px-5 py-4">
          <p className="text-xs text-slate-500 mb-4">
            Clear cached data on this device if storage grows too large.
          </p>

          {storageUsage ? (
            <div className="mb-4 text-xs text-slate-400">
              Used: <span className="text-slate-200 font-semibold">{storageUsage.usedMB} MB</span> of{" "}
              <span className="text-slate-200 font-semibold">{storageUsage.quotaMB} MB</span>{" "}({storageUsage.percent}%)
            </div>
          ) : (
            <p className="mb-4 text-xs text-slate-600">Storage estimate not available on this browser.</p>
          )}

          <div className="flex flex-col sm:flex-row gap-2.5">
            <button
              onClick={() => void refreshStorageUsage()}
              className="px-4 py-2 rounded-xl text-sm font-medium text-slate-300 hover:text-white transition-colors"
              style={{ border: "1px solid rgba(255,255,255,0.09)" }}
            >
              Refresh Usage
            </button>
            <button
              onClick={() => void clearAppStorage()}
              disabled={clearing}
              className="px-4 py-2 rounded-xl text-sm font-medium text-white transition-all disabled:opacity-50"
              style={{
                background: cleared
                  ? "rgba(71,85,105,0.3)"
                  : "rgba(239,68,68,0.15)",
                border: cleared
                  ? "1px solid rgba(148,163,184,0.18)"
                  : "1px solid rgba(239,68,68,0.25)",
                color: cleared ? "#cbd5e1" : "#fca5a5",
              }}
            >
              {clearing ? "Clearing…" : cleared ? "Cleared" : "Clear Device Cache"}
            </button>
          </div>

          <p className="mt-3 text-xs text-slate-600">
            Clears local storage, cached files, and offline data on this device only.
          </p>
        </div>
      </div>

      {/* Sign Out */}
      <div className="mt-5 mb-2">
        <button
          onClick={() => void handleSignOut()}
          className="w-full py-3 rounded-xl text-sm font-semibold transition-all"
          style={{
            background: "rgba(239,68,68,0.10)",
            border: "1px solid rgba(239,68,68,0.22)",
            color: "#fca5a5",
          }}
        >
          Sign Out
        </button>
        {signOutError && (
          <p className="mt-2 text-xs text-red-400 text-center">{signOutError}</p>
        )}
      </div>
    </main>
  );
}
