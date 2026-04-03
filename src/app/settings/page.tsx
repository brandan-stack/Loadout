"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { GlassBubbleCard } from "@/components/ui/glass-bubble-card";
import { useCurrentUser } from "@/hooks/useCurrentUser";

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
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [clearing, setClearing] = useState(false);
  const [cleared, setCleared] = useState(false);
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

  const toggle = (key: keyof AppSettings) => {
    if (!settings) return;
    setSettings({ ...settings, [key]: !settings[key as keyof AppSettings] });
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <p>Loading settings...</p>
      </div>
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
    <div className="flex items-start justify-between py-3 border-b border-slate-700/50 last:border-0">
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <span className="font-medium text-sm">{label}</span>
          {badge && (
            <span className="px-2 py-0.5 bg-amber-100 text-amber-700 text-xs rounded">
              {badge}
            </span>
          )}
        </div>
        <p className="text-xs text-gray-500 mt-0.5">{description}</p>
      </div>
      <button
        onClick={() => toggle(settingKey)}
        className={`relative ml-4 inline-flex h-6 w-11 items-center rounded-full transition-colors ${
          settings[settingKey] ? "bg-blue-500" : "bg-slate-600"
        }`}
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
            settings[settingKey] ? "translate-x-6" : "translate-x-1"
          }`}
        />
      </button>
    </div>
  );

  const { user } = useCurrentUser();

  return (
    <main className="container mx-auto px-3 py-4 sm:p-4 max-w-2xl form-screen">
      <h1 className="text-3xl sm:text-4xl font-bold mb-2">Settings</h1>
      <p className="text-gray-600 mb-8">
        Configure your inventory app preferences and enable premium features.
      </p>

      {/* User management — SUPER_ADMIN only */}
      {user?.role === "SUPER_ADMIN" && (
        <Link href="/admin/users">
          <GlassBubbleCard className="mb-6 border border-teal-700/50 hover:border-teal-500 transition-colors cursor-pointer">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-bold text-lg">👥 Manage Users</h2>
                <p className="text-sm text-slate-400 mt-1">Add technicians, office staff, and admins. Set PINs and roles.</p>
              </div>
              <span className="text-teal-400 text-xl">→</span>
            </div>
          </GlassBubbleCard>
        </Link>
      )}

      {/* Core settings */}
      <GlassBubbleCard className="mb-6">
        <h2 className="font-bold text-lg mb-4">Core Settings</h2>
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
      </GlassBubbleCard>

      {/* Advanced modules */}
      <GlassBubbleCard className="mb-6">
        <h2 className="font-bold text-lg mb-4">Advanced Modules</h2>
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
      </GlassBubbleCard>

      {/* Low-stock thresholds */}
      <GlassBubbleCard className="mb-6">
        <h2 className="font-bold text-lg mb-4">Default Thresholds</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2 text-amber-700">
              Default Amber Threshold
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
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2 text-red-700">
              Default Red Threshold
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
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
            />
          </div>
        </div>
      </GlassBubbleCard>

      {/* Email settings */}
      <GlassBubbleCard className="mb-6">
        <h2 className="font-bold text-lg mb-4">Email Settings</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">
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
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="default">Default Client</option>
              <option value="gmail">Gmail</option>
              <option value="outlook">Outlook</option>
              <option value="apple">Apple Mail</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">
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
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p className="text-xs text-gray-500 mt-1">
              Use {"${reportType}"} and {"${date}"} as placeholders
            </p>
          </div>
        </div>
      </GlassBubbleCard>

      {/* Save button */}
      <div className="mt-4 pb-2">
        <button
          onClick={handleSave}
          disabled={saving}
          className={`w-full py-3 text-white rounded-lg font-semibold transition-colors ${
            saved
              ? "bg-green-500"
              : "bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400"
          }`}
        >
          {saving ? "Saving..." : saved ? "Saved!" : "Save Settings"}
        </button>
        {saveError && (
          <p className="mt-2 text-sm text-red-400 text-center">{saveError}</p>
        )}
      </div>

      {/* Storage controls */}
      <GlassBubbleCard className="mt-6">
        <h2 className="font-bold text-lg mb-2">Storage & Cache</h2>
        <p className="text-sm text-gray-600 mb-4">
          Clear cached data on this device if storage grows too large.
        </p>

        {storageUsage ? (
          <div className="mb-4 text-sm text-gray-700">
            <p>
              Used: <strong>{storageUsage.usedMB} MB</strong> of{" "}
              <strong>{storageUsage.quotaMB} MB</strong> ({storageUsage.percent}%)
            </p>
          </div>
        ) : (
          <p className="mb-4 text-sm text-gray-500">
            Storage estimate is not available on this browser.
          </p>
        )}

        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={() => void refreshStorageUsage()}
            className="px-4 py-2 border rounded-lg text-sm hover:bg-gray-100"
          >
            Refresh Usage
          </button>
          <button
            onClick={() => void clearAppStorage()}
            disabled={clearing}
            className={`px-4 py-2 rounded-lg text-sm text-white ${
              cleared
                ? "bg-green-500"
                : "bg-red-500 hover:bg-red-600 disabled:bg-gray-400"
            }`}
          >
            {clearing ? "Clearing..." : cleared ? "Cleared" : "Clear Device Cache"}
          </button>
        </div>

        <p className="mt-3 text-xs text-gray-500">
          This clears local storage, cached files, and offline data for this app on this device only.
        </p>
      </GlassBubbleCard>
    </main>
  );
}
