ALTER TABLE "AppUser"
  ADD COLUMN "rolePreset" TEXT NOT NULL DEFAULT 'STANDARD',
  ADD COLUMN "financialVisibilityMode" TEXT NOT NULL DEFAULT 'total_only',
  ADD COLUMN "canViewDashboard" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "canViewJobs" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "canViewInventory" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "canViewTools" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "canViewReports" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "canViewSuppliers" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "canViewReorder" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "canViewSettings" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "canAddInventory" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "canEditInventory" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "canMoveInventory" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "canRemoveInventory" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "canUseInventoryOnJob" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "canReturnInventoryFromJob" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "canManageLocations" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "canManageCategories" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "canCreateJobs" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "canEditJobs" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "canCloseJobs" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "canInvoiceJobs" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "canViewJobSummaries" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "canViewOwnTools" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "canAddOwnTools" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "canEditOwnTools" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "canViewCompanyTools" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "canRequestCompanyTools" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "canCheckoutCompanyTools" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "canReturnCompanyTools" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "canAcceptToolReturns" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "canManageCompanyTools" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "canManageUsers" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "canManageSettings" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "canExportData" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "canBackupRestore" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "canClearCache" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "canEnableModules" BOOLEAN NOT NULL DEFAULT false;

UPDATE "AppUser"
SET
  "rolePreset" = CASE
    WHEN "role" = 'SUPER_ADMIN' THEN 'ADMIN'
    WHEN "role" = 'OFFICE' THEN 'MANAGER'
    WHEN "role" = 'TECH' THEN 'STANDARD'
    ELSE 'LIMITED'
  END,
  "financialVisibilityMode" = CASE
    WHEN "role" = 'SUPER_ADMIN' THEN 'full'
    WHEN "role" = 'OFFICE' THEN 'base_margin_total'
    WHEN "role" = 'TECH' THEN 'total_only'
    ELSE 'none'
  END,
  "canViewDashboard" = true,
  "canViewJobs" = true,
  "canViewInventory" = true,
  "canViewTools" = true,
  "canViewReports" = CASE WHEN "role" IN ('SUPER_ADMIN', 'OFFICE') THEN true ELSE false END,
  "canViewSuppliers" = CASE WHEN "role" IN ('SUPER_ADMIN', 'OFFICE') THEN true ELSE false END,
  "canViewReorder" = CASE WHEN "role" IN ('SUPER_ADMIN', 'OFFICE') THEN true ELSE false END,
  "canViewSettings" = CASE WHEN "role" IN ('SUPER_ADMIN', 'OFFICE') THEN true ELSE false END,
  "canAddInventory" = CASE WHEN "role" IN ('SUPER_ADMIN', 'OFFICE') THEN true ELSE false END,
  "canEditInventory" = CASE WHEN "role" IN ('SUPER_ADMIN', 'OFFICE') THEN true ELSE false END,
  "canMoveInventory" = true,
  "canRemoveInventory" = CASE WHEN "role" IN ('SUPER_ADMIN', 'OFFICE') THEN true ELSE false END,
  "canUseInventoryOnJob" = true,
  "canReturnInventoryFromJob" = true,
  "canManageLocations" = CASE WHEN "role" IN ('SUPER_ADMIN', 'OFFICE') THEN true ELSE false END,
  "canManageCategories" = CASE WHEN "role" IN ('SUPER_ADMIN', 'OFFICE') THEN true ELSE false END,
  "canCreateJobs" = CASE WHEN "role" <> 'OFFICE' THEN true ELSE false END,
  "canEditJobs" = true,
  "canCloseJobs" = CASE WHEN "role" IN ('SUPER_ADMIN', 'OFFICE') THEN true ELSE false END,
  "canInvoiceJobs" = CASE WHEN "role" IN ('SUPER_ADMIN', 'OFFICE') THEN true ELSE false END,
  "canViewJobSummaries" = true,
  "canViewOwnTools" = true,
  "canAddOwnTools" = true,
  "canEditOwnTools" = true,
  "canViewCompanyTools" = true,
  "canRequestCompanyTools" = true,
  "canCheckoutCompanyTools" = CASE WHEN "role" IN ('SUPER_ADMIN', 'OFFICE') THEN true ELSE false END,
  "canReturnCompanyTools" = true,
  "canAcceptToolReturns" = CASE WHEN "role" IN ('SUPER_ADMIN', 'OFFICE') THEN true ELSE false END,
  "canManageCompanyTools" = CASE WHEN "role" IN ('SUPER_ADMIN', 'OFFICE') THEN true ELSE false END,
  "canManageUsers" = CASE WHEN "role" = 'SUPER_ADMIN' THEN true ELSE false END,
  "canManageSettings" = CASE WHEN "role" = 'SUPER_ADMIN' THEN true ELSE false END,
  "canExportData" = CASE WHEN "role" IN ('SUPER_ADMIN', 'OFFICE') THEN true ELSE false END,
  "canBackupRestore" = CASE WHEN "role" = 'SUPER_ADMIN' THEN true ELSE false END,
  "canClearCache" = CASE WHEN "role" IN ('SUPER_ADMIN', 'OFFICE') THEN true ELSE false END,
  "canEnableModules" = CASE WHEN "role" = 'SUPER_ADMIN' THEN true ELSE false END;

