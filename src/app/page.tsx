import Link from "next/link";

export default function Home() {
  return (
    <main
      className="flex flex-col items-center justify-center px-4 py-8"
      style={{ minHeight: "calc(100vh - 3.5rem)" }}
    >
      <div className="w-full max-w-md text-center">

        {/* ─── Eyebrow ─── */}
        <p
          className="text-xs font-bold uppercase tracking-[0.22em] mb-12"
          style={{ color: "rgba(148,163,184,0.35)" }}
        >
          Field Parts Tracking
        </p>

        {/* ─── Inventory Hero Card ─── */}
        <div
          className="relative rounded-3xl overflow-hidden mb-5"
          style={{
            background: "linear-gradient(145deg, rgba(16,20,46,0.98) 0%, rgba(9,12,28,0.99) 100%)",
            border: "1px solid rgba(129,140,248,0.14)",
            boxShadow: "0 8px 48px rgba(1,2,12,0.75), inset 0 1px 0 rgba(255,255,255,0.04)",
          }}
        >
          {/* Top accent stripe */}
          <div
            className="absolute top-0 left-0 right-0 h-[2px]"
            style={{
              background: "linear-gradient(90deg, #818cf8 0%, #6366f1 55%, transparent 100%)",
            }}
            aria-hidden
          />

          <div className="px-10 py-12 flex flex-col items-center">
            {/* Icon */}
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl mb-7"
              style={{
                background: "rgba(99,102,241,0.12)",
                border: "1px solid rgba(129,140,248,0.20)",
              }}
            >
              📦
            </div>

            <h1
              className="font-bold text-white mb-2.5"
              style={{ fontSize: "30px", letterSpacing: "-0.025em" }}
            >
              Inventory
            </h1>
            <p
              className="text-sm mb-9"
              style={{ color: "rgba(148,163,184,0.6)" }}
            >
              Catalog &amp; track parts
            </p>

            <Link
              href="/items"
              prefetch={false}
              className="inline-flex items-center gap-2 px-7 py-3 rounded-xl font-semibold text-sm text-white transition-all hover:brightness-110 active:scale-[0.97]"
              style={{
                background: "linear-gradient(135deg, #5b5ef4 0%, #818cf8 100%)",
                boxShadow: "0 4px 20px rgba(91,94,244,0.40)",
                letterSpacing: "0.01em",
              }}
            >
              + Add Item
            </Link>
          </div>
        </div>

        {/* ─── Supporting line ─── */}
        <p
          className="text-xs tracking-wide"
          style={{ color: "rgba(100,116,139,0.5)" }}
        >
          Track, manage, and move parts
        </p>

      </div>
    </main>
  );
}