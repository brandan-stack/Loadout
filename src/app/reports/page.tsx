"use client";

import Link from "next/link";

const REPORTS = [
  {
    slug: "jobs",
    title: "Parts by Job",
    description: "Material costs per job for billing and review",
    icon: "🔧",
  },
  {
    slug: "low-stock",
    title: "Low Stock",
    description: "Items below low or critical thresholds",
    icon: "⚠️",
  },
  {
    slug: "usage",
    title: "Usage",
    description: "Items used during a selected time period",
    icon: "📊",
  },
  {
    slug: "dead-stock",
    title: "Dead Stock",
    description: "Items not used for 90 or more days",
    icon: "🗃️",
  },
  {
    slug: "fast-movers",
    title: "Fast Movers",
    description: "Highest-volume items by daily usage rate",
    icon: "⚡",
  },
];

export default function ReportsPage() {
  return (
    <main className="mx-auto w-full max-w-[1280px] px-4 sm:px-6 lg:px-8 py-8">

      {/* ─── Header ─── */}
      <div className="mb-8">
        <h1
          className="font-bold text-white leading-none"
          style={{ fontSize: "24px", letterSpacing: "-0.02em" }}
        >
          Reports
        </h1>
        <p className="text-xs text-slate-500 mt-1.5 uppercase tracking-widest font-medium">
          {REPORTS.length} report types
        </p>
      </div>

      {/* ─── Report list ─── */}
      <div
        className="rounded-2xl overflow-hidden"
        style={{ border: "1px solid rgba(255,255,255,0.06)" }}
      >
        {REPORTS.map((report, idx) => (
          <Link
            key={report.slug}
            href={`/reports/${report.slug}`}
            prefetch={false}
            className="flex items-center gap-4 px-5 py-4 transition-colors hover:bg-white/[0.03] group"
            style={{
              background: "rgba(12,17,36,0.85)",
              borderBottom: idx < REPORTS.length - 1 ? "1px solid rgba(255,255,255,0.05)" : "none",
            }}
          >
            <div
              className="shrink-0 w-10 h-10 rounded-xl flex items-center justify-center text-lg"
              style={{
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.07)",
              }}
            >
              {report.icon}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-slate-100 group-hover:text-white transition-colors">
                {report.title}
              </p>
              <p className="text-xs text-slate-500 mt-0.5 truncate">{report.description}</p>
            </div>
            <svg
              className="shrink-0 text-slate-600 group-hover:text-slate-400 transition-colors"
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden
            >
              <path d="M9 18l6-6-6-6" />
            </svg>
          </Link>
        ))}
      </div>

    </main>
  );
}
