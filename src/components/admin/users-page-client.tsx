"use client";

import { useMemo, useState } from "react";
import { ShieldCheck, SlidersHorizontal, UserPlus, Users } from "lucide-react";
import { PASSWORD_RULES_TEXT } from "@/lib/auth-credentials";
import { checkPasswordStrength } from "@/lib/validation";
import { PageHeader } from "@/components/ui/PageHeader";
import { PageSection, PageShell } from "@/components/layout/page-shell";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { SidePanel } from "@/components/panels/SidePanel";

const PAGE_ACCESS_FIELDS = [
  { key: "canViewDashboard", label: "Dashboard", description: "Show the dashboard and operational overview." },
  { key: "canViewJobs", label: "Jobs", description: "Allow access to job lists and job detail pages." },
  { key: "canViewInventory", label: "Inventory", description: "Allow access to inventory records and stock views." },
  { key: "canViewTools", label: "Tools", description: "Allow access to the tools workspace and sign-outs." },
  { key: "canViewReports", label: "Reports", description: "Allow access to reporting pages and report previews." },
  { key: "canViewSuppliers", label: "Suppliers", description: "Allow access to supplier records and supplier detail." },
  { key: "canViewReorder", label: "Reorder", description: "Allow access to reorder queues and supplier recommendations." },
  { key: "canViewSettings", label: "Settings", description: "Allow access to workspace settings." },
] as const;

const INVENTORY_ACTION_FIELDS = [
  { key: "canAddInventory", label: "Add inventory", description: "Receive or create new stock records." },
  { key: "canEditInventory", label: "Edit inventory", description: "Edit inventory details such as manufacturer, category, and thresholds." },
  { key: "canMoveInventory", label: "Move inventory", description: "Transfer stock between locations." },
  { key: "canRemoveInventory", label: "Remove inventory", description: "Write off or remove stock from inventory." },
  { key: "canUseInventoryOnJob", label: "Use on job", description: "Consume stock directly against a job." },
  { key: "canReturnInventoryFromJob", label: "Return from job", description: "Return unused job stock back into inventory." },
  { key: "canManageLocations", label: "Manage locations", description: "Create and maintain stock locations." },
  { key: "canManageCategories", label: "Manage categories", description: "Create and maintain inventory categories." },
] as const;

const JOB_ACTION_FIELDS = [
  { key: "canCreateJobs", label: "Create jobs", description: "Create new jobs and assign initial context." },
  { key: "canEditJobs", label: "Edit jobs", description: "Edit job records, descriptions, and details." },
  { key: "canCloseJobs", label: "Close jobs", description: "Mark jobs complete and operationally closed." },
  { key: "canInvoiceJobs", label: "Invoice jobs", description: "Move jobs into invoiced status." },
  { key: "canViewJobSummaries", label: "View job summaries", description: "Open job summaries and quick operational context." },
] as const;

const TOOL_ACTION_FIELDS = [
  { key: "canViewOwnTools", label: "View my tools", description: "See personal tools owned by this user." },
  { key: "canAddOwnTools", label: "Add my tools", description: "Create personal tool records." },
  { key: "canEditOwnTools", label: "Edit my tools", description: "Update personal tools owned by this user." },
  { key: "canViewCompanyTools", label: "View company tools", description: "See shared company tool assets." },
  { key: "canRequestCompanyTools", label: "Request company tools", description: "Submit company tool requests." },
  { key: "canCheckoutCompanyTools", label: "Checkout company tools", description: "Assign or directly check out company tools." },
  { key: "canReturnCompanyTools", label: "Return company tools", description: "Submit shared tool returns." },
  { key: "canAcceptToolReturns", label: "Accept returns", description: "Accept pending shared tool returns." },
  { key: "canManageCompanyTools", label: "Manage company tools", description: "Maintain company tools, statuses, and assignments." },
] as const;

