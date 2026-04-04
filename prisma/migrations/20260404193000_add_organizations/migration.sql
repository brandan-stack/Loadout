-- CreateTable
CREATE TABLE "Organization" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "contactEmail" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Organization_pkey" PRIMARY KEY ("id")
);

-- Add organization columns
ALTER TABLE "Supplier" ADD COLUMN "organizationId" TEXT;
ALTER TABLE "Item" ADD COLUMN "organizationId" TEXT;
ALTER TABLE "AppUser" ADD COLUMN "organizationId" TEXT;
ALTER TABLE "Job" ADD COLUMN "organizationId" TEXT;
ALTER TABLE "Tool" ADD COLUMN "organizationId" TEXT;
ALTER TABLE "ReportView" ADD COLUMN "organizationId" TEXT;
ALTER TABLE "ShareLog" ADD COLUMN "organizationId" TEXT;
ALTER TABLE "ItemVariant" ADD COLUMN "organizationId" TEXT;
ALTER TABLE "Location" ADD COLUMN "organizationId" TEXT;
ALTER TABLE "LocationTransfer" ADD COLUMN "organizationId" TEXT;
ALTER TABLE "ScheduledReport" ADD COLUMN "organizationId" TEXT;
ALTER TABLE "Settings" ADD COLUMN "organizationId" TEXT;

