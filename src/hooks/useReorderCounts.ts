"use client";

import { useEffect, useState } from "react";
import type { ReorderRecommendationSummary } from "@/lib/reorder/types";

const CACHE_TTL_MS = 30_000;

let cachedCounts: ReorderRecommendationSummary | null = null;
let cachedAt = 0;
let pendingRequest: Promise<ReorderRecommendationSummary | null> | null = null;

async function loadCounts(force = false): Promise<ReorderRecommendationSummary | null> {
  const now = Date.now();

  if (!force && cachedCounts && now - cachedAt < CACHE_TTL_MS) {
    return cachedCounts;
  }

  if (!force && pendingRequest) {
    return pendingRequest;
  }

  pendingRequest = fetch("/api/reorder/recommendations?summary=1", {
    cache: "no-store",
  })
    .then((response) => (response.ok ? response.json() : null))
    .then((data) => {
      if (!data) {
        return cachedCounts;
      }

      const nextCounts = {
        urgent: data.urgent ?? 0,
        high: data.high ?? 0,
        total: data.total ?? 0,
      } satisfies ReorderRecommendationSummary;

      cachedCounts = nextCounts;
      cachedAt = Date.now();
      return nextCounts;
    })
    .catch(() => cachedCounts)
    .finally(() => {
      pendingRequest = null;
    });

  return pendingRequest;
}

export function useReorderCounts(enabled: boolean, refreshKey?: string) {
  const [counts, setCounts] = useState<ReorderRecommendationSummary | null>(
    enabled ? cachedCounts : null
  );

  useEffect(() => {
    if (!enabled) {
      setCounts(null);
      return;
    }

    let cancelled = false;

    loadCounts().then((nextCounts) => {
      if (!cancelled && nextCounts) {
        setCounts(nextCounts);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [enabled, refreshKey]);

  return counts;
}