const ADMIN_ACTION_FIELDS = [
  { key: "canManageUsers", label: "Manage users", description: "Create users, update permissions, and remove users." },
  { key: "canManageSettings", label: "Manage settings", description: "Change workspace settings and configuration." },
  { key: "canExportData", label: "Export data", description: "Run exports and email report outputs." },
  { key: "canBackupRestore", label: "Backup and restore", description: "Create and restore backups." },
  { key: "canClearCache", label: "Clear cache", description: "Clear device cache and offline data." },
  { key: "canEnableModules", label: "Enable modules", description: "Turn advanced modules on or off." },
] as const;

const PERMISSION_GROUPS = [
  { title: "Page Access", items: PAGE_ACCESS_FIELDS },
  { title: "Inventory Actions", items: INVENTORY_ACTION_FIELDS },
  { title: "Job Actions", items: JOB_ACTION_FIELDS },
  { title: "Tool Actions", items: TOOL_ACTION_FIELDS },
  { title: "Admin Capabilities", items: ADMIN_ACTION_FIELDS },
] as const;

const PERMISSION_KEYS = PERMISSION_GROUPS.flatMap((group) => group.items.map((item) => item.key));

const ROLE_PRESETS = [
  { value: "ADMIN", label: "Admin", description: "Full access across the workspace." },
  { value: "MANAGER", label: "Manager", description: "Operational control without user administration by default." },
  { value: "STANDARD", label: "Standard", description: "Field-ready job, inventory, and tool access." },
  { value: "LIMITED", label: "Limited", description: "Restricted operational access with minimal financial visibility." },
] as const;

const FINANCIAL_MODES = [
  { value: "none", label: "None", description: "Hide all pricing and financial context." },
  { value: "total_only", label: "Total only", description: "Show line or record totals only." },
  { value: "base_only", label: "Base only", description: "Show base cost only." },
  { value: "base_margin_total", label: "Base, margin, total", description: "Show base cost, margin, and total." },
  { value: "full", label: "Full", description: "Show supplier cost and full job costing context." },
] as const;

type PermissionKey = (typeof PERMISSION_KEYS)[number];
type RolePreset = (typeof ROLE_PRESETS)[number]["value"];
type FinancialVisibilityMode = (typeof FINANCIAL_MODES)[number]["value"];
type PermissionShape = Record<PermissionKey, boolean>;

export interface AppUser extends PermissionShape {
  id: string;
  name: string;
  email: string;
  role: string;
  rolePreset: RolePreset;
  financialVisibilityMode: FinancialVisibilityMode;
}

interface UserDraft extends PermissionShape {
  name: string;
  email: string;
  role: string;
  rolePreset: RolePreset;
  financialVisibilityMode: FinancialVisibilityMode;
  password: string;
  confirm: string;
}

interface UsersPageClientProps {
  currentUserId: string;
  organizationName: string;
  initialUsers: AppUser[];
}

const ROLE_LABEL: Record<string, string> = {
  SUPER_ADMIN: "Super Admin",
  OFFICE: "Office",
  TECH: "Technician",
};

const ROLE_TONE: Record<string, string> = {
  SUPER_ADMIN: "bg-sky-400/12 text-sky-100 border-sky-300/20",
  OFFICE: "bg-emerald-400/12 text-emerald-100 border-emerald-300/20",
  TECH: "bg-white/[0.06] text-slate-200 border-white/10",
};

function emptyPermissions(): PermissionShape {
  return Object.fromEntries(PERMISSION_KEYS.map((key) => [key, false])) as PermissionShape;
}

