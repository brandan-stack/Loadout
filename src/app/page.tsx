import Link from "next/link";

const ALL_TILES = [
  {
    href: "/jobs",
    label: "Jobs",
    description: "Log parts & materials",
    icon: "🔧",
    accent: "#2dd4bf",
    glow: "rgba(45,212,191,0.13)",
    gradient: "linear-gradient(140deg, rgba(14,36,34,0.97) 0%, rgba(9,15,26,0.99) 100%)",
  },
  {
    href: "/scan",
    label: "Scan",
    description: "Capture barcodes instantly",
    icon: "⬡",
    accent: "#38bdf8",
    glow: "rgba(56,189,248,0.13)",
    gradient: "linear-gradient(140deg, rgba(10,28,46,0.97) 0%, rgba(9,15,26,0.99) 100%)",
  },
  {
    href: "/items",
    label: "Inventory",
    description: "Catalog & stock levels",
    icon: "📦",
    accent: "#818cf8",
    glow: "rgba(129,140,248,0.13)",
    gradient: "linear-gradient(140deg, rgba(16,18,52,0.97) 0%, rgba(9,15,26,0.99) 100%)",
  },
  {
    href: "/reports",
    label: "Reports",
    description: "Trends & cost analysis",
    icon: "📊",
    accent: "#34d399",
    glow: "rgba(52,211,153,0.13)",
    gradient: "linear-gradient(140deg, rgba(8,34,26,0.97) 0%, rgba(9,15,26,0.99) 100%)",
  },
  {
    href: "/reorder",
    label: "Reorder",
    description: "Low-stock suggestions",
    icon: "🔄",
    accent: "#f59e0b",
    glow: "rgba(245,158,11,0.12)",
    gradient: "linear-gradient(140deg, rgba(28,20,8,0.97) 0%, rgba(9,15,26,0.99) 100%)",
  },
  {
    href: "/suppliers",
    label: "Suppliers",
    description: "Vendor management",
    icon: "🏭",
    accent: "#e879f9",
    glow: "rgba(232,121,249,0.12)",
    gradient: "linear-gradient(140deg, rgba(26,10,30,0.97) 0%, rgba(9,15,26,0.99) 100%)",
  },
  {
    href: "/settings",
    label: "Settings",
    description: "App & feature config",
    icon: "⚙️",
    accent: "#94a3b8",
    glow: "rgba(148,163,184,0.10)",
    gradient: "linear-gradient(140deg, rgba(18,22,36,0.97) 0%, rgba(9,15,26,0.99) 100%)",
  },
];

export default function Home() {
  return (
    <main className="px-4 sm:px-6 pt-6 sm:pt-8 max-w-2xl sm:max-w-3xl mx-auto pb-28">

      {/* ─── Greeting ─── */}
      <p
        className="text-[11px] font-bold uppercase tracking-[0.18em] mb-5 px-0.5"
        style={{ color: "rgba(148,163,184,0.5)" }}
      >
        What are you working on?
      </p>

      {/* ─── Unified tile grid ─── */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4">
        {ALL_TILES.map(({ href, label, description, icon, accent, glow, gradient }) => (
          <Link
            key={href}
            href={href}
            prefetch={false}
            className="relative card-lift rounded-2xl overflow-hidden block active:scale-[0.97]"
            style={{
              background: gradient,
              border: `1px solid ${accent}22`,
              boxShadow: `0 4px 24px rgba(2,6,23,0.55), inset 0 1px 0 rgba(255,255,255,0.04)`,
            }}
          >
            {/* Accent stripe */}
            <div
              className="absolute top-0 left-0 right-0 h-[2px]"
              style={{
                background: `linear-gradient(90deg, ${accent} 0%, ${accent}50 70%, transparent 100%)`,
              }}
              aria-hidden
            />
            <div className="p-5 pt-6">
              {/* Icon */}
              <div
                className="w-11 h-11 rounded-xl flex items-center justify-center text-2xl mb-3.5"
                style={{
                  background: glow,
                  border: `1px solid ${accent}28`,
                  boxShadow: `0 0 16px ${accent}14`,
                }}
              >
                {icon}
              </div>
              <div
                className="font-bold text-[15px] sm:text-base leading-tight text-white mb-1"
                style={{ letterSpacing: "-0.01em" }}
              >
                {label}
              </div>
              <p
                className="text-xs leading-snug"
                style={{ color: "rgba(148,163,184,0.68)" }}
              >
                {description}
              </p>
            </div>
          </Link>
        ))}
      </div>

    </main>
  );
}

