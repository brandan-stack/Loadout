"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ReorderRecommendation } from "@/lib/reorder/types";

export default function ReorderPage() {
  const [recommendations, setRecommendations] = useState<
    ReorderRecommendation[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    urgent: 0,
    high: 0,
    total: 0,
  });

  useEffect(() => {
    fetchRecommendations();
  }, []);

  async function fetchRecommendations() {
    try {
      const res = await fetch("/api/reorder/recommendations");
      const data = await res.json();
      setRecommendations(Array.isArray(data?.recommendations) ? data.recommendations : []);
      setStats({
        urgent: data.urgent || 0,
        high: data.high || 0,
        total: data.count || 0,
      });
    } catch (error) {
      console.error("Failed to fetch recommendations:", error);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto w-full max-w-[1280px] px-4 sm:px-6 lg:px-8 py-8">

      {/* ─── Header ─── */}
      <div className="mb-5">
        <div>
          <h1
            className="font-bold text-white leading-none"
            style={{ fontSize: "24px", letterSpacing: "-0.02em" }}
          >
            Reorder
          </h1>
          <p className="text-xs text-slate-500 mt-1.5 uppercase tracking-widest font-medium">
            Smart stock suggestions
          </p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 mb-8">
        <span
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold"
          style={{
            background: "rgba(255,255,255,0.05)",
            border: "1px solid rgba(255,255,255,0.08)",
            color: "#cbd5e1",
          }}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-slate-400 inline-block" />
          {stats.total} Total
        </span>
        <span
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold"
          style={{
            background: "rgba(239,68,68,0.13)",
            border: "1px solid rgba(239,68,68,0.22)",
            color: "#fca5a5",
          }}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-red-500 inline-block" />
          {stats.urgent} Critical
        </span>
        <span
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold"
          style={{
            background: "rgba(245,158,11,0.12)",
            border: "1px solid rgba(245,158,11,0.20)",
            color: "#fcd34d",
          }}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-amber-500 inline-block" />
          {stats.high} Low
        </span>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <p className="text-slate-500 animate-pulse">Loading recommendations…</p>
        </div>
      ) : recommendations.length === 0 ? (
        <div
          className="rounded-2xl py-14 flex flex-col items-center text-center"
          style={{
            background: "rgba(12,17,36,0.85)",
            border: "1px solid rgba(255,255,255,0.06)",
          }}
        >
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl mb-5"
            style={{
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.07)",
            }}
          >
            📋
          </div>
          <p className="font-semibold text-slate-200 mb-1">No reorder actions right now</p>
          <p className="text-sm text-slate-500">Current stock levels do not need restocking</p>
        </div>
      ) : (
        <div
          className="rounded-2xl overflow-hidden"
          style={{ border: "1px solid rgba(255,255,255,0.06)" }}
        >
          {recommendations.map((rec, idx) => {
            const isUrgent = rec.priority === "urgent";
            const isHigh = rec.priority === "high";
            const isLast = idx === recommendations.length - 1;
            return (
              <div
                key={rec.itemId}
                className="px-5 py-4"
                style={{
                  background: isUrgent
                    ? "rgba(239,68,68,0.05)"
                    : isHigh
                    ? "rgba(245,158,11,0.04)"
                    : "rgba(12,17,36,0.85)",
                  borderBottom: isLast ? "none" : "1px solid rgba(255,255,255,0.05)",
                  borderLeft: isUrgent
                    ? "3px solid #ef4444"
                    : isHigh
                    ? "3px solid #f59e0b"
                    : "3px solid transparent",
                }}
              >
                <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-sm font-semibold text-slate-100">{rec.name}</h3>
                      <span
                        className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-md"
                        style={{
                          background: isUrgent ? "rgba(239,68,68,0.14)" : "rgba(245,158,11,0.13)",
                          color: isUrgent ? "#fca5a5" : "#fcd34d",
                          border: isUrgent ? "1px solid rgba(239,68,68,0.22)" : "1px solid rgba(245,158,11,0.20)",
                        }}
                      >
                        {isUrgent ? "Critical" : "Low"}
                      </span>
                    </div>
                    {rec.barcode && (
                      <p className="text-xs text-slate-600 font-mono mt-0.5">{rec.barcode}</p>
                    )}
                  </div>
                  <Link
                    href={`/items?item=${rec.itemId}`}
                    className="shrink-0 self-start rounded-lg px-3 py-1.5 text-xs font-medium text-slate-300 transition-colors hover:text-white"
                    style={{ border: "1px solid rgba(255,255,255,0.09)" }}
                  >
                    View Item
                  </Link>
                </div>

                <div className="mb-3 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
                  {[
                    { label: "On Hand", value: String(rec.currentQuantity) },
                    { label: "Min", value: rec.minQuantity.toFixed(0) },
                    { label: "Max", value: rec.maxQuantity.toFixed(0) },
                    { label: "Usage/Day", value: String(rec.usagePerDay) },
                    { label: "Lead Time", value: `${rec.leadTimeDays}d` },
                  ].map(({ label, value }) => (
                    <div key={label}>
                      <p className="text-[10px] text-slate-500 uppercase tracking-wider">{label}</p>
                      <p className="text-sm font-semibold text-slate-200 mt-0.5">{value}</p>
                    </div>
                  ))}
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <span
                    className="text-xs font-semibold px-2.5 py-1 rounded-lg"
                    style={{
                      background: "rgba(255,255,255,0.06)",
                      border: "1px solid rgba(255,255,255,0.09)",
                      color: "#e2e8f0",
                    }}
                  >
                    Order: {rec.suggestedOrderQuantity.toFixed(0)} units
                  </span>
                  {rec.preferredSupplier && (
                    <span className="text-xs text-slate-500">
                      via <span className="text-slate-300">{rec.preferredSupplier.name}</span>
                      {" · "}arrives {new Date(rec.estimatedArrivalDate).toLocaleDateString()}
                    </span>
                  )}
                </div>
                {rec.reason && (
                  <p className="text-xs text-slate-500 mt-2">{rec.reason}</p>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* How it works */}
      <div
        className="mt-8 rounded-2xl px-5 py-4"
        style={{
          background: "rgba(12,17,36,0.85)",
          border: "1px solid rgba(255,255,255,0.06)",
        }}
      >
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-3">How it works</p>
        <ul className="text-xs text-slate-500 space-y-1.5">
          <li><span className="text-slate-400">Min Stock</span> — supplier lead time × daily usage</li>
          <li><span className="text-slate-400">Max Stock</span> — 2× minimum for safety buffer</li>
          <li><span className="text-slate-400">Priority</span> — how far below minimum the item is</li>
          <li><span className="text-slate-400">Arrival Date</span> — today + supplier lead time</li>
        </ul>
      </div>

    </main>
  );
}