function getPresetPermissions(rolePreset: RolePreset): PermissionShape & { financialVisibilityMode: FinancialVisibilityMode } {
  const base = emptyPermissions();

  switch (rolePreset) {
    case "ADMIN":
      return {
        ...Object.fromEntries(PERMISSION_KEYS.map((key) => [key, true])) as PermissionShape,
        financialVisibilityMode: "full",
      };
    case "MANAGER":
      return {
        ...base,
        canViewDashboard: true,
        canViewJobs: true,
        canViewInventory: true,
        canViewTools: true,
        canViewReports: true,
        canViewSuppliers: true,
        canViewReorder: true,
        canViewSettings: true,
        canAddInventory: true,
        canEditInventory: true,
        canMoveInventory: true,
        canRemoveInventory: true,
        canUseInventoryOnJob: true,
        canReturnInventoryFromJob: true,
        canManageLocations: true,
        canManageCategories: true,
        canCreateJobs: true,
        canEditJobs: true,
        canCloseJobs: true,
        canInvoiceJobs: true,
        canViewJobSummaries: true,
        canViewOwnTools: true,
        canAddOwnTools: true,
        canEditOwnTools: true,
        canViewCompanyTools: true,
        canRequestCompanyTools: true,
        canCheckoutCompanyTools: true,
        canReturnCompanyTools: true,
        canAcceptToolReturns: true,
        canManageCompanyTools: true,
        canManageSettings: true,
        canExportData: true,
        canClearCache: true,
        financialVisibilityMode: "base_margin_total",
      };
    case "LIMITED":
      return {
        ...base,
        canViewJobs: true,
        canViewInventory: true,
        canViewTools: true,
        canUseInventoryOnJob: true,
        canReturnInventoryFromJob: true,
        canViewJobSummaries: true,
        canViewOwnTools: true,
        canReturnCompanyTools: true,
        financialVisibilityMode: "none",
      };
    case "STANDARD":
    default:
      return {
        ...base,
        canViewDashboard: true,
        canViewJobs: true,
        canViewInventory: true,
        canViewTools: true,
        canMoveInventory: true,
        canUseInventoryOnJob: true,
        canReturnInventoryFromJob: true,
        canCreateJobs: true,
        canEditJobs: true,
        canViewJobSummaries: true,
        canViewOwnTools: true,
        canAddOwnTools: true,
        canEditOwnTools: true,
        canViewCompanyTools: true,
        canRequestCompanyTools: true,
        canReturnCompanyTools: true,
        financialVisibilityMode: "total_only",
      };
  }
}

function createDraft(user?: AppUser): UserDraft {
  const basePermissions = emptyPermissions();

  if (!user) {
    const preset = getPresetPermissions("STANDARD");
    return {
      name: "",
      email: "",
      role: "TECH",
      rolePreset: "STANDARD",
      password: "",
      confirm: "",
      ...basePermissions,
      ...preset,
    };
  }

  return {
    name: user.name,
    email: user.email,
    role: user.role,
    rolePreset: user.rolePreset,
    financialVisibilityMode: user.financialVisibilityMode,
    password: "",
    confirm: "",
    ...basePermissions,
    ...Object.fromEntries(PERMISSION_KEYS.map((key) => [key, user[key]])) as PermissionShape,
  };
}

function countEnabledPermissions(user: PermissionShape) {
  return PERMISSION_KEYS.filter((key) => user[key]).length;
}

function getFinancialModeLabel(mode: FinancialVisibilityMode) {
  return FINANCIAL_MODES.find((option) => option.value === mode)?.label ?? mode;
}

function normalizeUser(user: AppUser): AppUser {
  return {
    ...user,
    ...Object.fromEntries(PERMISSION_KEYS.map((key) => [key, Boolean(user[key])])) as PermissionShape,
  };
}

