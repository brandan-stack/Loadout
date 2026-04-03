import Link from "next/link";
import { LoadoutLogo } from "@/components/ui/LoadoutLogo";

const PRIMARY_CARDS = [
  {
    href: "/jobs",
    label: "Jobs",
    description: "Log parts & materials on crane jobs",
    icon: "🔧",
    gradient: "linear-gradient(140deg, rgba(14,36,34,0.97) 0%, rgba(9,15,26,0.99) 100%)",
    accentColor: "#2dd4bf",
    accentGlow: "rgba(45,212,191,0.13)",
  },
  {
    href: "/scan",
    label: "Scan",
    description: "Capture barcodes, update stock instantly",
    icon: "⬡",
    gradient: "linear-gradient(140deg, rgba(10,28,46,0.97) 0%, rgba(9,15,26,0.99) 100%)",
    accentColor: "#38bdf8",
    accentGlow: "rgba(56,189,248,0.13)",
  },
  {
    href: "/items",
    label: "Parts",
    description: "Search catalog, adjust thresholds, add parts",
    icon: "📦",
    gradient: "linear-gradient(140deg, rgba(16,18,52,0.97) 0%, rgba(9,15,26,0.99) 100%)",
    accentColor: "#818cf8",
    accentGlow: "rgba(129,140,248,0.13)",
  },
  {
    href: "/reports",
    label: "Reports",
    description: "Trends, low stock & job material costs",
    icon: "📊",
    gradient: "linear-gradient(140deg, rgba(8,34,26,0.97) 0%, rgba(9,15,26,0.99) 100%)",
    accentColor: "#34d399",
    accentGlow: "rgba(52,211,153,0.13)",
  },
];

const SECONDARY_CARDS = [
  { href: "/reorder", label: "Reorder", icon: "🔄" },
  { href: "/suppliers", label: "Suppliers", icon: "🏭" },
  { href: "/locations", label: "Locations", icon: "📍" },
  { href: "/settings", label: "Settings", icon: "⚙" },
];

export default function Home() {
  return (
    <main className="px-4 sm:px-6 pt-5 sm:pt-8 max-w-2xl sm:max-w-3xl mx-auto pb-28">

      {/* ─── Premium Glass Header ─── */}
      <header
        className="flex items-center justify-between px-5 py-4 rounded-3xl mb-6 sm:mb-8"
        style={{
          background: "rgba(255,255,255,0.04)",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
          boxShadow:
            "0 4px 32px rgba(34,211,238,0.10), 0 8px 40px rgba(2,6,23,0.45)",
        }}
      >
        <LoadoutLogo />

        {/* New Job CTA */}
        <Link
          href="/jobs"
          prefetch={false}
          className="flex-shrink-0 flex items-center gap-2 rounded-xl px-4 sm:px-5 py-2.5 text-sm font-bold text-slate-950 active:scale-95 transition-transform select-none ml-4"
          style={{
            background: "linear-gradient(135deg, #2dd4bf 0%, #22d3ee 100%)",
            boxShadow:
              "0 0 20px rgba(45,212,191,0.4), 0 2px 8px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.2)",
          }}
        >
          <svg width="10" height="10" viewBox="0 0 11 11" fill="none" aria-hidden>
            <path d="M5.5 1v9M1 5.5h9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
          New Job
        </Link>
      </header>

      {/* ─── Core Actions ─── */}
      <p className="text-xs font-bold tracking-[0.13em] uppercase mb-3 px-0.5" style={{ color: "rgba(148,163,184,0.6)" }}>
        Core Actions
      </p>

      <div className="grid grid-cols-2 gap-3 sm:gap-4 mb-8 sm:mb-10">
        {PRIMARY_CARDS.map(({ href, label, description, icon, gradient, accentColor, accentGlow }) => (
          <Link
            key={href}
            href={href}
            prefetch={false}
            className="relative card-lift rounded-2xl overflow-hidden block active:scale-[0.97]"
            style={{
              background: gradient,
              border: `1px solid ${accentColor}1f`,
              boxShadow: `0 4px 24px rgba(2,6,23,0.55), inset 0 1px 0 rgba(255,255,255,0.04)`,
            }}
          >
            {/* Colored top stripe */}
            <div
              className="absolute top-0 left-0 right-0 h-[2px]"
              style={{ background: `linear-gradient(90deg, ${accentColor} 0%, ${accentColor}40 80%, transparent 100%)` }}
              aria-hidden
            />

            <div className="p-5 pt-6 sm:p-6 sm:pt-7">
              {/* Icon badge */}
              <div
                className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center text-2xl sm:text-3xl mb-4"
                style={{
                  background: accentGlow,
                  border: `1px solid ${accentColor}25`,
                  boxShadow: `0 0 14px ${accentColor}12`,
                }}
              >
                {icon}
              </div>
              <div
                className="font-bold text-base sm:text-lg leading-tight text-white mb-1.5"
                style={{ letterSpacing: "-0.01em" }}
              >
                {label}
              </div>
              <p className="text-xs sm:text-sm leading-snug" style={{ color: "rgba(148,163,184,0.72)" }}>
                {description}
              </p>
            </div>
          </Link>
        ))}
      </div>

      {/* ─── More Tools ─── */}
      <p className="text-xs font-bold tracking-[0.13em] uppercase mb-3 px-0.5" style={{ color: "rgba(148,163,184,0.6)" }}>
        More Tools
      </p>

      <div className="grid grid-cols-4 gap-3">
        {SECONDARY_CARDS.map(({ href, label, icon }) => (
          <Link
            key={href}
            href={href}
            prefetch={false}
            className="card-lift rounded-xl flex flex-col items-center justify-center py-4 px-2 text-center active:scale-[0.96]"
            style={{
              background: "rgba(15,23,42,0.72)",
              border: "1px solid rgba(148,163,184,0.12)",
              boxShadow: "inset 0 1px 0 rgba(255,255,255,0.04), 0 2px 12px rgba(2,6,23,0.45)",
            }}
          >
            <span className="text-2xl mb-2 leading-none" aria-hidden>{icon}</span>
            <span className="text-xs font-semibold leading-tight" style={{ color: "rgba(203,213,225,0.85)" }}>
              {label}
            </span>
          </Link>
        ))}
      </div>

    </main>
  );
}
