"use client";

import { useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import { isAuthPath } from "@/components/navigation/navigation-config";

type ConnectionInfo = {
  effectiveType?: string;
  saveData?: boolean;
};

export function TabDataWarmup() {
  const pathname = usePathname();
  const router = useRouter();
  const warmedRef = useRef(false);

  useEffect(() => {
    if (warmedRef.current || isAuthPath(pathname)) {
      return;
    }

    const connection = (navigator as Navigator & { connection?: ConnectionInfo }).connection;
    if (
      connection?.saveData ||
      connection?.effectiveType === "slow-2g" ||
      connection?.effectiveType === "2g"
    ) {
      return;
    }

    warmedRef.current = true;

    const warm = () => {
      ["/jobs", "/items", "/reports", "/suppliers", "/reorder", "/settings", "/scan"].forEach((href) => {
        router.prefetch(href);
      });
    };

    if (typeof window.requestIdleCallback === "function") {
      const handle = window.requestIdleCallback(() => warm(), { timeout: 1200 });
      return () => {
        if (typeof window.cancelIdleCallback === "function") {
          window.cancelIdleCallback(handle);
        }
      };
    }

    const timeoutId = window.setTimeout(warm, 900);
    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [pathname, router]);

  return null;
}