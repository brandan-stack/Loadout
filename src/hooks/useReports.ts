// src/hooks/useReports.ts - Report generation hooks

import { useState, useCallback } from "react";
import { LowStockItem, ReportFilters } from "@/lib/reports/types";

export function useLowStockReport() {
  const [data, setData] = useState<LowStockItem[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>("");

  const generateReport = useCallback(async (filters: ReportFilters) => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/reports/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "low_stock",
          ...filters,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(
          errorData.error?.message || "Failed to generate report"
        );
      }

      const result = await res.json();
      setData(result.data);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unknown error occurred"
      );
    } finally {
      setLoading(false);
    }
  }, []);

  return { data, loading, error, generateReport };
}

export function useUsageReport() {
  const [data, setData] = useState<any[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>("");

  const generateReport = useCallback(async (filters: ReportFilters) => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/reports/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "usage_period",
          ...filters,
        }),
      });

      if (!res.ok) {
        throw new Error("Failed to generate report");
      }

      const result = await res.json();
      setData(result.data);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unknown error occurred"
      );
    } finally {
      setLoading(false);
    }
  }, []);

  return { data, loading, error, generateReport };
}

export function useDeadStockReport() {
  const [data, setData] = useState<any[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>("");

  const generateReport = useCallback(async (filters: ReportFilters) => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/reports/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "dead_stock",
          ...filters,
        }),
      });

      if (!res.ok) {
        throw new Error("Failed to generate report");
      }

      const result = await res.json();
      setData(result.data);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unknown error occurred"
      );
    } finally {
      setLoading(false);
    }
  }, []);

  return { data, loading, error, generateReport };
}

export function useFastMoversReport() {
  const [data, setData] = useState<any[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>("");

  const generateReport = useCallback(async (filters: ReportFilters) => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/reports/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "fast_movers",
          ...filters,
        }),
      });

      if (!res.ok) {
        throw new Error("Failed to generate report");
      }

      const result = await res.json();
      setData(result.data);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unknown error occurred"
      );
    } finally {
      setLoading(false);
    }
  }, []);

  return { data, loading, error, generateReport };
}
