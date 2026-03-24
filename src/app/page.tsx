import Link from "next/link";

const PRIMARY_CARDS = [
  {
    href: "/scan",
    label: "Scan",
    description: "Capture barcode and update stock in seconds",
    icon: "⬡",
    color: "from-cyan-950/90 to-sky-900/80",
  },
  {
    href: "/items",
    label: "Items",
    description: "Search catalog, adjust thresholds, and add new items",
    icon: "📦",
    color: "from-indigo-950/90 to-blue-900/80",
  },
  {
    href: "/reports",
    label: "Reports",
    description: "Spot trends, low stock, and dead inventory quickly",
    icon: "📊",
    color: "from-emerald-950/90 to-teal-900/80",
  },
  {
    href: "/reorder",
    label: "Reorder",
    description: "Use recommendations to plan your next purchase",
    icon: "🔄",
    color: "from-amber-950/90 to-orange-900/80",
  },
];

const SECONDARY_CARDS = [
  { href: "/suppliers", label: "Suppliers", icon: "🏭" },
  { href: "/tools", label: "Tools", icon: "🧰" },
  { href: "/locations", label: "Locations", icon: "📍" },
  { href: "/import", label: "Import CSV", icon: "⬆" },
  { href: "/reports/expiry", label: "Expiry Alerts", icon: "⏰" },
  { href: "/scheduler", label: "Scheduler", icon: "📅" },
  { href: "/settings", label: "Settings", icon: "⚙" },
];

export default function Home() {
  return (
    <main className="container mx-auto px-3 py-4 sm:p-4 max-w-4xl form-screen">
      <div className="page-frame p-4 sm:p-6 mb-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <span className="eyebrow">Today</span>
            <h1 className="text-3xl sm:text-5xl font-bold mt-3 leading-tight">Inventory Command Center</h1>
            <p className="text-slate-600 mt-2 max-w-xl text-sm sm:text-base">
              Fast actions and focused tools for daily stock updates, audit checks, and reorder planning.
            </p>
          </div>
          <Link
            href="/scan"
            prefetch={false}
            className="rounded-xl bg-teal-700 text-white px-4 py-2.5 text-sm font-semibold shadow-sm hover:bg-teal-800 transition-colors"
          >
            Start Scan
          </Link>
        </div>

        <div className="grid grid-cols-3 gap-2 sm:gap-3 mt-5">
          <div className="rounded-xl bg-white/85 border border-slate-200 p-2.5 sm:p-3">
            <p className="text-[11px] sm:text-xs text-slate-500">Workflow</p>
            <p className="text-sm sm:text-base font-semibold">Daily Ready</p>
          </div>
          <div className="rounded-xl bg-white/85 border border-slate-200 p-2.5 sm:p-3">
            <p className="text-[11px] sm:text-xs text-slate-500">Reports</p>
            <p className="text-sm sm:text-base font-semibold">One Tap</p>
          </div>
          <div className="rounded-xl bg-white/85 border border-slate-200 p-2.5 sm:p-3">
            <p className="text-[11px] sm:text-xs text-slate-500">Sync</p>
            <p className="text-sm sm:text-base font-semibold">Live APIs</p>
          </div>
        </div>
      </div>

      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm sm:text-base font-semibold text-slate-700">Core Actions</h2>
        <span className="text-xs text-slate-500">Tap any card</span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
        {PRIMARY_CARDS.map(({ href, label, description, icon, color }) => (
          <Link
            key={href}
            href={href}
            prefetch={false}
            className={`card-lift rounded-2xl p-4 sm:p-5 block border border-slate-700/80 bg-gradient-to-br ${color} shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] active:scale-[0.99]`}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="font-bold text-lg leading-tight text-slate-50">{label}</div>
                <p className="text-xs sm:text-sm text-slate-200 mt-1">{description}</p>
              </div>
              <div className="text-2xl sm:text-3xl opacity-95" aria-hidden>
                {icon}
              </div>
            </div>
          </Link>
        ))}
      </div>

      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm sm:text-base font-semibold text-slate-700">More Tools</h2>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {SECONDARY_CARDS.map(({ href, label, icon }) => (
          <Link
            key={href}
            href={href}
            prefetch={false}
            className="soft-button rounded-xl p-3 sm:p-3.5 flex flex-col items-center text-center card-lift"
          >
            <span className="text-2xl">{icon}</span>
            <span className="text-xs mt-1 text-slate-700 font-medium">{label}</span>
          </Link>
        ))}
      </div>
    </main>
  );
}

