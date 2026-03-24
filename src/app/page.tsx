import Link from "next/link";

const PRIMARY_CARDS = [
  { href: "/items", label: "Items", description: "Browse and manage your inventory", icon: "📦", color: "bg-blue-50" },
  { href: "/scan", label: "Scan", description: "Scan barcodes to add or use stock", icon: "⬡", color: "bg-purple-50" },
  { href: "/reports", label: "Reports", description: "Low stock, usage, fast movers", icon: "📊", color: "bg-green-50" },
  { href: "/reorder", label: "Reorder", description: "Smart reorder recommendations", icon: "🔄", color: "bg-amber-50" },
];

const SECONDARY_CARDS = [
  { href: "/suppliers", label: "Suppliers", icon: "🏭" },
  { href: "/locations", label: "Locations", icon: "📍" },
  { href: "/import", label: "Import CSV", icon: "⬆" },
  { href: "/reports/expiry", label: "Expiry Alerts", icon: "⏰" },
  { href: "/scheduler", label: "Scheduler", icon: "📅" },
  { href: "/settings", label: "Settings", icon: "⚙" },
];

export default function Home() {
  return (
    <main className="container mx-auto px-3 py-4 sm:p-4 max-w-lg">
      <div className="pt-6 sm:pt-8 pb-4">
        <h1 className="text-3xl max-[360px]:text-[1.75rem] sm:text-5xl font-bold">Loadout</h1>
        <p className="text-gray-500 mt-1">Inventory Management</p>
      </div>

      {/* Primary grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
        {PRIMARY_CARDS.map(({ href, label, description, icon, color }) => (
          <Link
            key={href}
            href={href}
            prefetch={false}
            className={`${color} rounded-2xl p-3 sm:p-4 block hover:scale-[1.02] transition-transform active:scale-[0.98]`}
          >
            <div className="text-2xl sm:text-3xl mb-2">{icon}</div>
            <div className="font-bold">{label}</div>
            <p className="text-xs text-gray-500 mt-1">{description}</p>
          </Link>
        ))}
      </div>

      {/* Secondary row */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {SECONDARY_CARDS.map(({ href, label, icon }) => (
          <Link
            key={href}
            href={href}
            prefetch={false}
            className="bg-white/60 backdrop-blur rounded-xl p-3 flex flex-col items-center text-center hover:bg-white transition-colors"
          >
            <span className="text-2xl">{icon}</span>
            <span className="text-xs mt-1 text-gray-700">{label}</span>
          </Link>
        ))}
      </div>
    </main>
  );
}

