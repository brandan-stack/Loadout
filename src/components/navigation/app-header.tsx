"use client";

import { usePathname } from "next/navigation";

export function AppHeader() {
  const pathname = usePathname();
  if (pathname === "/login") return null;

  return (
    <header
      className="sticky top-0 z-40 w-full"
      style={{
        background: "rgba(7, 13, 24, 0.82)",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        borderBottom: "1px solid rgba(34,211,238,0.10)",
        boxShadow:
          "0 1px 0 rgba(34,211,238,0.08), 0 4px 32px rgba(2,6,23,0.65)",
      }}
    >
      <div className="max-w-3xl mx-auto px-4 sm:px-6 h-14 flex items-center gap-3">
        {/* Icon box */}
        <div
          className="h-8 w-8 rounded-lg shrink-0 flex items-center justify-center"
          style={{
            background: "linear-gradient(135deg, #22d3ee 0%, #34d399 100%)",
            boxShadow: "0 0 16px rgba(34,211,238,0.40)",
          }}
        >
          <div className="w-3.5 h-3.5 border-[1.5px] border-white/85 rotate-45 rounded-[2px]" />
        </div>

        {/* Word-mark */}
        <div className="leading-none select-none">
          <div
            className="text-white font-bold tracking-wide"
            style={{ fontSize: "15px", letterSpacing: "0.06em" }}
          >
            LOADOUT
          </div>
          <div
            className="text-cyan-300/70 font-semibold uppercase"
            style={{ fontSize: "9px", letterSpacing: "0.20em", marginTop: "2px" }}
          >
            Field Parts Tracking
          </div>
        </div>
      </div>
    </header>
  );
}