export function UsersPageClient({ currentUserId, organizationName, initialUsers }: UsersPageClientProps) {
  const [users, setUsers] = useState<AppUser[]>(initialUsers.map(normalizeUser));
  const [selectedUserId, setSelectedUserId] = useState<string | null>(initialUsers[0]?.id ?? null);
  const [drafts, setDrafts] = useState<Record<string, UserDraft>>(
    Object.fromEntries(initialUsers.map((user) => [user.id, createDraft(normalizeUser(user))]))
  );
  const [showCreatePanel, setShowCreatePanel] = useState(false);
  const [createDraftState, setCreateDraftState] = useState<UserDraft>(createDraft());
  const [error, setError] = useState("");
  const [createError, setCreateError] = useState("");
  const [savingId, setSavingId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const selectedUser = users.find((user) => user.id === selectedUserId) ?? null;
  const selectedDraft = selectedUser ? drafts[selectedUser.id] : null;

  const summary = useMemo(() => {
    const managers = users.filter((user) => user.rolePreset === "ADMIN" || user.rolePreset === "MANAGER").length;
    const hiddenFinancials = users.filter((user) => user.financialVisibilityMode === "none").length;
    return {
      total: users.length,
      managers,
      hiddenFinancials,
    };
  }, [users]);

  function updateDraft(id: string, patch: Partial<UserDraft>) {
    setDrafts((current) => ({
      ...current,
      [id]: {
        ...current[id],
        ...patch,
      },
    }));
  }

  function applyPreset(target: UserDraft, rolePreset: RolePreset): UserDraft {
    const preset = getPresetPermissions(rolePreset);
    return {
      ...target,
      ...preset,
      rolePreset,
      financialVisibilityMode: preset.financialVisibilityMode,
    };
  }

  async function fetchUsers() {
    const response = await fetch("/api/users", { cache: "no-store" });
    if (!response.ok) {
      throw new Error("Failed to refresh users");
    }

    const nextUsers = (await response.json()) as AppUser[];
    const normalized = nextUsers.map(normalizeUser);
    setUsers(normalized);
    setDrafts(Object.fromEntries(normalized.map((user) => [user.id, createDraft(user)])));

    if (!normalized.some((user) => user.id === selectedUserId)) {
      setSelectedUserId(normalized[0]?.id ?? null);
    }
  }

  function validateDraft(draft: UserDraft, requirePassword: boolean) {
    if (!draft.name.trim()) {
      return "Name is required.";
    }

    if (!draft.email.trim()) {
      return "Email is required.";
    }

    if (requirePassword || draft.password) {
      if (!draft.password) {
        return "Password is required.";
      }
      const result = checkPasswordStrength(draft.password);
      if (!result.valid) {
        return result.message ?? "Password is invalid.";
      }
      if (draft.password !== draft.confirm) {
        return "Passwords do not match.";
      }
    }

    return "";
  }

  async function handleCreate() {
    const validationMessage = validateDraft(createDraftState, true);
    if (validationMessage) {
      setCreateError(validationMessage);
      return;
    }

    setCreating(true);
    setCreateError("");

    try {
      const response = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...createDraftState,
          name: createDraftState.name.trim(),
          email: createDraftState.email.trim(),
        }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.error || "Failed to create user.");
      }

      await fetchUsers();
      setShowCreatePanel(false);
      setCreateDraftState(createDraft());
    } catch (createIssue) {
      setCreateError(createIssue instanceof Error ? createIssue.message : "Failed to create user.");
    } finally {
      setCreating(false);
    }
  }

  async function handleSave(userId: string) {
    const draft = drafts[userId];
    const validationMessage = validateDraft(draft, false);
    if (validationMessage) {
      setError(validationMessage);
      return;
    }

    setSavingId(userId);
    setError("");

    try {
      const response = await fetch(`/api/users/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...draft,
          name: draft.name.trim(),
          email: draft.email.trim(),
          ...(draft.password ? { password: draft.password } : {}),
        }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.error || "Failed to save user.");
      }

      const updatedUser = normalizeUser(await response.json());
      setUsers((current) => current.map((user) => (user.id === userId ? updatedUser : user)));
      setDrafts((current) => ({
        ...current,
        [userId]: createDraft(updatedUser),
      }));
    } catch (saveIssue) {
      setError(saveIssue instanceof Error ? saveIssue.message : "Failed to save user.");
    } finally {
      setSavingId(null);
    }
  }

  async function handleDelete(userId: string) {
    if (userId === currentUserId) {
      setError("You cannot remove your own account.");
      return;
    }

    if (!confirm("Remove this user? This cannot be undone.")) {
      return;
    }

    setDeletingId(userId);
    setError("");

    try {
      const response = await fetch(`/api/users/${userId}`, { method: "DELETE" });
      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.error || "Failed to remove user.");
      }

      const nextUsers = users.filter((user) => user.id !== userId);
      setUsers(nextUsers);
      setDrafts((current) => {
        const clone = { ...current };
        delete clone[userId];
        return clone;
      });
      setSelectedUserId(nextUsers[0]?.id ?? null);
    } catch (deleteIssue) {
      setError(deleteIssue instanceof Error ? deleteIssue.message : "Failed to remove user.");
    } finally {
      setDeletingId(null);
    }
  }

  function renderPermissionGroup(
    draft: UserDraft,
    onChange: (key: PermissionKey, value: boolean) => void
  ) {
    return PERMISSION_GROUPS.map((group) => (
      <Card key={group.title} className="space-y-4 bg-white/[0.03] p-4">
        <div>
          <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-300">{group.title}</h3>
          <p className="mt-1 text-sm text-slate-400">Fine-tune what this user can see and do.</p>
        </div>
        <div className="space-y-3">
          {group.items.map((item) => (
            <div
              key={item.key}
              className="flex items-start justify-between gap-4 rounded-2xl border border-white/8 bg-white/[0.025] px-4 py-3"
            >
              <div>
                <p className="text-sm font-medium text-white">{item.label}</p>
                <p className="mt-1 text-xs leading-5 text-slate-400">{item.description}</p>
              </div>
              <button
                type="button"
                onClick={() => onChange(item.key, !draft[item.key])}
                className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors ${draft[item.key] ? "bg-sky-500/80" : "bg-slate-700/90"}`}
                aria-pressed={draft[item.key]}
              >
                <span
                  className={`inline-block h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${draft[item.key] ? "translate-x-6" : "translate-x-1"}`}
                />
              </button>
            </div>
          ))}
        </div>
      </Card>
    ));
  }

  function renderUserPanel(user: AppUser, draft: UserDraft) {
    const presetDefaults = getPresetPermissions(draft.rolePreset);
    const hasCustomOverrides =
      draft.financialVisibilityMode !== presetDefaults.financialVisibilityMode ||
      PERMISSION_KEYS.some((key) => draft[key] !== presetDefaults[key]);

    return (
      <div className="space-y-5">
        <Card className="space-y-4 bg-white/[0.03] p-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">User profile</p>
              <h3 className="mt-2 text-xl font-semibold tracking-[-0.03em] text-white">{user.name}</h3>
              <p className="mt-2 text-sm text-slate-400">Adjust access for {organizationName} without forcing a generic role-only setup.</p>
            </div>
            <Badge tone="blue">{countEnabledPermissions(draft)} enabled</Badge>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <label className="space-y-2">
              <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Name</span>
              <input
                value={draft.name}
                onChange={(event) => updateDraft(user.id, { name: event.target.value })}
                className="w-full rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-3 text-sm text-white outline-none"
              />
            </label>
            <label className="space-y-2">
              <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Email</span>
              <input
                type="email"
                value={draft.email}
                onChange={(event) => updateDraft(user.id, { email: event.target.value })}
                className="w-full rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-3 text-sm text-white outline-none"
              />
            </label>
            <label className="space-y-2">
              <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Role</span>
              <select
                value={draft.role}
                onChange={(event) => updateDraft(user.id, { role: event.target.value })}
                className="w-full rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-3 text-sm text-white outline-none"
              >
                <option value="TECH">Technician</option>
                <option value="OFFICE">Office</option>
                <option value="SUPER_ADMIN">Super Admin</option>
              </select>
            </label>
            <label className="space-y-2">
              <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Preset</span>
              <select
                value={draft.rolePreset}
                onChange={(event) => updateDraft(user.id, applyPreset(draft, event.target.value as RolePreset))}
                className="w-full rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-3 text-sm text-white outline-none"
              >
                {ROLE_PRESETS.map((preset) => (
                  <option key={preset.value} value={preset.value}>{preset.label}</option>
                ))}
              </select>
            </label>
          </div>

          <label className="space-y-2">
            <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Financial visibility</span>
            <select
              value={draft.financialVisibilityMode}
              onChange={(event) => updateDraft(user.id, { financialVisibilityMode: event.target.value as FinancialVisibilityMode })}
              className="w-full rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-3 text-sm text-white outline-none"
            >
              {FINANCIAL_MODES.map((mode) => (
                <option key={mode.value} value={mode.value}>{mode.label}</option>
              ))}
            </select>
            <p className="text-xs leading-5 text-slate-400">
              {FINANCIAL_MODES.find((mode) => mode.value === draft.financialVisibilityMode)?.description}
            </p>
          </label>

          <div className="rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-3 text-sm text-slate-300">
            <p className="font-medium text-white">Preset behavior</p>
            <p className="mt-1 text-slate-400">
              {ROLE_PRESETS.find((preset) => preset.value === draft.rolePreset)?.description}
            </p>
            {hasCustomOverrides ? <p className="mt-2 text-sky-200">Custom overrides are active on top of the preset.</p> : null}
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <label className="space-y-2">
              <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">New password</span>
              <input
                type="password"
                value={draft.password}
                onChange={(event) => updateDraft(user.id, { password: event.target.value })}
                placeholder="Leave blank to keep current"
                className="w-full rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-3 text-sm text-white outline-none"
              />
            </label>
            <label className="space-y-2">
              <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Confirm password</span>
              <input
                type="password"
                value={draft.confirm}
                onChange={(event) => updateDraft(user.id, { confirm: event.target.value })}
                placeholder="Repeat new password"
                className="w-full rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-3 text-sm text-white outline-none"
              />
            </label>
          </div>
          <p className="text-xs text-slate-500">{PASSWORD_RULES_TEXT}</p>
        </Card>

        {renderPermissionGroup(draft, (key, value) => updateDraft(user.id, { [key]: value } as Partial<UserDraft>))}
      </div>
    );
  }

  function renderCreatePanel() {
    return (
      <div className="space-y-5">
        <Card className="space-y-4 bg-white/[0.03] p-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">New teammate</p>
            <h3 className="mt-2 text-xl font-semibold tracking-[-0.03em] text-white">Create a new user</h3>
            <p className="mt-2 text-sm text-slate-400">Start with a preset, then override permissions immediately if needed.</p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <label className="space-y-2">
              <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Name</span>
              <input
                value={createDraftState.name}
                onChange={(event) => setCreateDraftState((current) => ({ ...current, name: event.target.value }))}
                className="w-full rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-3 text-sm text-white outline-none"
              />
            </label>
            <label className="space-y-2">
              <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Email</span>
              <input
                type="email"
                value={createDraftState.email}
                onChange={(event) => setCreateDraftState((current) => ({ ...current, email: event.target.value }))}
                className="w-full rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-3 text-sm text-white outline-none"
              />
            </label>
            <label className="space-y-2">
              <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Role</span>
              <select
                value={createDraftState.role}
                onChange={(event) => setCreateDraftState((current) => ({ ...current, role: event.target.value }))}
                className="w-full rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-3 text-sm text-white outline-none"
              >
                <option value="TECH">Technician</option>
                <option value="OFFICE">Office</option>
                <option value="SUPER_ADMIN">Super Admin</option>
              </select>
            </label>
            <label className="space-y-2">
              <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Preset</span>
              <select
                value={createDraftState.rolePreset}
                onChange={(event) => setCreateDraftState((current) => applyPreset(current, event.target.value as RolePreset))}
                className="w-full rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-3 text-sm text-white outline-none"
              >
                {ROLE_PRESETS.map((preset) => (
                  <option key={preset.value} value={preset.value}>{preset.label}</option>
                ))}
              </select>
            </label>
            <label className="space-y-2">
              <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Password</span>
              <input
                type="password"
                value={createDraftState.password}
                onChange={(event) => setCreateDraftState((current) => ({ ...current, password: event.target.value }))}
                className="w-full rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-3 text-sm text-white outline-none"
              />
            </label>
            <label className="space-y-2">
              <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Confirm password</span>
              <input
                type="password"
                value={createDraftState.confirm}
                onChange={(event) => setCreateDraftState((current) => ({ ...current, confirm: event.target.value }))}
                className="w-full rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-3 text-sm text-white outline-none"
              />
            </label>
          </div>

          <label className="space-y-2">
            <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Financial visibility</span>
            <select
              value={createDraftState.financialVisibilityMode}
              onChange={(event) => setCreateDraftState((current) => ({ ...current, financialVisibilityMode: event.target.value as FinancialVisibilityMode }))}
              className="w-full rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-3 text-sm text-white outline-none"
            >
              {FINANCIAL_MODES.map((mode) => (
                <option key={mode.value} value={mode.value}>{mode.label}</option>
              ))}
            </select>
          </label>
          <p className="text-xs text-slate-500">{PASSWORD_RULES_TEXT}</p>
        </Card>

        {renderPermissionGroup(
          createDraftState,
          (key, value) => setCreateDraftState((current) => ({ ...current, [key]: value }))
        )}
      </div>
    );
  }

  return (
    <PageShell className="form-screen">
      <PageHeader
        eyebrow={<Badge tone="blue">Users & Roles</Badge>}
        title="Control who sees what"
        description="Manage access by user instead of forcing the whole workspace into one coarse role model. Page visibility, action permissions, and financial visibility all live here."
        actions={
          <Button variant="primary" onClick={() => { setCreateError(""); setShowCreatePanel(true); }}>
            <UserPlus className="h-4 w-4" />
            Add user
          </Button>
        }
      />

      {(error || createError) ? (
        <PageSection>
          <Card className="border-rose-400/20 bg-rose-500/[0.08] text-rose-100">
            {error || createError}
          </Card>
        </PageSection>
      ) : null}

      <PageSection className="grid gap-4 md:grid-cols-3">
        <Card className="bg-white/[0.03]">
          <div className="flex items-center gap-3">
            <div className="rounded-2xl border border-white/10 bg-white/[0.05] p-3 text-slate-100">
              <Users className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Team size</p>
              <p className="mt-2 text-2xl font-semibold text-white">{summary.total}</p>
            </div>
          </div>
        </Card>
        <Card className="bg-white/[0.03]">
          <div className="flex items-center gap-3">
            <div className="rounded-2xl border border-white/10 bg-white/[0.05] p-3 text-slate-100">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Leadership presets</p>
              <p className="mt-2 text-2xl font-semibold text-white">{summary.managers}</p>
            </div>
          </div>
        </Card>
        <Card className="bg-white/[0.03]">
          <div className="flex items-center gap-3">
            <div className="rounded-2xl border border-white/10 bg-white/[0.05] p-3 text-slate-100">
              <SlidersHorizontal className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Pricing hidden</p>
              <p className="mt-2 text-2xl font-semibold text-white">{summary.hiddenFinancials}</p>
            </div>
          </div>
        </Card>
      </PageSection>

      <PageSection>
        <Card className="space-y-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold text-white">Team directory</h2>
              <p className="mt-2 text-sm leading-6 text-slate-300/78">Select a teammate to open their detailed permissions panel. The workspace shell will only show pages each person is allowed to access.</p>
            </div>
            <Badge tone="slate">{organizationName}</Badge>
          </div>
          <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
            {users.map((user) => (
              <button
                key={user.id}
                type="button"
                onClick={() => { setSelectedUserId(user.id); setError(""); }}
                className={`rounded-[1.6rem] border p-4 text-left transition-all ${selectedUserId === user.id ? "border-sky-300/30 bg-sky-400/[0.08] shadow-[0_18px_32px_rgba(14,165,233,0.1)]" : "border-white/8 bg-white/[0.03] hover:border-white/16 hover:bg-white/[0.05]"}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-base font-semibold text-white">{user.name}</p>
                    <p className="mt-1 text-sm text-slate-400">{user.email}</p>
                  </div>
                  {user.id === currentUserId ? <Badge tone="blue">You</Badge> : null}
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  <span className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${ROLE_TONE[user.role] ?? ROLE_TONE.TECH}`}>
                    {ROLE_LABEL[user.role] ?? user.role}
                  </span>
                  <span className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-xs font-semibold text-slate-200">
                    {ROLE_PRESETS.find((preset) => preset.value === user.rolePreset)?.label ?? user.rolePreset}
                  </span>
                  <span className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-xs text-slate-300">
                    {getFinancialModeLabel(user.financialVisibilityMode)}
                  </span>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                  <div className="rounded-2xl border border-white/8 bg-white/[0.03] px-3 py-3">
                    <p className="text-[0.7rem] uppercase tracking-[0.16em] text-slate-500">Visible pages</p>
                    <p className="mt-2 font-semibold text-white">{PAGE_ACCESS_FIELDS.filter((item) => user[item.key]).length}</p>
                  </div>
                  <div className="rounded-2xl border border-white/8 bg-white/[0.03] px-3 py-3">
                    <p className="text-[0.7rem] uppercase tracking-[0.16em] text-slate-500">Enabled actions</p>
                    <p className="mt-2 font-semibold text-white">{countEnabledPermissions(user)}</p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </Card>
      </PageSection>

      <SidePanel
        open={Boolean(selectedUser && selectedDraft)}
        onClose={() => setSelectedUserId(null)}
        title={selectedUser?.name ?? "User permissions"}
        description={selectedUser ? `${selectedUser.email} • ${ROLE_PRESETS.find((preset) => preset.value === selectedUser.rolePreset)?.label ?? selectedUser.rolePreset}` : undefined}
        footer={selectedUser && selectedDraft ? (
          <div className="flex flex-col gap-3">
            <Button variant="primary" onClick={() => handleSave(selectedUser.id)} disabled={savingId === selectedUser.id}>
              {savingId === selectedUser.id ? "Saving..." : "Save permissions"}
            </Button>
            <div className="grid gap-3 sm:grid-cols-2">
              <Button variant="secondary" onClick={() => setDrafts((current) => ({ ...current, [selectedUser.id]: createDraft(selectedUser) }))}>
                Reset changes
              </Button>
              {selectedUser.id !== currentUserId ? (
                <Button variant="danger" onClick={() => handleDelete(selectedUser.id)} disabled={deletingId === selectedUser.id}>
                  {deletingId === selectedUser.id ? "Removing..." : "Remove user"}
                </Button>
              ) : null}
            </div>
          </div>
        ) : null}
      >
        {selectedUser && selectedDraft ? renderUserPanel(selectedUser, selectedDraft) : null}
      </SidePanel>

      <SidePanel
        open={showCreatePanel}
        onClose={() => setShowCreatePanel(false)}
        title="Add user"
        description="Create a teammate and define exactly what they can see or change."
        footer={
          <div className="flex flex-col gap-3">
            <Button variant="primary" onClick={handleCreate} disabled={creating}>
              {creating ? "Creating..." : "Create user"}
            </Button>
            <Button variant="secondary" onClick={() => setShowCreatePanel(false)}>
              Cancel
            </Button>
          </div>
        }
      >
        {renderCreatePanel()}
      </SidePanel>
    </PageShell>
  );
}

export default UsersPageClient;