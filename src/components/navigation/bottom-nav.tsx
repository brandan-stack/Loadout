"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import {
  getMobileNavItems,
  isAuthPath,
  isNavItemActive,
} from "@/components/navigation/navigation-config";
import { useReorderCounts } from "@/hooks/useReorderCounts";
import { getNavIcon } from "@/components/navigation/nav-icons";

export function BottomNav() {
  const pathname = usePathname();
  const { user } = useCurrentUser(!isAuthPath(pathname));
  const navItems = getMobileNavItems(user?.role);
  const counts = useReorderCounts(!isAuthPath(pathname), pathname);

  if (isAuthPath(pathname)) {
    return null;
  }

  return (
    <nav className="mobile-bottom-nav dashboard-rise dashboard-delay-4 fixed bottom-0 left-0 right-0 z-50 safe-bottom px-3 pb-1.5 md:hidden">
      <div className="mx-auto max-w-[520px]">
        <div className="rounded-[1.55rem] border border-white/10 bg-[linear-gradient(180deg,rgba(7,11,20,0.94),rgba(7,11,20,0.84))] p-2 shadow-[0_16px_38px_rgba(2,6,23,0.4),0_0_0_1px_rgba(255,255,255,0.03)] backdrop-blur-xl">
          <div className="mobile-bottom-nav-track flex items-stretch gap-1.5 overflow-x-auto">
            {navItems.map((item) => {
              const active = isNavItemActive(item, pathname);
              const Icon = getNavIcon(item.icon);
              const showBadge = item.includesReorderBadge && counts && counts.total > 0;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  prefetch={false}
                  className={`mobile-bottom-nav-item panel-interactive group relative flex min-w-[4.85rem] shrink-0 snap-center flex-col items-center justify-center rounded-[1.2rem] px-2.5 py-2.5 text-center active:scale-[0.98] ${
                    active
                      ? "bg-white/[0.09] text-white shadow-[0_14px_28px_rgba(2,6,23,0.34),inset_0_1px_0_rgba(255,255,255,0.08)]"
                      : "text-slate-400 hover:bg-white/[0.05] hover:text-slate-100"
                  }`}
                >
                  <span className={`relative inline-flex h-9 w-9 items-center justify-center rounded-2xl transition-all duration-300 ${
                    active
                      ? "bg-sky-300/14 text-sky-100 shadow-[0_10px_22px_rgba(56,189,248,0.14)] -translate-y-0.5"
                      : "bg-white/[0.04] text-slate-300"
                  }`}>
                    <Icon className="mobile-bottom-nav-icon h-[1.05rem] w-[1.05rem]" />
                    {showBadge && (
                      <span className="absolute -right-1 -top-1 inline-flex min-w-[1.1rem] items-center justify-center rounded-full bg-rose-400 px-1 text-[0.58rem] font-bold leading-4 text-white shadow-[0_0_14px_rgba(251,113,133,0.5)]">
                        {counts!.total > 9 ? "9+" : counts!.total}
                      </span>
                    )}
                  </span>

                  <span className="mobile-bottom-nav-label mt-1.5 text-[0.64rem] font-semibold leading-tight tracking-[0.015em]">
                    {item.mobileLabel ?? item.label}
                  </span>

                  {active && (
                    <span className="absolute inset-x-4 top-1.5 h-px rounded-full bg-gradient-to-r from-transparent via-sky-300/80 to-transparent" />
                  )}
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </nav>
  );
}
