// src/hooks/useBarcode.ts - Hook for barcode operations

import { useState, useCallback } from "react";

interface LookupResult {
  found: boolean;
  item?: {
    id: string;
    name: string;
    barcode: string;
    quantityOnHand: number;
  };
  message?: string;
}

interface BarcodeResult {
  success: boolean;
  error?: string;
  data?: any;
}

export function useBarcode() {
  const [loading, setLoading] = useState(false);

  const lookup = useCallback(
    async (barcode: string): Promise<LookupResult | null> => {
      setLoading(true);
      try {
        const res = await fetch(
          `/api/barcodes/lookup?barcode=${encodeURIComponent(barcode)}`
        );
        if (!res.ok) return null;
        return await res.json();
      } catch (error) {
        console.error("Barcode lookup error:", error);
        return null;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const createFromUnknown = useCallback(
    async (
      barcode: string,
      itemName: string,
      quantityOnHand = 1
    ): Promise<BarcodeResult> => {
      setLoading(true);
      try {
        const res = await fetch("/api/barcodes/unknown", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            barcode,
            itemName,
            quantityOnHand,
          }),
        });

        if (!res.ok) {
          const errorData = await res.json();
          return {
            success: false,
            error:
              errorData.error ||
              `Failed to create item (${res.status})`,
          };
        }

        const data = await res.json();
        return { success: true, data };
      } catch (error) {
        return {
          success: false,
          error: `Error: ${
            error instanceof Error ? error.message : "Unknown error"
          }`,
        };
      } finally {
        setLoading(false);
      }
    },
    []
  );

  return { lookup, createFromUnknown, loading };
}
