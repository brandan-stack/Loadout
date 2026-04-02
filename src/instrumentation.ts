// src/instrumentation.ts
// Runs once when the Next.js server starts.
// Ensures the SQLite database schema is created/migrated before any
// API request is served (critical for Vercel deployments where the DB
// file is not pre-populated and /tmp is the only writable location).

export async function register() {
  if (process.env.NEXT_RUNTIME === "edge") return;

  try {
    // Apply the same /tmp redirect as lib/db.ts so both point to the same file.
    if (process.env.DATABASE_URL?.startsWith("file:./")) {
      const filename = process.env.DATABASE_URL.replace("file:./", "");
      process.env.DATABASE_URL = `file:/tmp/${filename}`;
    }

    const { prisma } = await import("@/lib/db");

    // Quick check — if Supplier table is accessible, schema is already ready.
    try {
      await prisma.$queryRaw`SELECT 1 FROM "Supplier" LIMIT 1`;
      return;
    } catch {
      // Table doesn't exist yet — run DDL below.
    }

    // Apply all schema DDL idempotently. Safe to run on every cold start.
    const statements = [
      `CREATE TABLE IF NOT EXISTS "Supplier" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "name" TEXT NOT NULL UNIQUE,
        "contact" TEXT,
        "leadTimeD" INTEGER NOT NULL DEFAULT 7,
        "notes" TEXT,
        "archived" BOOLEAN NOT NULL DEFAULT false,
        "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
      )`,
      `CREATE TABLE IF NOT EXISTS "Item" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "name" TEXT NOT NULL,
        "manufacturer" TEXT,
        "partNumber" TEXT,
        "modelNumber" TEXT,
        "serialNumber" TEXT,
        "barcode" TEXT UNIQUE,
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
        "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY ("preferredSupplierId") REFERENCES "Supplier"("id") ON DELETE SET NULL
      )`,
      `CREATE INDEX IF NOT EXISTS "Item_barcode_idx" ON "Item"("barcode")`,
      `CREATE INDEX IF NOT EXISTS "Item_lowStockRedThreshold_idx" ON "Item"("lowStockRedThreshold")`,
      `CREATE TABLE IF NOT EXISTS "InventoryTransaction" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "itemId" TEXT NOT NULL,
        "type" TEXT NOT NULL,
        "quantity" INTEGER NOT NULL,
        "lotNumber" TEXT,
        "expiryDate" DATETIME,
        "notes" TEXT,
        "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY ("itemId") REFERENCES "Item"("id") ON DELETE CASCADE
      )`,
      `CREATE INDEX IF NOT EXISTS "InventoryTransaction_itemId_idx" ON "InventoryTransaction"("itemId")`,
      `CREATE INDEX IF NOT EXISTS "InventoryTransaction_createdAt_idx" ON "InventoryTransaction"("createdAt")`,
      `CREATE INDEX IF NOT EXISTS "InventoryTransaction_type_idx" ON "InventoryTransaction"("type")`,
      `CREATE TABLE IF NOT EXISTS "ItemPhoto" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "itemId" TEXT NOT NULL,
        "fileName" TEXT NOT NULL,
        "filePath" TEXT NOT NULL,
        "isPrimary" BOOLEAN NOT NULL DEFAULT false,
        "notes" TEXT,
        "size" INTEGER NOT NULL DEFAULT 0,
        "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY ("itemId") REFERENCES "Item"("id") ON DELETE CASCADE
      )`,
      `CREATE INDEX IF NOT EXISTS "ItemPhoto_itemId_idx" ON "ItemPhoto"("itemId")`,
      `CREATE TABLE IF NOT EXISTS "ItemVariant" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "itemId" TEXT NOT NULL,
        "name" TEXT NOT NULL,
        "sku" TEXT,
        "barcode" TEXT,
        "quantityOnHand" INTEGER NOT NULL DEFAULT 0,
        "attributes" TEXT NOT NULL DEFAULT '{}',
        "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY ("itemId") REFERENCES "Item"("id") ON DELETE CASCADE
      )`,
      `CREATE INDEX IF NOT EXISTS "ItemVariant_itemId_idx" ON "ItemVariant"("itemId")`,
      `CREATE TABLE IF NOT EXISTS "Location" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "name" TEXT NOT NULL UNIQUE,
        "description" TEXT,
        "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
      )`,
      `CREATE TABLE IF NOT EXISTS "LocationStock" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "itemId" TEXT NOT NULL,
        "locationId" TEXT NOT NULL,
        "quantity" INTEGER NOT NULL DEFAULT 0,
        "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY ("itemId") REFERENCES "Item"("id") ON DELETE CASCADE,
        FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE CASCADE
      )`,
      `CREATE UNIQUE INDEX IF NOT EXISTS "LocationStock_itemId_locationId_key" ON "LocationStock"("itemId","locationId")`,
      `CREATE TABLE IF NOT EXISTS "ReportSchedule" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "reportType" TEXT NOT NULL,
        "frequency" TEXT NOT NULL DEFAULT 'weekly',
        "recipients" TEXT NOT NULL DEFAULT '[]',
        "enabled" BOOLEAN NOT NULL DEFAULT true,
        "lastRunAt" DATETIME,
        "nextRunAt" DATETIME,
        "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
      )`,
      `CREATE TABLE IF NOT EXISTS "Tool" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "name" TEXT NOT NULL,
        "manufacturer" TEXT,
        "partNumber" TEXT,
        "modelNumber" TEXT,
        "supplier" TEXT,
        "cost" REAL NOT NULL DEFAULT 0,
        "notes" TEXT,
        "photoUrl" TEXT,
        "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
      )`,
      `CREATE INDEX IF NOT EXISTS "Tool_name_idx" ON "Tool"("name")`,
      `CREATE INDEX IF NOT EXISTS "Tool_supplier_idx" ON "Tool"("supplier")`,
      `CREATE TABLE IF NOT EXISTS "Settings" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "simpleMode" BOOLEAN NOT NULL DEFAULT false,
        "premiumEnabled" BOOLEAN NOT NULL DEFAULT false,
        "enableMultiLocation" BOOLEAN NOT NULL DEFAULT false,
        "enableVariants" BOOLEAN NOT NULL DEFAULT false,
        "enableImportWizard" BOOLEAN NOT NULL DEFAULT false,
        "enableLotExpiry" BOOLEAN NOT NULL DEFAULT false,
        "enableBackupZip" BOOLEAN NOT NULL DEFAULT false,
        "enableReportScheduler" BOOLEAN NOT NULL DEFAULT false,
        "enableAITagging" BOOLEAN NOT NULL DEFAULT false,
        "preferredEmailClient" TEXT NOT NULL DEFAULT 'default',
        "composeSubjectTemplate" TEXT NOT NULL DEFAULT 'Inventory Report: \${reportType} - \${date}',
        "defaultLowStockAmber" INTEGER NOT NULL DEFAULT 5,
        "defaultLowStockRed" INTEGER NOT NULL DEFAULT 2,
        "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
      )`,
    ];

    for (const sql of statements) {
      await prisma.$executeRawUnsafe(sql);
    }

    console.log("[instrumentation] Database schema initialized successfully.");
  } catch (err) {
    console.error("[instrumentation] Database initialization failed:", err);
  }
}
