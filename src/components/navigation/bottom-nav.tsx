"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCurrentUser } from "@/hooks/useCurrentUser";

type NavItem = { href: string; label: string; icon: string };

const TECH_NAV: NavItem[] = [
  { href: "/", label: "Home", icon: "⊞" },
  { href: "/jobs", label: "Jobs", icon: "🔧" },
  { href: "/items", label: "Inventory", icon: "📦" },
  { href: "/reports", label: "Reports", icon: "📊" },
];

const OFFICE_NAV: NavItem[] = [
  { href: "/", label: "Home", icon: "⊞" },
  { href: "/jobs", label: "Jobs", icon: "🔧" },
  { href: "/items", label: "Inventory", icon: "📦" },
  { href: "/reports", label: "Reports", icon: "📊" },
];

const ADMIN_NAV: NavItem[] = [
  { href: "/", label: "Home", icon: "⊞" },
  { href: "/jobs", label: "Jobs", icon: "🔧" },
  { href: "/items", label: "Inventory", icon: "📦" },
  { href: "/admin/users", label: "Users", icon: "👥" },
];

export function BottomNav() {
  const pathname = usePathname();
  const { user } = useCurrentUser();

  // Don't render nav on auth pages
  if (
    pathname === "/login" ||
    pathname === "/signup" ||
    pathname === "/forgot-password" ||
    pathname === "/reset-password"
  ) return null;

  let items = OFFICE_NAV;
  if (user?.role === "TECH") items = TECH_NAV;
  else if (user?.role === "SUPER_ADMIN") items = ADMIN_NAV;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 safe-bottom px-2 pb-2 sm:px-4 sm:pb-3 md:hidden">
      <div className="max-w-4xl mx-auto bg-slate-950/88 backdrop-blur border border-slate-700/50 rounded-2xl shadow-[0_12px_32px_rgba(2,6,23,0.66)]">
        <div className="flex justify-between px-1 sm:px-2">
          {items.map(({ href, label, icon }) => {
            const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                prefetch={false}
                className={`flex-1 flex flex-col items-center py-2.5 px-1.5 sm:px-3 min-w-[44px] min-h-[44px] justify-center rounded-xl transition-colors ${
                  active
                    ? "text-indigo-300 bg-indigo-500/15"
                    : "text-slate-400 hover:text-slate-100"
                }`}
              >
                <span className="text-xl">{icon}</span>
                <span className="text-[10px] mt-0.5 font-semibold">{label}</span>
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
