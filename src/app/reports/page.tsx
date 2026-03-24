"use client";

import Link from "next/link";
import { GlassBubbleCard } from "@/components/ui/glass-bubble-card";

export default function ReportsPage() {
  const reportTypes = [
    {
      slug: "low-stock",
      title: "Low Stock Report",
      description: "Items below amber or red thresholds",
      icon: "🚨",
      color: "red",
    },
    {
      slug: "usage",
      title: "Usage Report",
      description: "Items used during a specific period",
      icon: "📊",
      color: "blue",
    },
    {
      slug: "dead-stock",
      title: "Dead Stock Report",
      description: "Items not used for 90+ days",
      icon: "💀",
      color: "gray",
    },
    {
      slug: "fast-movers",
      title: "Fast Movers Report",
      description: "High-volume items by usage per day",
      icon: "⚡",
      color: "amber",
    },
    {
      slug: "expiry",
      title: "Expiry Alerts",
      description: "Inventory nearing expiry windows",
      icon: "⏰",
      color: "blue",
    },
  ];

  return (
    <main className="container mx-auto px-3 py-4 sm:p-4 max-w-4xl">
      <h1 className="text-3xl sm:text-4xl font-bold mb-2">Reports</h1>
      <p className="text-gray-600 mb-8">
        Generate and export inventory reports to track usage patterns and
        optimize stock levels.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {reportTypes.map((report) => (
          <Link key={report.slug} href={`/reports/${report.slug}`}>
            <GlassBubbleCard className="h-full cursor-pointer hover:shadow-lg transition-shadow">
              <div className="flex items-start justify-between mb-3 gap-3">
                <h3 className="text-lg sm:text-xl font-bold leading-tight">{report.title}</h3>
                <span className="text-2xl sm:text-3xl">{report.icon}</span>
              </div>
              <p className="text-gray-600 text-sm mb-4">
                {report.description}
              </p>
              <div
                className={`inline-block px-3 py-1 rounded text-xs font-semibold text-white ${
                  report.color === "red"
                    ? "bg-red-500"
                    : report.color === "blue"
                      ? "bg-blue-500"
                      : report.color === "gray"
                        ? "bg-gray-500"
                        : "bg-amber-500"
                }`}
              >
                View Report →
              </div>
            </GlassBubbleCard>
          </Link>
        ))}
      </div>

      <GlassBubbleCard className="mt-8 p-6 bg-blue-50">
        <h3 className="font-bold text-lg mb-2">💡 Tips</h3>
        <ul className="text-sm text-gray-700 space-y-1 list-disc list-inside">
          <li>Low Stock: Check regularly to maintain optimal inventory</li>
          <li>Usage: Analyze trends to forecast future demand</li>
          <li>Dead Stock: Consider removing or repurposing stale items</li>
          <li>Fast Movers: Prioritize for frequent reordering</li>
        </ul>
      </GlassBubbleCard>
    </main>
  );
}
