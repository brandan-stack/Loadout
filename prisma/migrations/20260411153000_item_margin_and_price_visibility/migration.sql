ALTER TABLE "Item"
  ADD COLUMN "marginPercent" DOUBLE PRECISION NOT NULL DEFAULT 0;

ALTER TABLE "AppUser"
  ADD COLUMN "canViewBasePrice" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "canViewMarginPrice" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "canViewTotalPrice" BOOLEAN NOT NULL DEFAULT false;

UPDATE "AppUser"
SET
  "canViewBasePrice" = CASE
    WHEN "financialVisibilityMode" IN ('base_only', 'base_margin_total', 'full') THEN true
    ELSE false
  END,
  "canViewMarginPrice" = CASE
    WHEN "financialVisibilityMode" IN ('base_margin_total', 'full') THEN true
    ELSE false
  END,
  "canViewTotalPrice" = CASE
    WHEN "financialVisibilityMode" IN ('total_only', 'base_margin_total', 'full') THEN true
    ELSE false
  END;