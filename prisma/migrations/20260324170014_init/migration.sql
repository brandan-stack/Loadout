-- CreateTable
CREATE TABLE "Item" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "barcode" TEXT,
    "description" TEXT,
    "quantityOnHand" INTEGER NOT NULL DEFAULT 0,
    "quantityUsedTotal" INTEGER NOT NULL DEFAULT 0,
    "lowStockAmberThreshold" INTEGER NOT NULL DEFAULT 5,
    "lowStockRedThreshold" INTEGER NOT NULL DEFAULT 2,
    "preferredSupplierId" TEXT,
    "lastUnitCost" REAL,
    "unitOfMeasure" TEXT NOT NULL DEFAULT 'each',
    "enableLotTracking" BOOLEAN NOT NULL DEFAULT false,
    "enableExpiryTracking" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "ItemPhoto" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "itemId" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "filePath" TEXT NOT NULL,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "size" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ItemPhoto_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Item" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "InventoryTransaction" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "itemId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "lotNumber" TEXT,
    "expiryDate" DATETIME,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "InventoryTransaction_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Item" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Supplier" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "contact" TEXT,
    "leadTimeD" INTEGER NOT NULL DEFAULT 7,
    "notes" TEXT,
    "archived" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "ReportView" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "filters" TEXT NOT NULL DEFAULT '{}',
    "sortBy" TEXT NOT NULL DEFAULT 'name',
    "archived" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "ShareLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "type" TEXT NOT NULL,
    "reportType" TEXT,
    "emailClient" TEXT,
    "filters" TEXT NOT NULL DEFAULT '{}',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Settings" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "premiumEnabled" BOOLEAN NOT NULL DEFAULT false,
    "simpleMode" BOOLEAN NOT NULL DEFAULT true,
    "enableMultiLocation" BOOLEAN NOT NULL DEFAULT false,
    "enableVariants" BOOLEAN NOT NULL DEFAULT false,
    "enableImportWizard" BOOLEAN NOT NULL DEFAULT false,
    "enableLotExpiry" BOOLEAN NOT NULL DEFAULT false,
    "enableBackupZip" BOOLEAN NOT NULL DEFAULT false,
    "enableReportScheduler" BOOLEAN NOT NULL DEFAULT false,
    "enableAITagging" BOOLEAN NOT NULL DEFAULT false,
    "preferredEmailClient" TEXT NOT NULL DEFAULT 'default',
    "composeSubjectTemplate" TEXT NOT NULL DEFAULT 'Inventory Report - {date}',
    "defaultLowStockAmber" INTEGER NOT NULL DEFAULT 5,
    "defaultLowStockRed" INTEGER NOT NULL DEFAULT 2,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "Item_barcode_key" ON "Item"("barcode");

-- CreateIndex
CREATE INDEX "Item_barcode_idx" ON "Item"("barcode");

-- CreateIndex
CREATE INDEX "Item_lowStockRedThreshold_idx" ON "Item"("lowStockRedThreshold");

-- CreateIndex
CREATE INDEX "ItemPhoto_itemId_idx" ON "ItemPhoto"("itemId");

-- CreateIndex
CREATE INDEX "InventoryTransaction_itemId_idx" ON "InventoryTransaction"("itemId");

-- CreateIndex
CREATE INDEX "InventoryTransaction_createdAt_idx" ON "InventoryTransaction"("createdAt");

-- CreateIndex
CREATE INDEX "InventoryTransaction_type_idx" ON "InventoryTransaction"("type");

-- CreateIndex
CREATE UNIQUE INDEX "Supplier_name_key" ON "Supplier"("name");