CREATE INDEX "AppUser_organizationId_rolePreset_idx" ON "AppUser"("organizationId", "rolePreset");

ALTER TABLE "Item"
  ADD COLUMN "category" TEXT,
  ADD COLUMN "defaultLocationId" TEXT,
  ADD COLUMN "lastMovementAt" TIMESTAMP(3),
  ADD COLUMN "lastMovementType" TEXT;

UPDATE "Item"
SET
  "lastMovementAt" = "updatedAt",
  "lastMovementType" = 'seeded';

ALTER TABLE "Item"
  ADD CONSTRAINT "Item_defaultLocationId_fkey"
  FOREIGN KEY ("defaultLocationId") REFERENCES "Location"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "Item_defaultLocationId_idx" ON "Item"("defaultLocationId");
CREATE INDEX "Item_organizationId_category_idx" ON "Item"("organizationId", "category");
CREATE INDEX "Item_organizationId_lastMovementAt_idx" ON "Item"("organizationId", "lastMovementAt");

ALTER TABLE "InventoryTransaction"
  ADD COLUMN "organizationId" TEXT,
  ADD COLUMN "actorUserId" TEXT,
  ADD COLUMN "fromLocationId" TEXT,
  ADD COLUMN "toLocationId" TEXT,
  ADD COLUMN "jobId" TEXT,
  ADD COLUMN "quantityDelta" INTEGER,
  ADD COLUMN "balanceAfter" INTEGER,
  ADD COLUMN "jobNumberSnapshot" TEXT,
  ADD COLUMN "jobDescriptionSnapshot" TEXT,
  ADD COLUMN "costSnapshot" DOUBLE PRECISION,
  ADD COLUMN "clientRequestId" TEXT,
  ADD COLUMN "submittedOfflineAt" TIMESTAMP(3),
  ADD COLUMN "syncedAt" TIMESTAMP(3),
  ADD COLUMN "syncStatus" TEXT NOT NULL DEFAULT 'synced';

UPDATE "InventoryTransaction" tx
SET
  "organizationId" = item."organizationId",
  "quantityDelta" = CASE
    WHEN LOWER(tx."type") IN ('use', 'remove') THEN tx."quantity" * -1
    WHEN LOWER(tx."type") = 'return_from_job' THEN tx."quantity"
    ELSE tx."quantity"
  END,
  "costSnapshot" = item."lastUnitCost",
  "syncedAt" = tx."createdAt"
FROM "Item" item
WHERE item."id" = tx."itemId";

ALTER TABLE "InventoryTransaction"
  ALTER COLUMN "organizationId" SET NOT NULL;

ALTER TABLE "InventoryTransaction"
  ADD CONSTRAINT "InventoryTransaction_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "InventoryTransaction_actorUserId_fkey"
    FOREIGN KEY ("actorUserId") REFERENCES "AppUser"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT "InventoryTransaction_fromLocationId_fkey"
    FOREIGN KEY ("fromLocationId") REFERENCES "Location"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT "InventoryTransaction_toLocationId_fkey"
    FOREIGN KEY ("toLocationId") REFERENCES "Location"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT "InventoryTransaction_jobId_fkey"
    FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE UNIQUE INDEX "InventoryTransaction_clientRequestId_key" ON "InventoryTransaction"("clientRequestId");
