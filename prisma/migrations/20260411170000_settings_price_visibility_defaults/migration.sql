ALTER TABLE "Settings"
  ADD COLUMN "defaultCanViewBasePrice" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "defaultCanViewMarginPrice" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "defaultCanViewTotalPrice" BOOLEAN NOT NULL DEFAULT true;

UPDATE "Settings"
SET
  "defaultCanViewBasePrice" = CASE
    WHEN "defaultFinancialVisibilityMode" IN ('base_only', 'base_margin_total', 'full') THEN true
    ELSE false
  END,
  "defaultCanViewMarginPrice" = CASE
    WHEN "defaultFinancialVisibilityMode" IN ('base_margin_total', 'full') THEN true
    ELSE false
  END,
  "defaultCanViewTotalPrice" = CASE
    WHEN "defaultFinancialVisibilityMode" IN ('total_only', 'base_margin_total', 'full') THEN true
    ELSE false
  END;