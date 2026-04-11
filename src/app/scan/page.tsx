"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ScanView } from "@/components/camera/scan-view";
import { useCurrentUser } from "@/hooks/useCurrentUser";

interface ScanResult {
  barcode: string;
  itemId: string;
  action: string;
}

export default function ScanPage() {
  const router = useRouter();
  const { user, loading } = useCurrentUser();
  const [lastResult, setLastResult] = useState<ScanResult | null>(null);

  useEffect(() => {
    if (!loading && user && !user.canViewInventory) {
      router.replace("/");
    }
  }, [loading, router, user]);

  if (loading || !user || !user.canViewInventory) {
    return null;
  }

  const handleScanSuccess = (barcode: string, itemId: string, action: string) => {
    setLastResult({ barcode, itemId, action });
  };

  const actionLabel = (action: string) => {
    if (action === "add") return "Added to inventory";
    if (action === "use") return "Used from inventory";
    if (action === "created") return "Created new item";
    return "Updated";
  };

  return (
    <main className="mx-auto w-full max-w-[1280px] px-4 sm:px-6 lg:px-8 py-8 form-screen">
      <section className="page-frame p-4 sm:p-6 mb-4">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <span className="eyebrow">Fast Workflow</span>
            <h1 className="text-3xl sm:text-4xl font-bold mt-3">Scan Inventory</h1>
            <p className="text-slate-300 mt-2 text-sm sm:text-base max-w-xl">
              Scan a barcode to add stock, use stock, or create a new item without leaving this screen.
            </p>
          </div>
          <Link
            href="/items"
            className="soft-button rounded-xl px-4 py-2 text-sm font-semibold"
          >
            Open Item Catalog
          </Link>
        </div>
      </section>

      {lastResult && (
        <section className="mb-4 rounded-xl border border-white/10 bg-slate-900/70 p-3 sm:p-4">
          <p className="text-sm font-semibold text-slate-200">{actionLabel(lastResult.action)}</p>
          <p className="text-xs text-slate-400 mt-1 font-mono">{lastResult.barcode}</p>
        </section>
      )}

      <ScanView
        onScan={(barcode, itemId, action) => {
          handleScanSuccess(barcode, itemId, action);
        }}
        onCancel={() => router.push("/")}
      />
    </main>
  );
}
