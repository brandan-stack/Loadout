ALTER TABLE "Supplier"
  ADD COLUMN "emailContacts" JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN "isPreferred" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "isFastest" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "Job"
  ADD COLUMN "billingTotal" DOUBLE PRECISION;

CREATE INDEX "Supplier_organizationId_isPreferred_idx" ON "Supplier"("organizationId", "isPreferred");
CREATE INDEX "Supplier_organizationId_isFastest_idx" ON "Supplier"("organizationId", "isFastest");