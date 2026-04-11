import {
  BarChart3,
  Boxes,
  BriefcaseBusiness,
  Hammer,
  LayoutDashboard,
  Settings2,
  ShoppingCart,
  Truck,
  Users2,
  type LucideIcon,
} from "lucide-react";

export type AppNavIcon =
  | "dashboard"
  | "jobs"
  | "inventory"
  | "tools"
  | "reports"
  | "suppliers"
  | "reorder"
  | "settings"
  | "users";

const NAV_ICONS: Record<AppNavIcon, LucideIcon> = {
  dashboard: LayoutDashboard,
  jobs: BriefcaseBusiness,
  inventory: Boxes,
  tools: Hammer,
  reports: BarChart3,
  suppliers: Truck,
  reorder: ShoppingCart,
  settings: Settings2,
  users: Users2,
};

export function getNavIcon(name: AppNavIcon) {
  return NAV_ICONS[name];
}