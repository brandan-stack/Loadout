"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import {
  getMobileNavItems,
  isAuthPath,
  isNavItemActive,
} from "@/components/navigation/navigation-config";

export function BottomNav() {
  const pathname = usePathname();
  const { user } = useCurrentUser(!isAuthPath(pathname));
  const navItems = getMobileNavItems(user?.role);

  // Don't render nav on auth pages
  if (isAuthPath(pathname)) return null;

  return (
    <nav className="mobile-bottom-nav fixed bottom-0 left-0 right-0 z-50 safe-bottom px-2 pb-2 sm:px-4 sm:pb-3 md:hidden">
      <div className="mx-auto max-w-4xl rounded-[1.4rem] border border-slate-700/50 bg-slate-950/88 shadow-[0_12px_32px_rgba(2,6,23,0.66)] backdrop-blur">
        <div className="mobile-bottom-nav-track flex items-stretch gap-1 overflow-x-auto px-1.5 py-1.5 sm:px-2">
          {navItems.map((item) => {
            const active = isNavItemActive(item, pathname);
            return (
              <Link
                key={item.href}
                href={item.href}
                prefetch={false}
                className={`mobile-bottom-nav-item flex min-w-[4.5rem] shrink-0 snap-center flex-col items-center justify-center rounded-xl px-2 py-2.5 text-center transition-colors ${
                  active
                    ? "bg-indigo-500/15 text-indigo-300"
                    : "text-slate-400 hover:text-slate-100"
                }`}
              >
                <span className="mobile-bottom-nav-icon text-xl">{item.icon}</span>
                <span className="mobile-bottom-nav-label mt-0.5 text-[10px] font-semibold leading-tight">
                  {item.mobileLabel ?? item.label}
                </span>
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
