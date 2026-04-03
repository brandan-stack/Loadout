"use client";

import { useState, useEffect } from "react";

export function PersistenceWarning() {
  const [warning, setWarning] = useState<string | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    fetch("/api/health")
      .then((r) => r.json())
      .then((data) => {
        if (data.dbWarning) setWarning(data.dbWarning);
      })
      .catch(() => {/* ignore */});
  }, []);

  if (!warning || dismissed) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-amber-900/90 border-b border-amber-700 px-4 py-2 flex items-start gap-3 text-xs text-amber-100">
      <span className="text-base shrink-0">⚠️</span>
      <p className="flex-1 leading-relaxed">{warning}</p>
      <button
        onClick={() => setDismissed(true)}
        className="shrink-0 text-amber-300 hover:text-white ml-2"
        aria-label="Dismiss"
      >
        ✕
      </button>
    </div>
  );
}
