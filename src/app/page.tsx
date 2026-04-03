import Link from "next/link";

export default function Home() {
  return (
    <main
      className="flex flex-col items-center px-4 pt-14 pb-8"
      style={{ minHeight: "calc(100vh - 3.5rem)" }}
    >
      <div className="w-full max-w-lg">

        {/* ─── Greeting ─── */}
        <p
          className="text-xs font-semibold uppercase tracking-[0.20em] mb-8"
          style={{ color: "rgba(100,116,139,0.55)" }}
        >
          Welcome back
        </p>

        {/* ─── Inventory Hero Card ─── */}
        <div
          className="relative rounded-2xl overflow-hidden"
          style={{
            background: "linear-gradient(160deg, rgba(18,22,52,0.99) 0%, rgba(10,12,30,1) 100%)",
            border: "1px solid rgba(99,102,241,0.18)",
            boxShadow: "0 12px 48px rgba(0,0,0,0.60), 0 1px 0 rgba(255,255,255,0.05) inset",
          }}
        >
          {/* Top accent */}
          <div
            className="absolute top-0 left-0 right-0 h-[2px]"
            style={{ background: "linear-gradient(90deg, #6366f1 0%, #818cf8 50%, transparent 100%)" }}
            aria-hidden
          />

          {/* Content */}
          <div className="p-8 sm:p-10">
            <div className="flex items-start gap-5">
              <div
                className="shrink-0 w-14 h-14 rounded-xl flex items-center justify-center text-2xl"
                style={{
                  background: "rgba(99,102,241,0.14)",
                  border: "1px solid rgba(129,140,248,0.18)",
                }}
              >
                📦
              </div>
              <div className="flex-1 min-w-0">
                <h1
                  className="font-bold text-white leading-tight mb-1.5"
                  style={{ fontSize: "24px", letterSpacing: "-0.02em" }}
                >
                  Inventory
                </h1>
                <p className="text-sm" style={{ color: "rgba(148,163,184,0.55)" }}>
                  Catalog &amp; track parts
                </p>
              </div>
            </div>

            <div className="mt-8 flex items-center gap-3">
              <Link
                href="/items"
                prefetch={false}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition-all hover:brightness-110 active:scale-[0.97]"
                style={{
                  background: "linear-gradient(135deg, #5b5ef4 0%, #818cf8 100%)",
                  boxShadow: "0 3px 16px rgba(91,94,244,0.38)",
                }}
              >
                + Add Item
              </Link>
              <Link
                href="/items"
                prefetch={false}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium transition-all hover:bg-white/[0.06] active:scale-[0.97]"
                style={{
                  color: "rgba(148,163,184,0.7)",
                  border: "1px solid rgba(255,255,255,0.07)",
                }}
              >
                View All
              </Link>
            </div>
          </div>
        </div>

        {/* ─── Tagline ─── */}
        <p
          className="text-xs mt-5 text-center"
          style={{ color: "rgba(100,116,139,0.4)" }}
        >
          Track, manage, and move parts
        </p>

      </div>
    </main>
  );
}