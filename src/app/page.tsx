import Image from "next/image";
import Link from "next/link";

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
  { href: "/tools", label: "Tools", icon: "🧰" },
  { href: "/locations", label: "Locations", icon: "📍" },
  { href: "/import", label: "Import", icon: "⬆" },
  { href: "/settings", label: "Settings", icon: "⚙" },
];

export default function Home() {
  return (
    <main className="px-4 sm:px-6 pt-4 sm:pt-7 max-w-xl sm:max-w-2xl mx-auto">

      {/* ─── Premium Header ─── */}
      <header className="flex items-center justify-between mb-4 sm:mb-6">
        <div className="flex items-center gap-3">
          {/* Logo with teal glow ring */}
          <div className="relative flex-shrink-0">
            <div
              className="absolute -inset-2 rounded-2xl blur-lg pointer-events-none"
              style={{ background: "radial-gradient(circle, rgba(45,212,191,0.26) 0%, transparent 70%)" }}
              aria-hidden
            />
            <div
              className="relative w-11 h-11 sm:w-12 sm:h-12 rounded-2xl overflow-hidden"
              style={{ boxShadow: "0 0 0 1px rgba(45,212,191,0.38), 0 4px 20px rgba(45,212,191,0.16)" }}
            >
              <Image
                src="/icon-192.png"
                alt="Loadout"
                width={48}
                height={48}
                className="w-full h-full object-cover"
                priority
              />
            </div>
          </div>

          {/* Wordmark */}
          <div className="leading-none select-none">
            <div
              className="text-[20px] sm:text-[23px] font-extrabold text-white tracking-tighter"
              style={{
                fontFamily: "var(--font-heading), var(--font-body), sans-serif",
                textShadow: "0 0 28px rgba(45,212,191,0.16)",
              }}
            >
              LOADOUT
            </div>
            <div
              className="text-[9px] sm:text-[9.5px] font-bold tracking-[0.15em] uppercase mt-0.5"
              style={{ color: "rgba(45,212,191,0.65)" }}
            >
              Field Parts Tracking
            </div>
          </div>
        </div>

        {/* Glowing teal CTA */}
        <Link
          href="/jobs"
          prefetch={false}
          className="flex items-center gap-1.5 rounded-xl px-3.5 sm:px-4 py-2.5 text-[12.5px] sm:text-[13px] font-bold text-slate-950 active:scale-95 transition-transform select-none"
          style={{
            background: "linear-gradient(135deg, #2dd4bf 0%, #22d3ee 100%)",
            boxShadow: "0 0 20px rgba(45,212,191,0.4), 0 2px 8px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.2)",
          }}
        >
          <svg width="11" height="11" viewBox="0 0 11 11" fill="none" aria-hidden>
            <path d="M5.5 1v9M1 5.5h9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
          New Job
        </Link>
      </header>

      {/* ─── Accent rule ─── */}
      <div
        className="h-px mb-5 sm:mb-7"
        style={{ background: "linear-gradient(90deg, rgba(45,212,191,0.55) 0%, rgba(56,189,248,0.22) 55%, transparent 100%)" }}
        aria-hidden
      />

      {/* ─── Core Actions ─── */}
      <p className="text-[10px] font-bold tracking-[0.13em] uppercase mb-3 px-0.5" style={{ color: "rgba(148,163,184,0.55)" }}>
        Core Actions
      </p>

      <div className="grid grid-cols-2 gap-2.5 sm:gap-3 mb-6 sm:mb-8">
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

            <div className="p-4 pt-5 sm:p-5 sm:pt-6">
              {/* Icon badge */}
              <div
                className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl flex items-center justify-center text-xl sm:text-2xl mb-3.5"
                style={{
                  background: accentGlow,
                  border: `1px solid ${accentColor}25`,
                  boxShadow: `0 0 14px ${accentColor}12`,
                }}
              >
                {icon}
              </div>
              <div
                className="font-extrabold text-[14px] sm:text-[15px] leading-tight text-white mb-1"
                style={{ fontFamily: "var(--font-heading), sans-serif", letterSpacing: "-0.025em" }}
              >
                {label}
              </div>
              <p className="text-[11px] sm:text-xs leading-snug" style={{ color: "rgba(148,163,184,0.78)" }}>
                {description}
              </p>
            </div>
          </Link>
        ))}
      </div>

      {/* ─── More Tools ─── */}
      <p className="text-[10px] font-bold tracking-[0.13em] uppercase mb-3 px-0.5" style={{ color: "rgba(148,163,184,0.55)" }}>
        More Tools
      </p>

      <div className="grid grid-cols-3 gap-2 sm:gap-2.5">
        {SECONDARY_CARDS.map(({ href, label, icon }) => (
          <Link
            key={href}
            href={href}
            prefetch={false}
            className="card-lift rounded-xl flex flex-col items-center justify-center py-3.5 sm:py-4 px-2 text-center active:scale-[0.96]"
            style={{
              background: "rgba(15,23,42,0.68)",
              border: "1px solid rgba(148,163,184,0.11)",
              boxShadow: "inset 0 1px 0 rgba(255,255,255,0.035), 0 2px 10px rgba(2,6,23,0.4)",
            }}
          >
            <span className="text-[22px] mb-1.5 leading-none" aria-hidden>{icon}</span>
            <span className="text-[11px] font-semibold leading-tight" style={{ color: "rgba(203,213,225,0.8)" }}>
              {label}
            </span>
          </Link>
        ))}
      </div>

    </main>
  );
}
