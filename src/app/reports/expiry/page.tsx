"use client";

import { useState, useEffect, useCallback } from "react";
import { GlassBubbleCard } from "@/components/ui/glass-bubble-card";
import { ExpiryBadge } from "@/components/reports/expiry-badge";

interface ExpiryAlert {
  txId: string;
  itemId: string;
  itemName: string;
  barcode: string | null;
  quantity: number;
  lotNumber: string | null;
  expiryDate: string;
  daysLeft: number | null;
  severity: "expired" | "critical" | "warning";
}

export default function ExpiryAlertsPage() {
  const [alerts, setAlerts] = useState<ExpiryAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [withinDays, setWithinDays] = useState(30);

  const loadAlerts = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/reports/expiry?withinDays=${withinDays}`);
    setAlerts(await res.json());
    setLoading(false);
  }, [withinDays]);

  useEffect(() => {
    loadAlerts();
  }, [withinDays, loadAlerts]);

  const expired = alerts.filter((a) => a.severity === "expired");
  const critical = alerts.filter((a) => a.severity === "critical");
  const warning = alerts.filter((a) => a.severity === "warning");

  return (
    <main className="container mx-auto px-3 py-4 sm:p-4 max-w-2xl">
      <div className="flex flex-col sm:flex-row justify-between sm:items-start gap-3 mb-6">
        <div>
          <h1 className="text-3xl sm:text-4xl font-bold">Expiry Alerts</h1>
          <p className="text-gray-600 mt-1">Items approaching or past expiry date.</p>
        </div>
        <select
          value={withinDays}
          onChange={(e) => setWithinDays(parseInt(e.target.value))}
          className="w-full sm:w-auto px-3 py-2 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
        >
          <option value={7}>Next 7 days</option>
          <option value={30}>Next 30 days</option>
          <option value={60}>Next 60 days</option>
          <option value={90}>Next 90 days</option>
        </select>
      </div>

      {loading ? (
        <GlassBubbleCard>
          <p className="text-center text-gray-400 py-8">Loading alerts…</p>
        </GlassBubbleCard>
      ) : alerts.length === 0 ? (
        <GlassBubbleCard>
          <p className="text-center text-gray-400 py-8">
            No expiring items within the next {withinDays} days.
          </p>
        </GlassBubbleCard>
      ) : (
        <>
          {/* Summary */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
            <div className="bg-red-100 rounded-xl p-3 text-center">
              <p className="text-2xl font-bold text-red-700">{expired.length}</p>
              <p className="text-xs text-red-600">Expired</p>
            </div>
            <div className="bg-red-50 rounded-xl p-3 text-center">
              <p className="text-2xl font-bold text-red-600">{critical.length}</p>
              <p className="text-xs text-red-500">Critical (&le;7d)</p>
            </div>
            <div className="bg-amber-50 rounded-xl p-3 text-center">
              <p className="text-2xl font-bold text-amber-600">{warning.length}</p>
              <p className="text-xs text-amber-500">Warning</p>
            </div>
          </div>

          {/* Alert list */}
          <div className="space-y-3">
            {alerts.map((alert) => (
              <GlassBubbleCard key={alert.txId}>
                <div className="flex justify-between items-start">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{alert.itemName}</span>
                      <ExpiryBadge daysLeft={alert.daysLeft} />
                    </div>
                    <div className="text-sm text-gray-500 mt-1 space-x-3">
                      <span>Qty: {alert.quantity}</span>
                      {alert.lotNumber && <span>Lot: {alert.lotNumber}</span>}
                      {alert.barcode && <span>#{alert.barcode}</span>}
                    </div>
                  </div>
                  <span className="text-sm text-gray-400">
                    {new Date(alert.expiryDate).toLocaleDateString()}
                  </span>
                </div>
              </GlassBubbleCard>
            ))}
          </div>
        </>
      )}
    </main>
  );
}
