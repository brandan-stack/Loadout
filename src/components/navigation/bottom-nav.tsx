"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { useCurrentUser } from "@/hooks/useCurrentUser";

type NavItem = { href: string; label: string; icon: string };

const CORE_NAV: NavItem[] = [
  { href: "/", label: "Home", icon: "⊞" },
  { href: "/jobs", label: "Jobs", icon: "🔧" },
  { href: "/items", label: "Inventory", icon: "📦" },
  { href: "/reports", label: "Reports", icon: "📊" },
  { href: "/settings", label: "Settings", icon: "⚙️" },
];

// Extra items accessible from the "More" sheet
const MORE_ITEMS: NavItem[] = [
  { href: "/suppliers", label: "Suppliers", icon: "🏭" },
  { href: "/reorder", label: "Reorder", icon: "🔄" },
  { href: "/locations", label: "Locations", icon: "📍" },
  { href: "/tools", label: "Tools", icon: "🔩" },
  { href: "/scan", label: "Scan", icon: "⬡" },
  { href: "/import", label: "Import", icon: "📥" },
  { href: "/admin/users", label: "Users", icon: "👥" },
];

export function BottomNav() {
  const pathname = usePathname();
  const { user } = useCurrentUser(pathname !== "/login");
  const [showMore, setShowMore] = useState(false);

  // Don't render nav on auth pages
  if (
    pathname === "/login" ||
    pathname === "/signup" ||
    pathname === "/forgot-password" ||
    pathname === "/reset-password"
  ) return null;

  // Filter "Users" from More sheet for non-admins
  const moreItems = user?.role === "SUPER_ADMIN"
    ? MORE_ITEMS
    : MORE_ITEMS.filter((i) => i.href !== "/admin/users");

  const isMoreActive = moreItems.some((i) => pathname.startsWith(i.href));

  return (
    <>
      {/* More sheet backdrop */}
      {showMore && (
        <div
          className="fixed inset-0 z-40 bg-black/50"
          onClick={() => setShowMore(false)}
        />
      )}

      {/* More sheet */}
      {showMore && (
        <div
          className="fixed bottom-[4.5rem] left-2 right-2 z-50 rounded-2xl p-4 md:hidden"
          style={{
            background: "rgba(7,11,20,0.97)",
            border: "1px solid rgba(255,255,255,0.08)",
            backdropFilter: "blur(18px)",
            WebkitBackdropFilter: "blur(18px)",
            boxShadow: "0 -8px 32px rgba(0,0,0,0.5)",
          }}
        >
          <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest mb-3 px-1">
            More
          </p>
          <div className="grid grid-cols-4 gap-1">
            {moreItems.map(({ href, label, icon }) => {
              const active = pathname.startsWith(href);
              return (
                <Link
                  key={href}
                  href={href}
                  prefetch={false}
                  onClick={() => setShowMore(false)}
                  className={`flex flex-col items-center py-2.5 px-1 rounded-xl transition-colors min-h-[56px] justify-center ${
                    active
                      ? "text-indigo-300 bg-indigo-500/15"
                      : "text-slate-400 hover:text-slate-100 hover:bg-white/[0.05]"
                  }`}
                >
                  <span className="text-xl">{icon}</span>
                  <span className="text-[10px] mt-0.5 font-semibold">{label}</span>
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {/* Bottom nav bar */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 safe-bottom px-2 pb-2 sm:px-4 sm:pb-3 md:hidden">
        <div className="max-w-4xl mx-auto bg-slate-950/88 backdrop-blur border border-slate-700/50 rounded-2xl shadow-[0_12px_32px_rgba(2,6,23,0.66)]">
          <div className="flex justify-between px-1 sm:px-2">
            {CORE_NAV.map(({ href, label, icon }) => {
              const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
              return (
                <Link
                  key={href}
                  href={href}
                  prefetch={false}
                  className={`flex-1 flex flex-col items-center py-2.5 px-1 min-w-[44px] min-h-[44px] justify-center rounded-xl transition-colors ${
                    active
                      ? "text-indigo-300 bg-indigo-500/15"
                      : "text-slate-400 hover:text-slate-100"
                  }`}
                >
                  <span className="text-lg">{icon}</span>
                  <span className="text-[10px] mt-0.5 font-semibold">{label}</span>
                </Link>
              );
            })}
            {/* More button */}
            <button
              onClick={() => setShowMore((v) => !v)}
              className={`flex-1 flex flex-col items-center py-2.5 px-1 min-w-[44px] min-h-[44px] justify-center rounded-xl transition-colors ${
                showMore || isMoreActive
                  ? "text-indigo-300 bg-indigo-500/15"
                  : "text-slate-400 hover:text-slate-100"
              }`}
            >
              <span className="text-lg">•••</span>
              <span className="text-[10px] mt-0.5 font-semibold">More</span>
            </button>
          </div>
        </div>
      </nav>
    </>
  );
}
