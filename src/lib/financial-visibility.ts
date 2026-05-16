export const FINANCIAL_VISIBILITY_VALUES = [
  "none",
  "total_only",
  "base_only",
  "base_margin_total",
  "full",
] as const;

export type FinancialVisibilityMode = (typeof FINANCIAL_VISIBILITY_VALUES)[number];
export type FinancialField = "total" | "base" | "margin" | "supplier" | "job_costing";

export interface PriceVisibilitySnapshot {
  canViewBasePrice: boolean;
  canViewMarginPrice: boolean;
  canViewTotalPrice: boolean;
}

export function getPriceVisibilityFromMode(financialVisibilityMode: FinancialVisibilityMode): PriceVisibilitySnapshot {
  switch (financialVisibilityMode) {
    case "total_only":
      return {
        canViewBasePrice: false,
        canViewMarginPrice: false,
        canViewTotalPrice: true,
      };
    case "base_only":
      return {
        canViewBasePrice: true,
        canViewMarginPrice: false,
        canViewTotalPrice: false,
      };
    case "base_margin_total":
    case "full":
      return {
        canViewBasePrice: true,
        canViewMarginPrice: true,
        canViewTotalPrice: true,
      };
    case "none":
    default:
      return {
        canViewBasePrice: false,
        canViewMarginPrice: false,
        canViewTotalPrice: false,
      };
  }
}

export function canViewFinancialValue(
  financialVisibilityMode: FinancialVisibilityMode,
  field: FinancialField,
  priceVisibility?: Partial<PriceVisibilitySnapshot>
) {
  const resolvedPriceVisibility = {
    ...getPriceVisibilityFromMode(financialVisibilityMode),
    ...priceVisibility,
  };

  switch (financialVisibilityMode) {
    case "full":
      if (field === "supplier" || field === "job_costing") {
        return true;
      }
      break;
    default:
      if (field === "supplier" || field === "job_costing") {
        return false;
      }
      break;
  }

  if (field === "base") {
    return resolvedPriceVisibility.canViewBasePrice;
  }
  if (field === "margin") {
    return resolvedPriceVisibility.canViewMarginPrice;
  }
  if (field === "total") {
    return resolvedPriceVisibility.canViewTotalPrice;
  }

  return false;
}