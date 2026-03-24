"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
  { href: "/", label: "Home", icon: "⊞" },
  { href: "/items", label: "Items", icon: "📦" },
  { href: "/scan", label: "Scan", icon: "⬡" },
  { href: "/reports", label: "Reports", icon: "📊" },
  { href: "/reorder", label: "Reorder", icon: "🔄" },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 safe-bottom px-2 pb-2 sm:px-4 sm:pb-3">
      <div className="max-w-4xl mx-auto bg-slate-950/88 backdrop-blur border border-slate-700/50 rounded-2xl shadow-[0_12px_32px_rgba(2,6,23,0.66)]">
        <div className="flex justify-between px-1 sm:px-2">
        {NAV_ITEMS.map(({ href, label, icon }) => {
          const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              prefetch={false}
              className={`flex-1 flex flex-col items-center py-2.5 px-1.5 sm:px-3 min-w-[44px] min-h-[44px] justify-center rounded-xl transition-colors ${
                active
                  ? "text-teal-300 bg-teal-500/15"
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