CREATE INDEX "InventoryTransaction_organizationId_idx" ON "InventoryTransaction"("organizationId");
CREATE INDEX "InventoryTransaction_actorUserId_idx" ON "InventoryTransaction"("actorUserId");
CREATE INDEX "InventoryTransaction_jobId_idx" ON "InventoryTransaction"("jobId");
CREATE INDEX "InventoryTransaction_fromLocationId_idx" ON "InventoryTransaction"("fromLocationId");
CREATE INDEX "InventoryTransaction_toLocationId_idx" ON "InventoryTransaction"("toLocationId");
CREATE INDEX "InventoryTransaction_organizationId_createdAt_idx" ON "InventoryTransaction"("organizationId", "createdAt");

ALTER TABLE "Job"
  ADD COLUMN "description" TEXT,
  ADD COLUMN "latestActivityAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

UPDATE "Job"
SET "latestActivityAt" = COALESCE("updatedAt", "createdAt");

CREATE INDEX "Job_organizationId_latestActivityAt_idx" ON "Job"("organizationId", "latestActivityAt");

ALTER TABLE "JobPart"
  ADD COLUMN "inventoryTransactionId" TEXT,
  ADD COLUMN "performedByUserId" TEXT,
  ADD COLUMN "costSnapshot" DOUBLE PRECISION,
  ADD COLUMN "itemNameSnapshot" TEXT,
  ADD COLUMN "jobDescriptionSnapshot" TEXT,
  ADD COLUMN "returnedQuantity" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "lastActivityAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

UPDATE "JobPart" part
SET
  "costSnapshot" = COALESCE(part."unitCost", 0),
  "itemNameSnapshot" = item."name",
  "jobDescriptionSnapshot" = job."description",
  "lastActivityAt" = COALESCE(part."createdAt", CURRENT_TIMESTAMP)
FROM "Item" item, "Job" job
WHERE item."id" = part."itemId" AND job."id" = part."jobId";

ALTER TABLE "JobPart"
  ADD CONSTRAINT "JobPart_inventoryTransactionId_fkey"
    FOREIGN KEY ("inventoryTransactionId") REFERENCES "InventoryTransaction"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT "JobPart_performedByUserId_fkey"
    FOREIGN KEY ("performedByUserId") REFERENCES "AppUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "JobPart_inventoryTransactionId_idx" ON "JobPart"("inventoryTransactionId");
CREATE INDEX "JobPart_performedByUserId_idx" ON "JobPart"("performedByUserId");

ALTER TABLE "Tool"
  ADD COLUMN "assetTag" TEXT,
  ADD COLUMN "serialNumber" TEXT,
  ADD COLUMN "category" TEXT,
  ADD COLUMN "replacementValue" DOUBLE PRECISION,
  ADD COLUMN "condition" TEXT NOT NULL DEFAULT 'Good',
  ADD COLUMN "currentStatus" TEXT NOT NULL DEFAULT 'Available',
  ADD COLUMN "assignedUserId" TEXT,
  ADD COLUMN "defaultLocation" TEXT,
  ADD COLUMN "lastTransactionAt" TIMESTAMP(3),
  ADD COLUMN "archived" BOOLEAN NOT NULL DEFAULT false;

UPDATE "Tool"
SET
  "type" = CASE WHEN "type" = 'SHOP' THEN 'COMPANY' ELSE "type" END,
  "currentStatus" = CASE
    WHEN EXISTS (
      SELECT 1 FROM "ToolCheckout" checkout
      WHERE checkout."toolId" = "Tool"."id" AND checkout."returnedAt" IS NULL
    ) THEN 'Checked Out'
    ELSE 'Available'
  END,
  "lastTransactionAt" = "updatedAt";

ALTER TABLE "Tool"
  ADD CONSTRAINT "Tool_assignedUserId_fkey"
    FOREIGN KEY ("assignedUserId") REFERENCES "AppUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE UNIQUE INDEX "Tool_organizationId_assetTag_key" ON "Tool"("organizationId", "assetTag");
CREATE INDEX "Tool_assignedUserId_idx" ON "Tool"("assignedUserId");
CREATE INDEX "Tool_organizationId_type_idx" ON "Tool"("organizationId", "type");
CREATE INDEX "Tool_organizationId_currentStatus_idx" ON "Tool"("organizationId", "currentStatus");

