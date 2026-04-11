"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { HardDriveDownload, ShieldCheck, Users } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { PageSection, PageShell } from "@/components/layout/page-shell";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import {
  clearOfflineQueue,
  getOfflineQueueSummary,
  subscribeToOfflineQueue,
  type OfflineQueueSummary,
} from "@/lib/offline-queue";

const EMAIL_CLIENTS = [
  { value: "default", label: "Default client" },
  { value: "gmail", label: "Gmail" },
  { value: "outlook", label: "Outlook" },
  { value: "apple", label: "Apple Mail" },
] as const;

const FINANCIAL_MODES = [
  { value: "none", label: "None", description: "Hide all pricing in new records by default." },
  { value: "total_only", label: "Total only", description: "Expose totals without showing the underlying base cost." },
  { value: "base_only", label: "Base only", description: "Show base cost without margin or supplier detail." },
  { value: "base_margin_total", label: "Base, margin, total", description: "Balanced operational visibility for managers." },
  { value: "full", label: "Full", description: "Expose supplier cost and job costing context." },
] as const;

export interface AppSettings {
  organizationName: string;
  organizationContactEmail: string;
  canManageSettings: boolean;
  canManageUsers: boolean;
  canClearCache: boolean;
  simpleMode: boolean;
  premiumEnabled: boolean;
  enableToolsModule: boolean;
  requireToolReturnAcceptance: boolean;
  allowOfflineMode: boolean;
  allowOfflineQueue: boolean;
  allowOfflineCompanyToolFlows: boolean;
  offlineAutoSync: boolean;
  offlineCacheDays: number;
  defaultFinancialVisibilityMode: string;
  enableMultiLocation: boolean;
  enableVariants: boolean;
  enableImportWizard: boolean;
  enableLotExpiry: boolean;
  enableBackupZip: boolean;
  enableReportScheduler: boolean;
  enableAITagging: boolean;
  preferredEmailClient: string;
  composeSubjectTemplate: string;
  defaultLowStockAmber: number;
  defaultLowStockRed: number;
}

interface SettingsPageClientProps {
  initialSettings: AppSettings;
}

type ToggleKey =
  | "simpleMode"
  | "premiumEnabled"
  | "enableToolsModule"
  | "requireToolReturnAcceptance"
  | "allowOfflineMode"
  | "allowOfflineQueue"
  | "allowOfflineCompanyToolFlows"
  | "offlineAutoSync"
  | "enableMultiLocation"
  | "enableVariants"
  | "enableImportWizard"
  | "enableLotExpiry"
  | "enableBackupZip"
  | "enableReportScheduler"
  | "enableAITagging";

function SectionCard({ title, description, children }: { title: string; description: string; children: React.ReactNode }) {
  return (
    <Card className="space-y-4 bg-white/[0.03] p-5">
      <div>
        <h2 className="text-lg font-semibold text-white">{title}</h2>
        <p className="mt-2 text-sm leading-6 text-slate-300/78">{description}</p>
      </div>
      {children}
    </Card>
  );
}

