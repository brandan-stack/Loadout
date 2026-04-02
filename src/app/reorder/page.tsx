"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { GlassBubbleCard } from "@/components/ui/glass-bubble-card";
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

  const priorityColor = (priority: string) => {
    switch (priority) {
      case "urgent":
        return "bg-red-950/40 border-l-4 border-red-500";
      case "high":
        return "bg-amber-950/40 border-l-4 border-amber-500";
      case "medium":
        return "bg-blue-950/40 border-l-4 border-blue-500";
      default:
        return "bg-slate-800/60 border-l-4 border-slate-600";
    }
  };

  const priorityBadge = (priority: string) => {
    switch (priority) {
      case "urgent":
        return "bg-red-600 text-white";
      case "high":
        return "bg-amber-500 text-white";
      case "medium":
        return "bg-blue-500 text-white";
      default:
        return "bg-gray-500 text-white";
    }
  };

  return (
    <main className="container mx-auto px-3 py-4 sm:p-4 max-w-6xl">
      <h1 className="text-2xl sm:text-4xl font-bold mb-2 leading-tight">Reorder Recommendations</h1>
      <p className="text-slate-400 mb-6">
        Smart reorder suggestions based on usage velocity and supplier lead
        times.
      </p>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mb-6">
        <GlassBubbleCard>
          <div className="text-center">
            <p className="text-gray-600 text-sm">Urgent</p>
            <p className="text-2xl sm:text-3xl font-bold text-red-600">{stats.urgent}</p>
          </div>
        </GlassBubbleCard>
        <GlassBubbleCard>
          <div className="text-center">
            <p className="text-gray-600 text-sm">High Priority</p>
            <p className="text-2xl sm:text-3xl font-bold text-amber-600">{stats.high}</p>
          </div>
        </GlassBubbleCard>
        <GlassBubbleCard>
          <div className="text-center">
            <p className="text-gray-600 text-sm">Total Items</p>
            <p className="text-2xl sm:text-3xl font-bold text-blue-600">{stats.total}</p>
          </div>
        </GlassBubbleCard>
      </div>

      {loading ? (
        <div className="text-center py-8">
          <p>Loading recommendations...</p>
        </div>
      ) : recommendations.length === 0 ? (
        <GlassBubbleCard className="text-center py-8 text-gray-500">
          <p>No reorder recommendations at this time. All stock levels are adequate!</p>
        </GlassBubbleCard>
      ) : (
        <div className="space-y-4">
          {recommendations.map((rec) => (
            <div
              key={rec.itemId}
              className={`p-4 rounded-lg ${priorityColor(rec.priority)}`}
            >
              <div className="flex flex-col sm:flex-row justify-between sm:items-start mb-3 gap-2">
                <div>
                  <h3 className="text-lg font-bold">{rec.name}</h3>
                  {rec.barcode && (
                    <p className="text-xs text-gray-600 font-mono">
                      {rec.barcode}
                    </p>
                  )}
                </div>
                <span
                  className={`px-3 py-1 rounded text-xs font-bold ${priorityBadge(
                    rec.priority
                  )}`}
                >
                  {rec.priority.toUpperCase()}
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 mb-3 text-sm">
                <div>
                  <p className="text-xs text-slate-400">Current</p>
                  <p className="font-bold">{rec.currentQuantity}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-400">Min</p>
                  <p className="font-bold">{rec.minQuantity.toFixed(0)}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-400">Max</p>
                  <p className="font-bold">{rec.maxQuantity.toFixed(0)}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-400">Usage/Day</p>
                  <p className="font-bold">{rec.usagePerDay}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-400">Lead Time</p>
                  <p className="font-bold">{rec.leadTimeDays}d</p>
                </div>
              </div>

              <p className="text-sm text-slate-300 mb-3">{rec.reason}</p>

              <div className="flex flex-wrap gap-2 items-center">
                <div className="bg-white/50 px-3 py-1 rounded text-sm font-semibold">
                  Order: {rec.suggestedOrderQuantity.toFixed(0)} units
                </div>
                {rec.preferredSupplier && (
                  <div className="text-xs text-slate-300">
                    Via <strong>{rec.preferredSupplier.name}</strong> (Arrives{" "}
                    {new Date(rec.estimatedArrivalDate).toLocaleDateString()})
                  </div>
                )}
                <Link
                  href={`/items?item=${rec.itemId}`}
                  className="w-full sm:w-auto text-center sm:ml-auto px-3 py-1 bg-blue-500 text-white text-xs rounded hover:bg-blue-600"
                >
                  View Item
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}

      <GlassBubbleCard className="mt-8 p-6 bg-blue-950/30">
        <h3 className="font-bold text-lg mb-2">📋 How It Works</h3>
        <ul className="text-sm text-slate-300 space-y-1 list-disc list-inside">
          <li>
            <strong>Minimum Stock:</strong> Based on supplier lead time ×
            daily usage
          </li>
          <li>
            <strong>Maximum Stock:</strong> 2× the minimum (provides buffer)
          </li>
          <li>
            <strong>Priority:</strong> Determined by how far below minimum or
            if out of stock
          </li>
          <li>
            <strong>Arrival Date:</strong> Current date + supplier lead time
          </li>
        </ul>
      </GlassBubbleCard>
    </main>
  );
}
