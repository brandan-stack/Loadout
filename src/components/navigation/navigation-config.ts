import type { UserRole } from "@/lib/auth";
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
    desktopSlot: "main",
    mobileSlot: "primary",
  },
  {
    href: "/items",
    label: "Inventory",
    mobileLabel: "Items",
    icon: "inventory",
    desktopSlot: "main",
    mobileSlot: "primary",
  },
  {
    href: "/reports",
    label: "Reports",
    icon: "reports",
    desktopSlot: "main",
    mobileSlot: "primary",
  },
  {
    href: "/suppliers",
    label: "Suppliers",
    icon: "suppliers",
    desktopSlot: "main",
    mobileSlot: "secondary",
  },
  {
    href: "/reorder",
    label: "Reorder",
    icon: "reorder",
    desktopSlot: "main",
    mobileSlot: "secondary",
    includesReorderBadge: true,
  },
  {
    href: "/settings",
    label: "Settings",
    icon: "settings",
    desktopSlot: "utility",
    mobileSlot: "secondary",
  },
  {
    href: "/admin/users",
    label: "Users",
    icon: "users",
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

export function getCurrentSectionLabel(pathname: string, role?: UserRole | null) {
  const activeItem = getMobileNavItems(role).find((item) => isNavItemActive(item, pathname));
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

function isAllowedForRole(item: AppNavItem, role?: UserRole | null) {
  if (!item.roles || item.roles.length === 0) {
    return true;
  }

  return role ? item.roles.includes(role) : false;
}