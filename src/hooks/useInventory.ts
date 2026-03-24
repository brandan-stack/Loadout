// src/hooks/useInventory.ts - Hook for inventory operations

import { useState, useCallback } from "react";

interface InventoryResult {
  success: boolean;
  error?: string;
  data?: any;
}

export function useInventory() {
  const [loading, setLoading] = useState(false);

  const addInventory = useCallback(
    async (
      itemId: string,
      quantity: number,
      options?: {
        supplierCost?: number;
        notes?: string;
        lotNumber?: string;
      }
    ): Promise<InventoryResult> => {
      setLoading(true);
      try {
        const res = await fetch(`/api/items/${itemId}/add`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            quantity,
            ...options,
          }),
        });

        if (!res.ok) {
          const errorData = await res.json();
          return {
            success: false,
            error:
              errorData.error ||
              `Failed to add inventory (${res.status})`,
          };
        }

        const data = await res.json();
        return { success: true, data };
      } catch (error) {
        return {
          success: false,
          error: `Error adding inventory: ${
            error instanceof Error ? error.message : "Unknown error"
          }`,
        };
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const useInventory = useCallback(
    async (
      itemId: string,
      quantity: number,
      options?: {
        notes?: string;
        lotNumber?: string;
      }
    ): Promise<InventoryResult> => {
      setLoading(true);
      try {
        const res = await fetch(`/api/items/${itemId}/use`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            quantity,
            ...options,
          }),
        });

        if (!res.ok) {
          const errorData = await res.json();
          return {
            success: false,
            error:
              errorData.error ||
              `Failed to use inventory (${res.status})`,
          };
        }

        const data = await res.json();
        return { success: true, data };
      } catch (error) {
        return {
          success: false,
          error: `Error using inventory: ${
            error instanceof Error ? error.message : "Unknown error"
          }`,
        };
      } finally {
        setLoading(false);
      }
    },
    []
  );

  return { addInventory, useInventory, loading };
}
