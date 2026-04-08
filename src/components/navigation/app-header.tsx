"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ScanLine, Sparkles } from "lucide-react";
import {
  getCurrentSectionLabel,
  getDesktopNavItems,
  getDesktopUtilityNavItems,
  isAuthPath,
  isNavItemActive,
} from "@/components/navigation/navigation-config";
import { useReorderCounts } from "@/hooks/useReorderCounts";
import { getNavIcon } from "@/components/navigation/nav-icons";

export function AppHeader() {
  const pathname = usePathname();
  const mainItems = getDesktopNavItems();
  const utilityItems = getDesktopUtilityNavItems();
  const counts = useReorderCounts(!isAuthPath(pathname), pathname);

  if (isAuthPath(pathname)) {
    return null;
  }

  const sectionLabel = getCurrentSectionLabel(pathname);
  const hasAlerts = Boolean(counts && counts.total > 0);

  return (
    <header
      className="sticky top-0 z-40 w-full px-3 md:px-4"
      style={{ paddingTop: "max(0.5rem, env(safe-area-inset-top))" }}
    >
      <div className="mx-auto max-w-[1400px]">
        <div className="md:hidden">
          <div className="dashboard-rise rounded-[1.45rem] border border-white/10 bg-[linear-gradient(180deg,rgba(9,15,29,0.92),rgba(9,15,29,0.8))] px-4 py-3 shadow-[0_14px_32px_rgba(2,6,23,0.32),0_0_0_1px_rgba(255,255,255,0.03)] backdrop-blur-md">
            <div className="flex items-center justify-between gap-3">
              <Link href="/" className="flex min-w-0 items-center gap-3">
                <div className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,#4f46e5_0%,#38bdf8_100%)] shadow-[0_16px_28px_rgba(59,130,246,0.26)]">
                  <div className="absolute inset-0 rounded-2xl bg-[radial-gradient(circle_at_30%_30%,rgba(255,255,255,0.24),transparent_38%)]" />
                  <div className="relative h-4 w-4 rotate-45 rounded-[4px] border-[1.5px] border-white/90" />
                </div>

                <div className="min-w-0 leading-none">
                  <div className="truncate text-[0.72rem] font-semibold uppercase tracking-[0.26em] text-slate-400/90">
                    Loadout
                  </div>
                  <div className="mt-1 truncate text-[1rem] font-semibold tracking-[-0.03em] text-white">
                    {sectionLabel}
                  </div>
                </div>
              </Link>

              <Link
                href="/scan"
                className="panel-interactive relative inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-sky-300/16 bg-sky-300/10 text-sky-50 shadow-[0_12px_22px_rgba(56,189,248,0.14)] hover:border-sky-200/30 hover:bg-sky-300/16 hover:text-white active:scale-[0.96]"
                aria-label="Open scanner"
              >
                <ScanLine className="h-4.5 w-4.5" />
                {hasAlerts && <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-rose-400 shadow-[0_0_12px_rgba(251,113,133,0.6)]" />}
              </Link>
            </div>

            <div className="mt-3 flex items-center justify-between gap-3 rounded-[1.1rem] border border-white/8 bg-white/[0.04] px-3.5 py-2.5">
              <div className="flex items-center gap-2 text-[0.72rem] font-semibold uppercase tracking-[0.18em] text-slate-300/85">
                <Sparkles className="h-3.5 w-3.5 text-sky-200" />
                Field Command Center
              </div>
              <div className="text-right text-[0.72rem] font-medium text-slate-400">
                {hasAlerts
                  ? `${counts!.urgent} urgent • ${counts!.high} warning`
                  : "No active blockers"}
              </div>
            </div>
          </div>
        </div>

        <div className="hidden md:block">
          <div className="dashboard-rise rounded-[1.55rem] border border-white/10 bg-[linear-gradient(180deg,rgba(7,11,20,0.9),rgba(7,11,20,0.78))] px-5 py-3 shadow-[0_16px_40px_rgba(2,6,23,0.34),0_0_0_1px_rgba(255,255,255,0.03)] backdrop-blur-xl">
            <div className="flex items-center justify-between gap-6">
              <Link href="/" className="flex shrink-0 items-center gap-3.5">
                <div className="relative flex h-11 w-11 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,#4f46e5_0%,#38bdf8_100%)] shadow-[0_18px_30px_rgba(59,130,246,0.24)]">
                  <div className="absolute inset-0 rounded-2xl bg-[radial-gradient(circle_at_30%_30%,rgba(255,255,255,0.24),transparent_38%)]" />
                  <div className="relative h-4 w-4 rotate-45 rounded-[4px] border-[1.5px] border-white/90" />
                </div>

                <div className="leading-none">
                  <div className="text-[0.72rem] font-semibold uppercase tracking-[0.26em] text-slate-400/90">
                    LOADOUT
                  </div>
                  <div className="mt-1 text-[1rem] font-semibold tracking-[-0.035em] text-white">
                    Field Parts Tracking
                  </div>
                </div>
              </Link>

              <nav className="flex min-w-0 flex-1 items-center justify-center gap-1.5" aria-label="Main navigation">
                {mainItems.map((item) => {
                  const active = isNavItemActive(item, pathname);
                  const Icon = getNavIcon(item.icon);

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`panel-interactive relative inline-flex items-center gap-2 rounded-[1.05rem] px-4 py-2.5 text-sm font-medium tracking-[-0.01em] ${
                        active
                          ? "bg-white/[0.08] text-white shadow-[0_14px_28px_rgba(2,6,23,0.28),inset_0_1px_0_rgba(255,255,255,0.07)]"
                          : "text-slate-300/72 hover:bg-white/[0.045] hover:text-white"
                      }`}
                    >
                      <Icon className={`h-4 w-4 ${active ? "text-sky-100" : "text-slate-400"}`} />
                      <span>{item.label}</span>

                      {item.includesReorderBadge && hasAlerts && (
                        <span className="ml-1 inline-flex items-center gap-1 rounded-full border border-rose-300/14 bg-rose-300/10 px-2 py-1 text-[0.65rem] font-semibold text-rose-100 shadow-[0_0_16px_rgba(251,113,133,0.12)]">
                          <span className="h-1.5 w-1.5 rounded-full bg-current" />
                          {counts!.total}
                        </span>
                      )}

                      {active && (
                        <span className="absolute inset-x-4 bottom-1.5 h-px rounded-full bg-gradient-to-r from-transparent via-sky-300/80 to-transparent" />
                      )}
                    </Link>
                  );
                })}
              </nav>

              <div className="flex shrink-0 items-center gap-2">
                <Link
                  href="/scan"
                  className="panel-interactive inline-flex items-center gap-2 rounded-[1rem] border border-sky-300/14 bg-sky-300/10 px-3.5 py-2.5 text-sm font-semibold tracking-[-0.01em] text-sky-50 shadow-[0_14px_24px_rgba(56,189,248,0.12)] hover:border-sky-200/28 hover:bg-sky-300/16 hover:text-white"
                >
                  <ScanLine className="h-4 w-4" />
                  Scan
                </Link>

                {utilityItems.map((item) => {
                  const active = isNavItemActive(item, pathname);
                  const Icon = getNavIcon(item.icon);

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`panel-interactive inline-flex h-11 w-11 items-center justify-center rounded-[1rem] border ${
                        active
                          ? "border-white/12 bg-white/[0.08] text-white shadow-[0_14px_24px_rgba(2,6,23,0.22)]"
                          : "border-white/8 bg-white/[0.04] text-slate-300/72 hover:border-white/14 hover:bg-white/[0.07] hover:text-white"
                      }`}
                      title={item.label}
                      aria-label={item.label}
                    >
                      <Icon className="h-4.5 w-4.5" />
                    </Link>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
