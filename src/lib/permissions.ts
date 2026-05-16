import { redirect } from "next/navigation";
import type { NextRequest, NextResponse } from "next/server";
import { getSession, type SessionPayload, type UserRole } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { requireRequestContext } from "@/lib/request-context";

export const PAGE_ACCESS_KEYS = [
  "canViewDashboard",
  "canViewJobs",
  "canViewInventory",
  "canViewTools",
  "canViewReports",
  "canViewSuppliers",
  "canViewReorder",
  "canViewSettings",
] as const;

export const INVENTORY_ACTION_KEYS = [
  "canAddInventory",
  "canEditInventory",
  "canMoveInventory",
  "canRemoveInventory",
  "canUseInventoryOnJob",
  "canReturnInventoryFromJob",
  "canManageLocations",
  "canManageCategories",
] as const;

export const JOB_ACTION_KEYS = [
  "canCreateJobs",
  "canEditJobs",
  "canCloseJobs",
  "canInvoiceJobs",
  "canViewJobSummaries",
] as const;

export const TOOL_ACTION_KEYS = [
  "canViewOwnTools",
  "canAddOwnTools",
  "canEditOwnTools",
  "canViewCompanyTools",
  "canRequestCompanyTools",
  "canCheckoutCompanyTools",
  "canReturnCompanyTools",
  "canAcceptToolReturns",
  "canManageCompanyTools",
] as const;

export const ADMIN_CAPABILITY_KEYS = [
  "canManageUsers",
  "canManageSettings",
  "canExportData",
  "canBackupRestore",
  "canClearCache",
  "canEnableModules",
] as const;

export const PRICE_VISIBILITY_KEYS = [
  "canViewBasePrice",
  "canViewMarginPrice",
  "canViewTotalPrice",
] as const;

export const PERMISSION_KEYS = [
  ...PAGE_ACCESS_KEYS,
  ...INVENTORY_ACTION_KEYS,
  ...JOB_ACTION_KEYS,
  ...TOOL_ACTION_KEYS,
  ...ADMIN_CAPABILITY_KEYS,
] as const;

export const ROLE_PRESET_VALUES = ["ADMIN", "MANAGER", "STANDARD", "LIMITED"] as const;
export const FINANCIAL_VISIBILITY_VALUES = [
  "none",
  "total_only",
  "base_only",
  "base_margin_total",
  "full",
] as const;

export type PageAccessKey = (typeof PAGE_ACCESS_KEYS)[number];
export type PermissionKey = (typeof PERMISSION_KEYS)[number];
export type PriceVisibilityKey = (typeof PRICE_VISIBILITY_KEYS)[number];
export type RolePreset = (typeof ROLE_PRESET_VALUES)[number];
export type FinancialVisibilityMode = (typeof FINANCIAL_VISIBILITY_VALUES)[number];
export type FinancialField = "total" | "base" | "margin" | "supplier" | "job_costing";
export type PermissionBooleans = Record<PermissionKey, boolean>;
export type PriceVisibilityBooleans = Record<PriceVisibilityKey, boolean>;

export interface PermissionSnapshot extends PermissionBooleans, PriceVisibilityBooleans {
  rolePreset: RolePreset;
  financialVisibilityMode: FinancialVisibilityMode;
}

export interface UserAccessContext extends PermissionSnapshot {
  userId: string;
  name: string;
  email: string;
  role: UserRole;
  organizationId: string;
  organizationName: string;
}

type IdentityContext = SessionPayload;
type RawAccessRecord = Record<string, unknown> & {
  id?: string;
  name?: string;
  email?: string;
  role?: UserRole;
  rolePreset?: string;
  financialVisibilityMode?: string;
};

const dbAny = prisma as any;

export const USER_ACCESS_SELECT = Object.fromEntries([
  "id",
  "name",
  "email",
  "role",
  "rolePreset",
  "financialVisibilityMode",
  ...PRICE_VISIBILITY_KEYS,
  ...PERMISSION_KEYS,
].map((key) => [key, true])) as Record<string, true>;

function emptyPermissions(): PermissionBooleans {
  return Object.fromEntries(PERMISSION_KEYS.map((key) => [key, false])) as PermissionBooleans;
}

function getPriceVisibilityFromMode(financialVisibilityMode: FinancialVisibilityMode): PriceVisibilityBooleans {
  switch (financialVisibilityMode) {
    case "total_only":
      return {
        canViewBasePrice: false,
        canViewMarginPrice: false,
        canViewTotalPrice: true,
      };
    case "base_only":
      return {
        canViewBasePrice: true,
        canViewMarginPrice: false,
        canViewTotalPrice: false,
      };
    case "base_margin_total":
    case "full":
      return {
        canViewBasePrice: true,
        canViewMarginPrice: true,
        canViewTotalPrice: true,
      };
    case "none":
    default:
      return {
        canViewBasePrice: false,
        canViewMarginPrice: false,
        canViewTotalPrice: false,
      };
  }
}

function toRolePreset(value: unknown, fallbackRole: UserRole): RolePreset {
  return ROLE_PRESET_VALUES.includes(value as RolePreset)
    ? (value as RolePreset)
    : getDefaultRolePreset(fallbackRole);
}

export function getDefaultRolePreset(role: UserRole): RolePreset {
  switch (role) {
    case "SUPER_ADMIN":
      return "ADMIN";
    case "OFFICE":
      return "MANAGER";
    case "TECH":
    default:
      return "STANDARD";
  }
}

