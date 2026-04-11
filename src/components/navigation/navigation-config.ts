import type { PermissionKey, UserAccessContext } from "@/lib/permissions";
import type { AppNavIcon } from "@/components/navigation/nav-icons";

type NavMatchMode = "exact" | "prefix";
type DesktopNavSlot = "main" | "utility" | "hidden";
type MobileNavSlot = "primary" | "secondary" | "hidden";

export interface AppNavItem {
  href: string;
  label: string;
  mobileLabel?: string;
  icon: AppNavIcon;
  match?: NavMatchMode;
  pagePermission?: PermissionKey;
  desktopSlot: DesktopNavSlot;
  mobileSlot: MobileNavSlot;
  includesReorderBadge?: boolean;
}

const AUTH_PATHS = new Set([
  "/login",
  "/signup",
  "/forgot-password",
  "/reset-password",
]);

export const APP_NAV_ITEMS: AppNavItem[] = [
  {
    href: "/",
    label: "Dashboard",
    mobileLabel: "Home",
    icon: "dashboard",
    match: "exact",
    desktopSlot: "main",
    mobileSlot: "primary",
  },
  {
    href: "/jobs",
    label: "Jobs",
    icon: "jobs",
    pagePermission: "canViewJobs",
    desktopSlot: "main",
    mobileSlot: "primary",
  },
  {
    href: "/items",
    label: "Inventory",
    mobileLabel: "Items",
    icon: "inventory",
    pagePermission: "canViewInventory",
    desktopSlot: "main",
    mobileSlot: "primary",
  },
  {
    href: "/tools",
    label: "Tools",
    icon: "tools",
    pagePermission: "canViewTools",
    desktopSlot: "main",
    mobileSlot: "primary",
  },
  {
    href: "/reports",
    label: "Reports",
    icon: "reports",
    pagePermission: "canViewReports",
    desktopSlot: "main",
    mobileSlot: "primary",
  },
  {
    href: "/suppliers",
    label: "Suppliers",
    icon: "suppliers",
    pagePermission: "canViewSuppliers",
    desktopSlot: "main",
    mobileSlot: "secondary",
  },
  {
    href: "/reorder",
    label: "Reorder",
    icon: "reorder",
    pagePermission: "canViewReorder",
    desktopSlot: "main",
    mobileSlot: "secondary",
    includesReorderBadge: true,
  },
  {
    href: "/settings",
    label: "Settings",
    icon: "settings",
    pagePermission: "canViewSettings",
    desktopSlot: "utility",
    mobileSlot: "secondary",
  },
  {
    href: "/admin/users",
    label: "Users",
    icon: "users",
    pagePermission: "canManageUsers",
    desktopSlot: "hidden",
    mobileSlot: "secondary",
  },
];

export function isAuthPath(pathname: string) {
  return AUTH_PATHS.has(pathname);
}

export function isNavItemActive(item: Pick<AppNavItem, "href" | "match">, pathname: string) {
  if ((item.match ?? "prefix") === "exact") {
    return pathname === item.href;
  }

  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}

export function getDesktopNavItems(access?: Pick<UserAccessContext, PermissionKey> | null) {
  return APP_NAV_ITEMS.filter(
    (item) => item.desktopSlot === "main" && isAllowedForAccess(item, access)
  );
}

export function getDesktopUtilityNavItems(access?: Pick<UserAccessContext, PermissionKey> | null) {
  return APP_NAV_ITEMS.filter(
    (item) => item.desktopSlot === "utility" && isAllowedForAccess(item, access)
  );
}

export function getMobileNavItems(access?: Pick<UserAccessContext, PermissionKey> | null) {
  return APP_NAV_ITEMS.filter(
    (item) => item.mobileSlot !== "hidden" && isAllowedForAccess(item, access)
  );
}

export function getMobilePrimaryNavItems(access?: Pick<UserAccessContext, PermissionKey> | null) {
  return APP_NAV_ITEMS.filter(
    (item) => item.mobileSlot === "primary" && isAllowedForAccess(item, access)
  );
}

export function getMobileSecondaryNavItems(access?: Pick<UserAccessContext, PermissionKey> | null) {
  return APP_NAV_ITEMS.filter(
    (item) => item.mobileSlot === "secondary" && isAllowedForAccess(item, access)
  );
}

export function getCurrentSectionLabel(
  pathname: string,
  access?: Pick<UserAccessContext, PermissionKey> | null
) {
  const activeItem = getMobileNavItems(access).find((item) => isNavItemActive(item, pathname));
  if (activeItem) {
    return activeItem.label;
  }

  const segment = pathname.split("/").filter(Boolean)[0];
  if (!segment) {
    return "Dashboard";
  }

  return segment
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function isAllowedForAccess(
  item: AppNavItem,
  access?: Pick<UserAccessContext, PermissionKey> | null
) {
  if (!item.pagePermission) {
    return true;
  }

  return Boolean(access?.[item.pagePermission]);
}