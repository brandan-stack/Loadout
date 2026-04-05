import type { UserRole } from "@/lib/auth";

type NavMatchMode = "exact" | "prefix";
type DesktopNavSlot = "main" | "utility" | "hidden";
type MobileNavSlot = "primary" | "secondary" | "hidden";

export interface AppNavItem {
  href: string;
  label: string;
  mobileLabel?: string;
  icon?: string;
  match?: NavMatchMode;
  roles?: UserRole[];
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
    label: "Home",
    icon: "⊞",
    match: "exact",
    desktopSlot: "hidden",
    mobileSlot: "primary",
  },
  {
    href: "/jobs",
    label: "Jobs",
    icon: "🔧",
    desktopSlot: "main",
    mobileSlot: "primary",
  },
  {
    href: "/items",
    label: "Inventory",
    mobileLabel: "Items",
    icon: "📦",
    desktopSlot: "main",
    mobileSlot: "primary",
  },
  {
    href: "/reports",
    label: "Reports",
    icon: "📊",
    desktopSlot: "main",
    mobileSlot: "primary",
  },
  {
    href: "/suppliers",
    label: "Suppliers",
    icon: "🏭",
    desktopSlot: "main",
    mobileSlot: "secondary",
  },
  {
    href: "/reorder",
    label: "Reorder",
    icon: "↺",
    desktopSlot: "main",
    mobileSlot: "secondary",
    includesReorderBadge: true,
  },
  {
    href: "/settings",
    label: "Settings",
    icon: "⚙",
    desktopSlot: "utility",
    mobileSlot: "secondary",
  },
  {
    href: "/admin/users",
    label: "Users",
    icon: "👥",
    roles: ["SUPER_ADMIN"],
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

export function getDesktopNavItems() {
  return APP_NAV_ITEMS.filter((item) => item.desktopSlot === "main");
}

export function getDesktopUtilityNavItems() {
  return APP_NAV_ITEMS.filter((item) => item.desktopSlot === "utility");
}

export function getMobileNavItems(role?: UserRole | null) {
  return APP_NAV_ITEMS.filter(
    (item) => item.mobileSlot !== "hidden" && isAllowedForRole(item, role)
  );
}

export function getMobilePrimaryNavItems(role?: UserRole | null) {
  return APP_NAV_ITEMS.filter(
    (item) => item.mobileSlot === "primary" && isAllowedForRole(item, role)
  );
}

export function getMobileSecondaryNavItems(role?: UserRole | null) {
  return APP_NAV_ITEMS.filter(
    (item) => item.mobileSlot === "secondary" && isAllowedForRole(item, role)
  );
}

function isAllowedForRole(item: AppNavItem, role?: UserRole | null) {
  if (!item.roles || item.roles.length === 0) {
    return true;
  }

  return role ? item.roles.includes(role) : false;
}