// src/lib/reports/types.ts - Report type definitions

export interface ReportFilters {
  dateFrom?: Date;
  dateTo?: Date;
  supplierId?: string;
  lowStockOnly?: boolean;
  sortBy?: 'name' | 'quantity' | 'usage' | 'date';
  sortOrder?: 'asc' | 'desc';
}

export interface LowStockItem {
  id: string;
  name: string;
  barcode?: string | null;
  quantityOnHand: number;
  lowStockAmberThreshold: number;
  lowStockRedThreshold: number;
  severity: 'red' | 'amber';
  preferredSupplier?: {
    name: string;
    leadTimeD: number;
  } | null;
}

export interface UsageReport {
  itemId: string;
  name: string;
  barcode?: string | null;
  periodStart: Date;
  periodEnd: Date;
  quantityUsed: number;
  averageUsagePerDay: number;
  lastUsed?: Date;
  trend: 'increasing' | 'stable' | 'decreasing';
}

export interface DeadStockItem {
  id: string;
  name: string;
  barcode?: string | null;
  quantityOnHand: number;
  createdAt: Date;
  lastUsed?: Date;
  daysUnused: number;
}

export interface FastMover {
  id: string;
  name: string;
  barcode?: string | null;
  quantityOnHand: number;
  totalUsed: number;
  usagePerDay: number;
  reorderPriority: 'high' | 'medium' | 'low';
}

export interface Report {
  id?: string;
  type: 'low_stock' | 'usage_period' | 'dead_stock' | 'fast_movers';
  name?: string;
  filters: ReportFilters;
  generatedAt: Date;
  data: LowStockItem[] | UsageReport[] | DeadStockItem[] | FastMover[];
  itemCount: number;
}
