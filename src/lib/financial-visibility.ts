export const FINANCIAL_VISIBILITY_VALUES = [
  "none",
  "total_only",
  "base_only",
  "base_margin_total",
  "full",
] as const;

export type FinancialVisibilityMode = (typeof FINANCIAL_VISIBILITY_VALUES)[number];
export type FinancialField = "total" | "base" | "margin" | "supplier" | "job_costing";

export function canViewFinancialValue(
  financialVisibilityMode: FinancialVisibilityMode,
  field: FinancialField
) {
  switch (financialVisibilityMode) {
    case "none":
      return false;
    case "total_only":
      return field === "total";
    case "base_only":
      return field === "base";
    case "base_margin_total":
      return field === "base" || field === "margin" || field === "total";
    case "full":
      return true;
    default:
      return false;
  }
}