export function getPresetPermissions(rolePreset: RolePreset): PermissionSnapshot {
  const base = emptyPermissions();

  switch (rolePreset) {
    case "ADMIN":
      return {
        ...Object.fromEntries(PERMISSION_KEYS.map((key) => [key, true])) as PermissionBooleans,
        ...getPriceVisibilityFromMode("full"),
        rolePreset,
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
        canManageUsers: false,
        canManageSettings: true,
        canExportData: true,
        canBackupRestore: false,
        canClearCache: true,
        canEnableModules: false,
        ...getPriceVisibilityFromMode("base_margin_total"),
        rolePreset,
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
        ...getPriceVisibilityFromMode("none"),
        rolePreset,
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
        ...getPriceVisibilityFromMode("total_only"),
        rolePreset,
        financialVisibilityMode: "total_only",
      };
  }
}

function resolveFinancialVisibilityMode(
  value: unknown,
  fallbackRole: UserRole,
  fallbackPreset: RolePreset
): FinancialVisibilityMode {
  if (FINANCIAL_VISIBILITY_VALUES.includes(value as FinancialVisibilityMode)) {
    return value as FinancialVisibilityMode;
  }

  return getPresetPermissions(fallbackPreset ?? getDefaultRolePreset(fallbackRole)).financialVisibilityMode;
}

export function buildPermissionSnapshot(
  raw: Partial<Record<PermissionKey | PriceVisibilityKey, unknown>>,
  rolePreset: RolePreset,
  financialVisibilityMode?: FinancialVisibilityMode
): PermissionSnapshot {
  const preset = getPresetPermissions(rolePreset);
  const resolvedFinancialVisibilityMode = financialVisibilityMode ?? preset.financialVisibilityMode;
  const permissions = Object.fromEntries(
    PERMISSION_KEYS.map((key) => [key, typeof raw[key] === "boolean" ? raw[key] : preset[key]])
  ) as PermissionBooleans;
  const defaultPriceVisibility = getPriceVisibilityFromMode(resolvedFinancialVisibilityMode);
  const priceVisibility = Object.fromEntries(
    PRICE_VISIBILITY_KEYS.map((key) => [key, typeof raw[key] === "boolean" ? raw[key] : defaultPriceVisibility[key]])
  ) as PriceVisibilityBooleans;

  return {
    ...permissions,
    ...priceVisibility,
    rolePreset,
    financialVisibilityMode: resolvedFinancialVisibilityMode,
  };
}

function mapUserRecordToAccess(record: RawAccessRecord | null | undefined, identity: IdentityContext): UserAccessContext {
  const role = (record?.role as UserRole | undefined) ?? identity.role;
  const rolePreset = toRolePreset(record?.rolePreset, role);
  const financialVisibilityMode = resolveFinancialVisibilityMode(record?.financialVisibilityMode, role, rolePreset);
  const snapshot = buildPermissionSnapshot((record ?? {}) as Partial<Record<PermissionKey, unknown>>, rolePreset, financialVisibilityMode);

  return {
    userId: (record?.id as string | undefined) ?? identity.userId,
    name: (record?.name as string | undefined) ?? identity.name,
    email: (record?.email as string | undefined) ?? "",
    role,
    organizationId: identity.organizationId,
    organizationName: identity.organizationName,
    ...snapshot,
  };
}

export async function getUserAccessForSession(session: SessionPayload): Promise<UserAccessContext> {
  const user = await dbAny.appUser.findFirst({
    where: {
      id: session.userId,
      organizationId: session.organizationId,
    },
    select: USER_ACCESS_SELECT,
  });

  return mapUserRecordToAccess(user, session);
}

export async function requireUserAccess(request: NextRequest): Promise<
  | { ok: true; access: UserAccessContext }
  | { ok: false; response: NextResponse }
> {
  const auth = requireRequestContext(request);
  if (!auth.ok) {
    return auth;
  }

  const access = await getUserAccessForSession(auth.context);
  return { ok: true, access };
}

export async function requirePageAccess(pageKey: PermissionKey): Promise<UserAccessContext> {
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  const access = await getUserAccessForSession(session);

  if (!access[pageKey]) {
    redirect(getDefaultHomePath(access));
  }

  return access;
}

export function getDefaultHomePath(access: Pick<UserAccessContext, PageAccessKey>): string {
  const candidates: Array<{ href: string; key: PageAccessKey }> = [
    { href: "/", key: "canViewDashboard" },
    { href: "/jobs", key: "canViewJobs" },
    { href: "/items", key: "canViewInventory" },
    { href: "/tools", key: "canViewTools" },
    { href: "/reports", key: "canViewReports" },
    { href: "/suppliers", key: "canViewSuppliers" },
    { href: "/reorder", key: "canViewReorder" },
    { href: "/settings", key: "canViewSettings" },
  ];

  return candidates.find((candidate) => access[candidate.key])?.href ?? "/login";
}

export function canViewFinancialValue(
  financialVisibilityMode: FinancialVisibilityMode,
  field: FinancialField,
  priceVisibility?: Partial<PriceVisibilityBooleans>
) {
  const resolvedPriceVisibility = {
    ...getPriceVisibilityFromMode(financialVisibilityMode),
    ...priceVisibility,
  };

  switch (financialVisibilityMode) {
    case "full":
      if (field === "supplier" || field === "job_costing") {
        return true;
      }
      break;
    default:
      if (field === "supplier" || field === "job_costing") {
        return false;
      }
      break;
  }

  if (field === "base") {
    return resolvedPriceVisibility.canViewBasePrice;
  }
  if (field === "margin") {
    return resolvedPriceVisibility.canViewMarginPrice;
  }
  if (field === "total") {
    return resolvedPriceVisibility.canViewTotalPrice;
  }

  return false;
}

export function pickPermissionBooleans(source: Partial<Record<PermissionKey, boolean | undefined>>) {
  return Object.fromEntries(PERMISSION_KEYS.map((key) => [key, Boolean(source[key])])) as PermissionBooleans;
}
