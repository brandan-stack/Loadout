// src/lib/reorder/types.ts - Reorder recommendation types

export interface ReorderRecommendation {
  itemId: string;
  name: string;
  barcode?: string | null;
  currentQuantity: number;
  suggestedQuantity: number;
  suggestedOrderQuantity: number;
  minQuantity: number;
  maxQuantity: number;
  usagePerDay: number;
  leadTimeDays: number;
  estimatedArrivalDate: Date;
  priority: 'urgent' | 'high' | 'medium' | 'low';
  preferredSupplier?: {
    id: string;
    name: string;
    leadTimeD: number;
  };
  reason: string;
}

export interface ReorderThresholds {
  minQuantity: number;
  maxQuantity: number;
}