-- Create a bootstrap organization to preserve pre-tenant data
INSERT INTO "Organization" ("id", "name", "contactEmail", "createdAt", "updatedAt")
VALUES ('org_legacy_bootstrap', 'Legacy Workspace', 'legacy@loadout.local', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- Assign existing rows into the bootstrap organization
UPDATE "Supplier" SET "organizationId" = 'org_legacy_bootstrap' WHERE "organizationId" IS NULL;
UPDATE "Item" SET "organizationId" = 'org_legacy_bootstrap' WHERE "organizationId" IS NULL;
UPDATE "AppUser" SET "organizationId" = 'org_legacy_bootstrap' WHERE "organizationId" IS NULL;
UPDATE "Job" SET "organizationId" = 'org_legacy_bootstrap' WHERE "organizationId" IS NULL;
UPDATE "Tool" SET "organizationId" = 'org_legacy_bootstrap' WHERE "organizationId" IS NULL;
UPDATE "ReportView" SET "organizationId" = 'org_legacy_bootstrap' WHERE "organizationId" IS NULL;
UPDATE "ShareLog" SET "organizationId" = 'org_legacy_bootstrap' WHERE "organizationId" IS NULL;
UPDATE "ItemVariant" SET "organizationId" = 'org_legacy_bootstrap' WHERE "organizationId" IS NULL;
UPDATE "Location" SET "organizationId" = 'org_legacy_bootstrap' WHERE "organizationId" IS NULL;
UPDATE "LocationTransfer" SET "organizationId" = 'org_legacy_bootstrap' WHERE "organizationId" IS NULL;
UPDATE "ScheduledReport" SET "organizationId" = 'org_legacy_bootstrap' WHERE "organizationId" IS NULL;
UPDATE "Settings" SET "organizationId" = 'org_legacy_bootstrap' WHERE "organizationId" IS NULL;

-- Enforce required organization ownership
ALTER TABLE "Supplier" ALTER COLUMN "organizationId" SET NOT NULL;
ALTER TABLE "Item" ALTER COLUMN "organizationId" SET NOT NULL;
ALTER TABLE "AppUser" ALTER COLUMN "organizationId" SET NOT NULL;
ALTER TABLE "Job" ALTER COLUMN "organizationId" SET NOT NULL;
ALTER TABLE "Tool" ALTER COLUMN "organizationId" SET NOT NULL;
ALTER TABLE "ReportView" ALTER COLUMN "organizationId" SET NOT NULL;
ALTER TABLE "ShareLog" ALTER COLUMN "organizationId" SET NOT NULL;
ALTER TABLE "ItemVariant" ALTER COLUMN "organizationId" SET NOT NULL;
ALTER TABLE "Location" ALTER COLUMN "organizationId" SET NOT NULL;
ALTER TABLE "LocationTransfer" ALTER COLUMN "organizationId" SET NOT NULL;
ALTER TABLE "ScheduledReport" ALTER COLUMN "organizationId" SET NOT NULL;
ALTER TABLE "Settings" ALTER COLUMN "organizationId" SET NOT NULL;

-- Replace global uniqueness with per-organization uniqueness
DROP INDEX IF EXISTS "Supplier_name_key";
DROP INDEX IF EXISTS "Item_barcode_key";
DROP INDEX IF EXISTS "Item_barcode_idx";
DROP INDEX IF EXISTS "Item_lowStockRedThreshold_idx";
DROP INDEX IF EXISTS "Job_jobNumber_key";
DROP INDEX IF EXISTS "Job_jobNumber_idx";
DROP INDEX IF EXISTS "ItemVariant_sku_key";
DROP INDEX IF EXISTS "Location_name_key";

CREATE UNIQUE INDEX "Supplier_organizationId_name_key" ON "Supplier"("organizationId", "name");
CREATE INDEX "Supplier_organizationId_idx" ON "Supplier"("organizationId");

CREATE UNIQUE INDEX "Item_organizationId_barcode_key" ON "Item"("organizationId", "barcode");
CREATE INDEX "Item_organizationId_idx" ON "Item"("organizationId");
CREATE INDEX "Item_organizationId_barcode_idx" ON "Item"("organizationId", "barcode");
CREATE INDEX "Item_organizationId_lowStockRedThreshold_idx" ON "Item"("organizationId", "lowStockRedThreshold");

CREATE INDEX "AppUser_organizationId_idx" ON "AppUser"("organizationId");

CREATE UNIQUE INDEX "Job_organizationId_jobNumber_key" ON "Job"("organizationId", "jobNumber");
CREATE INDEX "Job_organizationId_idx" ON "Job"("organizationId");
CREATE INDEX "Job_organizationId_jobNumber_idx" ON "Job"("organizationId", "jobNumber");

CREATE INDEX "Tool_organizationId_idx" ON "Tool"("organizationId");
CREATE INDEX "ReportView_organizationId_idx" ON "ReportView"("organizationId");
CREATE INDEX "ShareLog_organizationId_idx" ON "ShareLog"("organizationId");

CREATE UNIQUE INDEX "ItemVariant_organizationId_sku_key" ON "ItemVariant"("organizationId", "sku");
CREATE INDEX "ItemVariant_organizationId_idx" ON "ItemVariant"("organizationId");

CREATE UNIQUE INDEX "Location_organizationId_name_key" ON "Location"("organizationId", "name");
CREATE INDEX "Location_organizationId_idx" ON "Location"("organizationId");

CREATE INDEX "LocationTransfer_organizationId_idx" ON "LocationTransfer"("organizationId");
CREATE INDEX "ScheduledReport_organizationId_idx" ON "ScheduledReport"("organizationId");
CREATE UNIQUE INDEX "Settings_organizationId_key" ON "Settings"("organizationId");

-- Add organization foreign keys
ALTER TABLE "Supplier" ADD CONSTRAINT "Supplier_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Item" ADD CONSTRAINT "Item_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AppUser" ADD CONSTRAINT "AppUser_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Job" ADD CONSTRAINT "Job_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Tool" ADD CONSTRAINT "Tool_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ReportView" ADD CONSTRAINT "ReportView_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ShareLog" ADD CONSTRAINT "ShareLog_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ItemVariant" ADD CONSTRAINT "ItemVariant_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Location" ADD CONSTRAINT "Location_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LocationTransfer" ADD CONSTRAINT "LocationTransfer_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ScheduledReport" ADD CONSTRAINT "ScheduledReport_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Settings" ADD CONSTRAINT "Settings_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;