CREATE TABLE "ToolTransaction" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "toolId" TEXT NOT NULL,
  "holderUserId" TEXT,
  "requestedByUserId" TEXT,
  "approvedByUserId" TEXT,
  "acceptedByUserId" TEXT,
  "status" TEXT NOT NULL DEFAULT 'Requested',
  "transactionType" TEXT NOT NULL DEFAULT 'request',
  "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "checkedOutAt" TIMESTAMP(3),
  "dueBackAt" TIMESTAMP(3),
  "returnRequestedAt" TIMESTAMP(3),
  "returnedAt" TIMESTAMP(3),
  "acceptedAt" TIMESTAMP(3),
  "notes" TEXT,
  "issueReported" TEXT,
  "clientRequestId" TEXT,
  "submittedOfflineAt" TIMESTAMP(3),
  "syncStatus" TEXT NOT NULL DEFAULT 'synced',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ToolTransaction_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "ToolTransaction"
  ADD CONSTRAINT "ToolTransaction_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "ToolTransaction_toolId_fkey"
    FOREIGN KEY ("toolId") REFERENCES "Tool"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "ToolTransaction_holderUserId_fkey"
    FOREIGN KEY ("holderUserId") REFERENCES "AppUser"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT "ToolTransaction_requestedByUserId_fkey"
    FOREIGN KEY ("requestedByUserId") REFERENCES "AppUser"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT "ToolTransaction_approvedByUserId_fkey"
    FOREIGN KEY ("approvedByUserId") REFERENCES "AppUser"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT "ToolTransaction_acceptedByUserId_fkey"
    FOREIGN KEY ("acceptedByUserId") REFERENCES "AppUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE UNIQUE INDEX "ToolTransaction_clientRequestId_key" ON "ToolTransaction"("clientRequestId");
CREATE INDEX "ToolTransaction_organizationId_idx" ON "ToolTransaction"("organizationId");
CREATE INDEX "ToolTransaction_toolId_idx" ON "ToolTransaction"("toolId");
CREATE INDEX "ToolTransaction_holderUserId_idx" ON "ToolTransaction"("holderUserId");
CREATE INDEX "ToolTransaction_requestedByUserId_idx" ON "ToolTransaction"("requestedByUserId");
CREATE INDEX "ToolTransaction_approvedByUserId_idx" ON "ToolTransaction"("approvedByUserId");
CREATE INDEX "ToolTransaction_acceptedByUserId_idx" ON "ToolTransaction"("acceptedByUserId");
CREATE INDEX "ToolTransaction_organizationId_status_idx" ON "ToolTransaction"("organizationId", "status");
CREATE INDEX "ToolTransaction_organizationId_requestedAt_idx" ON "ToolTransaction"("organizationId", "requestedAt");

INSERT INTO "ToolTransaction" (
  "id",
  "organizationId",
  "toolId",
  "holderUserId",
  "requestedByUserId",
  "status",
  "transactionType",
  "requestedAt",
  "checkedOutAt",
  "returnRequestedAt",
  "returnedAt",
  "syncStatus",
  "createdAt",
  "updatedAt"
)
SELECT
  CONCAT('legacy_tx_', checkout."id"),
  tool."organizationId",
  checkout."toolId",
  checkout."userId",
  checkout."userId",
  CASE WHEN checkout."returnedAt" IS NULL THEN 'Checked Out' ELSE 'Returned' END,
  'checkout',
  checkout."checkedOutAt",
  checkout."checkedOutAt",
  checkout."returnedAt",
  checkout."returnedAt",
  'synced',
  checkout."checkedOutAt",
  COALESCE(checkout."returnedAt", checkout."checkedOutAt")
FROM "ToolCheckout" checkout
JOIN "Tool" tool ON tool."id" = checkout."toolId";

ALTER TABLE "Settings"
  ADD COLUMN "enableToolsModule" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "requireToolReturnAcceptance" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "allowOfflineMode" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "allowOfflineQueue" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "allowOfflineCompanyToolFlows" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "offlineAutoSync" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "offlineCacheDays" INTEGER NOT NULL DEFAULT 30,
  ADD COLUMN "defaultFinancialVisibilityMode" TEXT NOT NULL DEFAULT 'total_only';