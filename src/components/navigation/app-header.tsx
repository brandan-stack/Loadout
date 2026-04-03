"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

interface ReorderCounts {
  urgent: number;
  high: number;
}

const NAV_ITEMS = [
  { href: "/jobs", label: "Jobs" },
  { href: "/items", label: "Inventory" },
  { href: "/reports", label: "Reports" },
  { href: "/suppliers", label: "Suppliers" },
  { href: "/reorder", label: "Reorder" },
];

export function AppHeader() {
  const pathname = usePathname();
  const [counts, setCounts] = useState<ReorderCounts | null>(null);

  useEffect(() => {
    fetch("/api/reorder/recommendations")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d) setCounts({ urgent: d.urgent ?? 0, high: d.high ?? 0 });
      })
      .catch(() => {});
  }, []);

  if (pathname === "/login") return null;

  const hasAlerts = counts && (counts.urgent > 0 || counts.high > 0);

  return (
    <header
      className="sticky top-0 z-40 w-full"
      style={{
        background: "rgba(7, 11, 20, 0.92)",
        backdropFilter: "blur(18px)",
        WebkitBackdropFilter: "blur(18px)",
        borderBottom: "1px solid rgba(255,255,255,0.06)",
        boxShadow: "0 1px 0 rgba(255,255,255,0.04), 0 4px 18px rgba(0,0,0,0.42)",
      }}
    >
      <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between">

        {/* ─── Left: Logo + Wordmark ─── */}
        <Link href="/" prefetch={false} className="flex items-center gap-3 select-none shrink-0">
          <div
            className="h-8 w-8 rounded-lg flex items-center justify-center shrink-0"
            style={{
              background: "linear-gradient(135deg, #4f46e5 0%, #818cf8 100%)",
              boxShadow: "0 0 10px rgba(99,102,241,0.22)",
            }}
          >
            <div className="w-3.5 h-3.5 border-[1.5px] border-white/85 rotate-45 rounded-[2px]" />
          </div>
          <div className="leading-none">
            <div
              className="text-white font-bold"
              style={{ fontSize: "14px", letterSpacing: "0.12em" }}
            >
              LOADOUT
            </div>
            <div
              className="text-slate-500 font-medium uppercase"
              style={{ fontSize: "9px", letterSpacing: "0.18em", marginTop: "2px" }}
            >
              Field Parts Tracking
            </div>
          </div>
        </Link>

        {/* ─── Right: Nav (desktop) ─── */}
        <nav className="hidden md:flex items-center gap-0.5" aria-label="Main navigation">
          {NAV_ITEMS.map(({ href, label }) => {
            const active = pathname.startsWith(href);
            const isReorder = href === "/reorder";
            return (
              <Link
                key={href}
                href={href}
                prefetch={false}
                className={`relative px-3.5 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
                  active
                    ? "text-white"
                    : "text-slate-400 hover:text-slate-200 hover:bg-white/[0.04]"
                }`}
              >
                {active && (
                  <span
                    className="absolute bottom-0 left-1/2 -translate-x-1/2 h-[2px] w-5 rounded-full"
                    style={{ background: "linear-gradient(90deg, #6366f1, #818cf8)" }}
                  />
                )}
                <span>{label}</span>
                {isReorder && hasAlerts && (
                  <span className="flex items-center gap-1.5">
                    {counts!.urgent > 0 && (
                      <span className="flex items-center gap-0.5 text-xs font-semibold text-red-400 leading-none">
                        <span className="w-1.5 h-1.5 rounded-full bg-red-500 inline-block shrink-0" />
                        {counts!.urgent}
                      </span>
                    )}
                    {counts!.high > 0 && (
                      <span className="flex items-center gap-0.5 text-xs font-semibold text-amber-400 leading-none">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500 inline-block shrink-0" />
                        {counts!.high}
                      </span>
                    )}
                  </span>
                )}
              </Link>
            );
          })}

          {/* Settings icon */}
          <Link
            href="/settings"
            prefetch={false}
            className={`ml-1 p-2 rounded-lg transition-colors ${
              pathname.startsWith("/settings")
                ? "text-white bg-white/[0.07]"
                : "text-slate-400 hover:text-slate-200 hover:bg-white/[0.04]"
            }`}
            title="Settings"
            aria-label="Settings"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden
            >
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
            </svg>
          </Link>
        </nav>

      </div>
    </header>
  );
}