function ToggleRow({
  label,
  description,
  checked,
  disabled,
  onToggle,
  badge,
}: {
  label: string;
  description: string;
  checked: boolean;
  disabled: boolean;
  onToggle: () => void;
  badge?: string;
}) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-2xl border border-white/8 bg-white/[0.025] px-4 py-3">
      <div>
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium text-white">{label}</p>
          {badge ? <Badge tone="slate">{badge}</Badge> : null}
        </div>
        <p className="mt-1 text-xs leading-5 text-slate-400">{description}</p>
      </div>
      <button
        type="button"
        onClick={onToggle}
        disabled={disabled}
        className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors ${checked ? "bg-sky-500/80" : "bg-slate-700/90"} ${disabled ? "cursor-not-allowed opacity-55" : ""}`}
        aria-pressed={checked}
      >
        <span className={`inline-block h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${checked ? "translate-x-6" : "translate-x-1"}`} />
      </button>
    </div>
  );
}

export function SettingsPageClient({ initialSettings }: SettingsPageClientProps) {
  const [settings, setSettings] = useState<AppSettings>(initialSettings);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [saved, setSaved] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [cleared, setCleared] = useState(false);
  const [storageUsage, setStorageUsage] = useState<{ usedMB: number; quotaMB: number; percent: number } | null>(null);
  const [queueSummary, setQueueSummary] = useState<OfflineQueueSummary>({
    total: 0,
    queued: 0,
    syncing: 0,
    failed: 0,
    conflict: 0,
  });

  const readOnly = !settings.canManageSettings;

  useEffect(() => {
    void refreshStorageUsage();
    setQueueSummary(getOfflineQueueSummary());
    return subscribeToOfflineQueue(() => setQueueSummary(getOfflineQueueSummary()));
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
      setStorageUsage({
        usedMB: Math.round((used / (1024 * 1024)) * 100) / 100,
        quotaMB: Math.round((quota / (1024 * 1024)) * 100) / 100,
        percent: quota > 0 ? Math.round((used / quota) * 100) : 0,
      });
    } catch {
      setStorageUsage(null);
    }
  }

  function updateField<K extends keyof AppSettings>(key: K, value: AppSettings[K]) {
    setSettings((current) => ({ ...current, [key]: value }));
  }

  function toggle(key: ToggleKey) {
    updateField(key, !settings[key] as AppSettings[typeof key]);
  }

  async function handleSave() {
    setSaving(true);
    setSaveError("");

    try {
      const response = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.error || "Failed to save settings.");
      }

      setSettings(await response.json());
      setSaved(true);
      window.setTimeout(() => setSaved(false), 2200);
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : "Failed to save settings.");
    } finally {
      setSaving(false);
    }
  }

  async function clearAppStorage() {
    setClearing(true);
    setCleared(false);

    try {
      clearOfflineQueue();

      if (typeof window !== "undefined") {
        localStorage.clear();
        sessionStorage.clear();
      }

      if (typeof window !== "undefined" && "caches" in window) {
        const keys = await caches.keys();
        await Promise.all(keys.map((key) => caches.delete(key)));
      }

      if ("serviceWorker" in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        await Promise.all(registrations.map((registration) => registration.unregister()));
      }

      if (typeof indexedDB !== "undefined" && "databases" in indexedDB) {
        const databases = await (indexedDB as IDBFactory & {
          databases?: () => Promise<Array<{ name?: string }>>;
        }).databases?.();

        if (databases) {
          await Promise.all(
            databases
              .filter((database) => database.name)
              .map(
                (database) =>
                  new Promise<void>((resolve) => {
                    const request = indexedDB.deleteDatabase(database.name as string);
                    request.onsuccess = () => resolve();
                    request.onerror = () => resolve();
                    request.onblocked = () => resolve();
                  })
              )
          );
        }
      }

      await refreshStorageUsage();
      setQueueSummary(getOfflineQueueSummary());
      setCleared(true);
      window.setTimeout(() => setCleared(false), 2400);
    } finally {
      setClearing(false);
    }
  }

  return (
    <PageShell className="form-screen">
      <PageHeader
        eyebrow={<Badge tone="blue">Workspace Settings</Badge>}
        title="Tune the platform, not the brand"
        description="Keep the current dark operational shell, but control permissions, financial defaults, tool rules, and offline behavior from one structured settings surface."
        actions={
          readOnly ? (
            <Badge tone="slate">Read-only</Badge>
          ) : (
            <Button variant="primary" onClick={handleSave} disabled={saving}>
              {saving ? "Saving..." : saved ? "Saved" : "Save settings"}
            </Button>
          )
        }
      />

      {saveError ? (
        <PageSection>
          <Card className="border-rose-400/20 bg-rose-500/[0.08] text-rose-100">{saveError}</Card>
        </PageSection>
      ) : null}

      {readOnly ? (
        <PageSection>
          <Card className="border-sky-400/20 bg-sky-500/[0.08] text-sky-100">
            You can view this workspace configuration, but only users with settings-management permission can change it.
          </Card>
        </PageSection>
      ) : null}

      <PageSection className="grid gap-4 xl:grid-cols-2">
        <SectionCard title="Workspace" description="Business identity and high-level operating defaults.">
          <div className="grid gap-4 md:grid-cols-2">
            <label className="space-y-2">
              <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Workspace name</span>
              <input
                value={settings.organizationName}
                disabled={readOnly}
                onChange={(event) => updateField("organizationName", event.target.value)}
                className="w-full rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-3 text-sm text-white outline-none disabled:opacity-60"
              />
            </label>
            <label className="space-y-2">
              <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Contact email</span>
              <input
                type="email"
                value={settings.organizationContactEmail}
                disabled={readOnly}
                onChange={(event) => updateField("organizationContactEmail", event.target.value)}
                className="w-full rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-3 text-sm text-white outline-none disabled:opacity-60"
              />
            </label>
          </div>
          <div className="space-y-3">
            <ToggleRow label="Premium experience" description="Keep premium features active across the app." checked={settings.premiumEnabled} disabled={readOnly} onToggle={() => toggle("premiumEnabled")} badge="UI" />
            <ToggleRow label="Simple mode" description="Reduce advanced surfaces when you need a leaner workspace." checked={settings.simpleMode} disabled={readOnly} onToggle={() => toggle("simpleMode")} />
          </div>
        </SectionCard>

        <SectionCard title="Users & Roles" description="Permission control now lives per user, including page access and financial visibility.">
          <div className="rounded-[1.6rem] border border-white/8 bg-white/[0.025] p-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 text-white">
                  <Users className="h-4 w-4" />
                  <p className="text-sm font-medium">Manage Users</p>
                </div>
                <p className="mt-2 text-sm leading-6 text-slate-400">Open the detailed user directory to control page visibility, action permissions, and financial visibility per person.</p>
              </div>
              {settings.canManageUsers ? <Badge tone="blue">Editable</Badge> : <Badge tone="slate">View only</Badge>}
            </div>
            <div className="mt-4">
              {settings.canManageUsers ? (
                <Link href="/admin/users" className="inline-flex items-center gap-2 rounded-2xl border border-sky-400/20 bg-sky-500/[0.08] px-4 py-2.5 text-sm font-semibold text-sky-100 transition-colors hover:bg-sky-500/[0.14]">
                  Open user permissions
                </Link>
              ) : (
                <p className="text-sm text-slate-400">A workspace admin controls user permissions from the dedicated manage-users view.</p>
              )}
            </div>
          </div>
        </SectionCard>

        <SectionCard title="Inventory Rules" description="Operational defaults that shape how inventory behaves in the field.">
          <div className="space-y-3">
            <ToggleRow label="Multi-location inventory" description="Track stock across multiple locations and transfers." checked={settings.enableMultiLocation} disabled={readOnly} onToggle={() => toggle("enableMultiLocation")} badge="Inventory" />
            <ToggleRow label="Variants" description="Allow size, model, or variant-specific inventory records." checked={settings.enableVariants} disabled={readOnly} onToggle={() => toggle("enableVariants")} />
            <ToggleRow label="Lot and expiry tracking" description="Capture lot and expiry context in inventory movements." checked={settings.enableLotExpiry} disabled={readOnly} onToggle={() => toggle("enableLotExpiry")} />
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <label className="space-y-2">
              <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Low stock threshold</span>
              <input
                type="number"
                min={0}
                disabled={readOnly}
                value={settings.defaultLowStockAmber}
                onChange={(event) => updateField("defaultLowStockAmber", Number(event.target.value) || 0)}
                className="w-full rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-3 text-sm text-white outline-none disabled:opacity-60"
              />
            </label>
            <label className="space-y-2">
              <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Critical threshold</span>
              <input
                type="number"
                min={0}
                disabled={readOnly}
                value={settings.defaultLowStockRed}
                onChange={(event) => updateField("defaultLowStockRed", Number(event.target.value) || 0)}
                className="w-full rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-3 text-sm text-white outline-none disabled:opacity-60"
              />
            </label>
          </div>
        </SectionCard>

        <SectionCard title="Tools Rules" description="Control the shared tools module and how company sign-outs are finalized.">
          <div className="space-y-3">
            <ToggleRow label="Tools module" description="Show the top-level tools workspace and enable tool-specific flows." checked={settings.enableToolsModule} disabled={readOnly} onToggle={() => toggle("enableToolsModule")} badge="Module" />
            <ToggleRow label="Require return acceptance" description="Returns stay pending until an authorized user accepts them." checked={settings.requireToolReturnAcceptance} disabled={readOnly} onToggle={() => toggle("requireToolReturnAcceptance")} />
            <ToggleRow label="Allow offline company tool actions" description="Permit requests, returns, and sign-outs to queue while offline." checked={settings.allowOfflineCompanyToolFlows} disabled={readOnly} onToggle={() => toggle("allowOfflineCompanyToolFlows")} />
          </div>
        </SectionCard>

        <SectionCard title="Financial Visibility" description="Choose the default pricing posture for new permission presets and workspace-wide reporting behavior.">
          <label className="space-y-2">
            <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Default financial mode</span>
            <select
              value={settings.defaultFinancialVisibilityMode}
              disabled={readOnly}
              onChange={(event) => updateField("defaultFinancialVisibilityMode", event.target.value)}
              className="w-full rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-3 text-sm text-white outline-none disabled:opacity-60"
            >
              {FINANCIAL_MODES.map((mode) => (
                <option key={mode.value} value={mode.value}>{mode.label}</option>
              ))}
            </select>
            <p className="text-xs leading-5 text-slate-400">{FINANCIAL_MODES.find((mode) => mode.value === settings.defaultFinancialVisibilityMode)?.description}</p>
          </label>
        </SectionCard>

        <SectionCard title="Offline & Sync" description="Set how the workspace behaves when a field device loses connectivity.">
          <div className="space-y-3">
            <ToggleRow label="Offline mode" description="Cache the UI shell and allow the app to keep working after the first load." checked={settings.allowOfflineMode} disabled={readOnly} onToggle={() => toggle("allowOfflineMode")} badge="Offline" />
            <ToggleRow label="Mutation queue" description="Queue create, update, move, use, and return actions until connectivity comes back." checked={settings.allowOfflineQueue} disabled={readOnly} onToggle={() => toggle("allowOfflineQueue")} />
            <ToggleRow label="Auto-sync when online" description="Flush queued actions automatically when the device reconnects." checked={settings.offlineAutoSync} disabled={readOnly} onToggle={() => toggle("offlineAutoSync")} />
          </div>
          <label className="space-y-2">
            <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Offline cache retention (days)</span>
            <input
              type="number"
              min={1}
              max={365}
              disabled={readOnly}
              value={settings.offlineCacheDays}
              onChange={(event) => updateField("offlineCacheDays", Number(event.target.value) || 1)}
              className="w-full rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-3 text-sm text-white outline-none disabled:opacity-60"
            />
          </label>
          <div className="grid gap-3 md:grid-cols-4">
            <QueueStat label="Queued" value={queueSummary.queued} />
            <QueueStat label="Syncing" value={queueSummary.syncing} />
            <QueueStat label="Failed" value={queueSummary.failed} />
            <QueueStat label="Conflicts" value={queueSummary.conflict} />
          </div>
        </SectionCard>

        <SectionCard title="Email & Export" description="Control outbound report behavior and export tools.">
          <div className="grid gap-4 md:grid-cols-2">
            <label className="space-y-2">
              <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Preferred email client</span>
              <select
                value={settings.preferredEmailClient}
                disabled={readOnly}
                onChange={(event) => updateField("preferredEmailClient", event.target.value)}
                className="w-full rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-3 text-sm text-white outline-none disabled:opacity-60"
              >
                {EMAIL_CLIENTS.map((client) => (
                  <option key={client.value} value={client.value}>{client.label}</option>
                ))}
              </select>
            </label>
            <label className="space-y-2">
              <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Subject template</span>
              <input
                value={settings.composeSubjectTemplate}
                disabled={readOnly}
                onChange={(event) => updateField("composeSubjectTemplate", event.target.value)}
                className="w-full rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-3 text-sm text-white outline-none disabled:opacity-60"
              />
            </label>
          </div>
          <ToggleRow label="Backup and export ZIPs" description="Keep backup and restore hooks available for structured exports." checked={settings.enableBackupZip} disabled={readOnly} onToggle={() => toggle("enableBackupZip")} />
        </SectionCard>

        <SectionCard title="Advanced Modules" description="Feature modules that expand the workspace beyond the baseline field workflow.">
          <div className="space-y-3">
            <ToggleRow label="Import wizard" description="CSV import and mapping support for onboarding new inventory." checked={settings.enableImportWizard} disabled={readOnly} onToggle={() => toggle("enableImportWizard")} badge="Import" />
            <ToggleRow label="Scheduled reports" description="Generate recurring reports without manual intervention." checked={settings.enableReportScheduler} disabled={readOnly} onToggle={() => toggle("enableReportScheduler")} />
            <ToggleRow label="AI tagging" description="Use AI-assisted record tagging and enrichment." checked={settings.enableAITagging} disabled={readOnly} onToggle={() => toggle("enableAITagging")} badge="Beta" />
          </div>
        </SectionCard>

        <SectionCard title="Storage & Cache" description="Inspect device storage usage and clear cached shell or queued mutations when needed.">
          <div className="rounded-[1.6rem] border border-white/8 bg-white/[0.025] p-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 text-white">
                  <HardDriveDownload className="h-4 w-4" />
                  <p className="text-sm font-medium">Device cache</p>
                </div>
                <p className="mt-2 text-sm leading-6 text-slate-400">Clear local storage, service worker caches, offline queue entries, and cached records on this device only.</p>
              </div>
              {cleared ? <Badge tone="green">Cleared</Badge> : null}
            </div>
            <div className="mt-4 space-y-3">
              <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-3 text-sm text-slate-300">
                <p>
                  Storage in use: {storageUsage ? `${storageUsage.usedMB} MB / ${storageUsage.quotaMB} MB` : "Unavailable"}
                </p>
                {storageUsage ? (
                  <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/[0.05]">
                    <div className="h-full rounded-full bg-sky-400/80" style={{ width: `${Math.min(storageUsage.percent, 100)}%` }} />
                  </div>
                ) : null}
              </div>
              <Button variant="secondary" onClick={clearAppStorage} disabled={clearing || (!settings.canManageSettings && !settings.canClearCache)}>
                {clearing ? "Clearing..." : "Clear device cache"}
              </Button>
            </div>
          </div>
        </SectionCard>
      </PageSection>
    </PageShell>
  );
}

function QueueStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-white/8 bg-white/[0.03] px-3 py-3">
      <p className="text-[0.68rem] uppercase tracking-[0.16em] text-slate-500">{label}</p>
      <p className="mt-2 text-lg font-semibold text-white">{value}</p>
    </div>
  );
}

export default SettingsPageClient;