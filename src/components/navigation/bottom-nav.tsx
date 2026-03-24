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
    <nav className="fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur border-t border-gray-200 z-50 safe-bottom">
      <div className="max-w-lg mx-auto flex justify-between px-1 sm:px-2">
        {NAV_ITEMS.map(({ href, label, icon }) => {
          const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              prefetch={false}
              className={`flex flex-col items-center py-2 px-1.5 sm:px-3 min-w-[44px] min-h-[44px] justify-center transition-colors ${
                active ? "text-blue-600" : "text-gray-500 hover:text-gray-800"
              }`}
            >
              <span className="text-xl">{icon}</span>
              <span className="text-[10px] mt-0.5">{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
