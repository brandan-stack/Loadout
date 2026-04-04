"use client";

import { useState, useEffect } from "react";
import type { UserRole } from "@/lib/auth";

export interface CurrentUser {
  userId: string;
  name: string;
  role: UserRole;
  organizationId: string;
  organizationName: string;
}

let cached: CurrentUser | null = null;
let fetchPromise: Promise<CurrentUser | null> | null = null;

async function fetchCurrentUser(): Promise<CurrentUser | null> {
  try {
    const res = await fetch("/api/auth/me");
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

export function useCurrentUser(enabled = true) {
  const [user, setUser] = useState<CurrentUser | null>(cached);
  const [loading, setLoading] = useState(enabled && cached === null);

  useEffect(() => {
    if (!enabled) {
      setLoading(false);
      return;
    }

    if (cached !== null) {
      setUser(cached);
      setLoading(false);
      return;
    }
    if (!fetchPromise) {
      fetchPromise = fetchCurrentUser();
    }
    fetchPromise.then((u) => {
      cached = u;
      setUser(u);
      setLoading(false);
    });
  }, [enabled]);

  return { user, loading };
}

export function clearUserCache() {
  cached = null;
  fetchPromise = null;
}
