"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { GlassBubbleCard } from "@/components/ui/glass-bubble-card";

interface Schedule {
  id: string;
  name: string;
  reportType: string;
  frequency: string;
  nextRun: string;
  lastRun: string | null;
}

const REPORT_LABELS: Record<string, string> = {
  low_stock: "Low Stock",
  usage_period: "Usage Period",
  dead_stock: "Dead Stock",
  fast_movers: "Fast Movers",
};

const FREQ_LABELS: Record<string, string> = {
  daily: "Daily",
  weekly: "Weekly",
  monthly: "Monthly",
};

const REPORT_LINKS: Record<string, string> = {
  low_stock: "/reports/low-stock",
  usage_period: "/reports",
  dead_stock: "/reports",
  fast_movers: "/reports",
};

export default function SchedulerInboxPage() {
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");
  const [reportType, setReportType] = useState<string>("low_stock");
  const [frequency, setFrequency] = useState<string>("weekly");

  useEffect(() => {
    loadSchedules();
  }, []);

  async function loadSchedules() {
    const res = await fetch("/api/reports/schedules");
    setSchedules(await res.json());
    setLoading(false);
  }

  async function handleAdd() {
    if (!name.trim()) return;
    await fetch("/api/reports/schedules", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, reportType, frequency }),
    });
    setName("");
    setAdding(false);
    loadSchedules();
  }

  async function handleDelete(id: string) {
    await fetch(`/api/reports/schedules/${id}`, { method: "DELETE" });
    loadSchedules();
  }

  function isDue(nextRun: string): boolean {
    return new Date(nextRun) <= new Date();
  }

  if (loading)
    return (
      <div className="flex justify-center items-center min-h-screen">
        <p>Loading scheduler…</p>
      </div>
    );

  const due = schedules.filter((s) => isDue(s.nextRun));
  const upcoming = schedules.filter((s) => !isDue(s.nextRun));

  return (
    <main className="container mx-auto px-3 py-4 sm:p-4 max-w-2xl form-screen">
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 mb-6">
        <div>
          <h1 className="text-3xl sm:text-4xl font-bold">Report Scheduler</h1>
          <p className="text-gray-600 mt-1">Scheduled reports appear here when due.</p>
        </div>
        <button
          onClick={() => setAdding(!adding)}
          className="px-4 py-2 bg-blue-500 text-white rounded-xl text-sm hover:bg-blue-600"
        >
          + Schedule
        </button>
      </div>

      {/* Add schedule form */}
      {adding && (
        <GlassBubbleCard className="mb-6">
          <h2 className="font-bold mb-3">New Scheduled Report</h2>
          <div className="space-y-3">
            <input
              placeholder="Schedule name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
            <select
              value={reportType}
              onChange={(e) => setReportType(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
            >
              {Object.entries(REPORT_LABELS).map(([v, l]) => (
                <option key={v} value={v}>{l}</option>
              ))}
            </select>
            <select
              value={frequency}
              onChange={(e) => setFrequency(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
            >
              {Object.entries(FREQ_LABELS).map(([v, l]) => (
                <option key={v} value={v}>{l}</option>
              ))}
            </select>
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={() => setAdding(false)}
                className="px-4 py-2 border rounded-lg text-sm hover:bg-gray-100"
              >
                Cancel
              </button>
              <button
                onClick={handleAdd}
                className="flex-1 py-2 bg-blue-500 text-white text-sm rounded-lg hover:bg-blue-600"
              >
                Schedule Report
              </button>
            </div>
          </div>
        </GlassBubbleCard>
      )}

      {/* Due now */}
      {due.length > 0 && (
        <div className="mb-6">
          <h2 className="font-bold text-red-600 mb-3">Due Now ({due.length})</h2>
          <div className="space-y-3">
            {due.map((s) => (
              <GlassBubbleCard key={s.id}>
                <div className="flex flex-col sm:flex-row justify-between sm:items-start gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{s.name}</span>
                      <span className="px-2 py-0.5 bg-red-100 text-red-700 text-xs rounded">
                        Due
                      </span>
                    </div>
                    <p className="text-sm text-gray-500 mt-0.5">
                      {REPORT_LABELS[s.reportType]} · {FREQ_LABELS[s.frequency]}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Link
                      href={REPORT_LINKS[s.reportType]}
                      className="px-3 py-1.5 bg-blue-500 text-white text-sm rounded hover:bg-blue-600"
                    >
                      View Report
                    </Link>
                    <button
                      onClick={() => handleDelete(s.id)}
                      className="px-3 py-1.5 text-gray-400 text-sm rounded hover:text-red-500"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              </GlassBubbleCard>
            ))}
          </div>
        </div>
      )}

      {/* Upcoming */}
      {upcoming.length > 0 ? (
        <div>
          <h2 className="font-bold text-gray-600 mb-3">Upcoming</h2>
          <div className="space-y-3">
            {upcoming.map((s) => (
              <GlassBubbleCard key={s.id}>
                <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3">
                  <div>
                    <span className="font-medium">{s.name}</span>
                    <p className="text-sm text-gray-500 mt-0.5">
                      {REPORT_LABELS[s.reportType]} · {FREQ_LABELS[s.frequency]} · Next:{" "}
                      {new Date(s.nextRun).toLocaleDateString()}
                    </p>
                  </div>
                  <button
                    onClick={() => handleDelete(s.id)}
                    className="text-gray-400 text-sm hover:text-red-500"
                  >
                    Remove
                  </button>
                </div>
              </GlassBubbleCard>
            ))}
          </div>
        </div>
      ) : (
        due.length === 0 && (
          <GlassBubbleCard>
            <p className="text-center text-gray-400 py-8">
              No scheduled reports yet. Add one to get reminders when to review your inventory.
            </p>
          </GlassBubbleCard>
        )
      )}
    </main>
  );
}
