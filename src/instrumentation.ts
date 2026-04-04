// src/instrumentation.ts
// Runs once when the Next.js server starts.
// Ensures the SQLite database schema is created/migrated before any
// API request is served (critical for Vercel deployments where the DB
// file is not pre-populated and /tmp is the only writable location).

export async function register() {
  if (process.env.NEXT_RUNTIME === "edge") return;

  try {
    // Ensure DATABASE_URL is set and points to a writable path before
    // lib/db.ts is first imported (it uses this env var as a fallback).
    if (!process.env.DATABASE_URL) {
      process.env.DATABASE_URL = "file:/tmp/dev.db";
    } else if (process.env.DATABASE_URL.startsWith("file:./")) {
      const filename = process.env.DATABASE_URL.replace("file:./", "");
      process.env.DATABASE_URL = `file:/tmp/${filename}`;
    }

    const { prisma } = await import("@/lib/db");

    // Run all DDL idempotently on every cold start.
    // CREATE TABLE IF NOT EXISTS is safe to repeat and ensures new tables
    // are created when the schema changes between deployments.
    const statements = [
      `CREATE TABLE IF NOT EXISTS "Supplier" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "name" TEXT NOT NULL UNIQUE,
        "contact" TEXT,
        "website" TEXT,
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
        "photoUrl" TEXT,
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
        "sku" TEXT UNIQUE,
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
        "archived" BOOLEAN NOT NULL DEFAULT false,
        "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
      )`,
      `CREATE TABLE IF NOT EXISTS "LocationStock" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "locationId" TEXT NOT NULL,
        "itemId" TEXT NOT NULL,
        "quantityOnHand" INTEGER NOT NULL DEFAULT 0,
        "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY ("itemId") REFERENCES "Item"("id") ON DELETE CASCADE,
        FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE CASCADE
      )`,
      `CREATE UNIQUE INDEX IF NOT EXISTS "LocationStock_locationId_itemId_key" ON "LocationStock"("locationId","itemId")`,
      `CREATE INDEX IF NOT EXISTS "LocationStock_locationId_idx" ON "LocationStock"("locationId")`,
      `CREATE INDEX IF NOT EXISTS "LocationStock_itemId_idx" ON "LocationStock"("itemId")`,
      `CREATE TABLE IF NOT EXISTS "LocationTransfer" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "fromLocationId" TEXT NOT NULL,
        "toLocationId" TEXT NOT NULL,
        "itemId" TEXT NOT NULL,
        "quantity" INTEGER NOT NULL,
        "notes" TEXT,
        "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
      )`,
      `CREATE INDEX IF NOT EXISTS "LocationTransfer_itemId_idx" ON "LocationTransfer"("itemId")`,
      `CREATE INDEX IF NOT EXISTS "LocationTransfer_fromLocationId_idx" ON "LocationTransfer"("fromLocationId")`,
      `CREATE INDEX IF NOT EXISTS "LocationTransfer_toLocationId_idx" ON "LocationTransfer"("toLocationId")`,
      `CREATE TABLE IF NOT EXISTS "ScheduledReport" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "name" TEXT NOT NULL,
        "reportType" TEXT NOT NULL,
        "frequency" TEXT NOT NULL,
        "filters" TEXT NOT NULL DEFAULT '{}',
        "lastRun" DATETIME,
        "nextRun" DATETIME NOT NULL,
        "archived" BOOLEAN NOT NULL DEFAULT false,
        "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
      )`,
      `CREATE TABLE IF NOT EXISTS "ReportView" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "name" TEXT NOT NULL,
        "type" TEXT NOT NULL,
        "filters" TEXT NOT NULL DEFAULT '{}',
        "sortBy" TEXT NOT NULL DEFAULT 'name',
        "archived" BOOLEAN NOT NULL DEFAULT false,
        "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
      )`,
      `CREATE TABLE IF NOT EXISTS "ShareLog" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "type" TEXT NOT NULL,
        "reportType" TEXT,
        "emailClient" TEXT,
        "filters" TEXT NOT NULL DEFAULT '{}',
        "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
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
        "type" TEXT NOT NULL DEFAULT 'SHOP',
        "ownerId" TEXT,
        "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
      )`,
      `CREATE INDEX IF NOT EXISTS "Tool_name_idx" ON "Tool"("name")`,
      `CREATE INDEX IF NOT EXISTS "Tool_supplier_idx" ON "Tool"("supplier")`,
      `CREATE INDEX IF NOT EXISTS "Tool_ownerId_idx" ON "Tool"("ownerId")`,
      `CREATE TABLE IF NOT EXISTS "AppUser" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "name" TEXT NOT NULL UNIQUE,
        "email" TEXT UNIQUE,
        "role" TEXT NOT NULL DEFAULT 'TECH',
        "passwordHash" TEXT,
        "pinHash" TEXT NOT NULL DEFAULT '',
        "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
      )`,
      `CREATE TABLE IF NOT EXISTS "Job" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "jobNumber" TEXT NOT NULL UNIQUE,
        "customer" TEXT NOT NULL,
        "technicianId" TEXT NOT NULL,
        "date" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "status" TEXT NOT NULL DEFAULT 'OPEN',
        "notes" TEXT,
        "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY ("technicianId") REFERENCES "AppUser"("id")
      )`,
      `CREATE INDEX IF NOT EXISTS "Job_technicianId_idx" ON "Job"("technicianId")`,
      `CREATE INDEX IF NOT EXISTS "Job_status_idx" ON "Job"("status")`,
      `CREATE INDEX IF NOT EXISTS "Job_jobNumber_idx" ON "Job"("jobNumber")`,
      `CREATE TABLE IF NOT EXISTS "JobPart" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "jobId" TEXT NOT NULL,
        "itemId" TEXT NOT NULL,
        "quantity" INTEGER NOT NULL,
        "unitCost" REAL NOT NULL DEFAULT 0,
        "notes" TEXT,
        "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE CASCADE,
        FOREIGN KEY ("itemId") REFERENCES "Item"("id")
      )`,
      `CREATE INDEX IF NOT EXISTS "JobPart_jobId_idx" ON "JobPart"("jobId")`,
      `CREATE INDEX IF NOT EXISTS "JobPart_itemId_idx" ON "JobPart"("itemId")`,
      `CREATE TABLE IF NOT EXISTS "ToolCheckout" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "toolId" TEXT NOT NULL,
        "userId" TEXT NOT NULL,
        "checkedOutAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "returnedAt" DATETIME,
        "notes" TEXT,
        FOREIGN KEY ("toolId") REFERENCES "Tool"("id") ON DELETE CASCADE,
        FOREIGN KEY ("userId") REFERENCES "AppUser"("id")
      )`,
      `CREATE INDEX IF NOT EXISTS "ToolCheckout_toolId_idx" ON "ToolCheckout"("toolId")`,
      `CREATE INDEX IF NOT EXISTS "ToolCheckout_userId_idx" ON "ToolCheckout"("userId")`,
      `CREATE TABLE IF NOT EXISTS "Settings" (
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
        "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
      )`,
      // Migrations: add new columns to existing tables (safe to re-run, errors ignored)
      // These ALTER TABLE statements ensure older SQLite databases (created before
      // these columns were added) are upgraded to the current schema automatically.
      `ALTER TABLE "Supplier" ADD COLUMN "website" TEXT`,
      `ALTER TABLE "Item" ADD COLUMN "photoUrl" TEXT`,
      `ALTER TABLE "Location" ADD COLUMN "archived" BOOLEAN NOT NULL DEFAULT false`,
      `ALTER TABLE "Location" ADD COLUMN "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP`,
      `ALTER TABLE "AppUser" ADD COLUMN "email" TEXT`,
      `ALTER TABLE "AppUser" ADD COLUMN "passwordHash" TEXT`,
      `CREATE UNIQUE INDEX IF NOT EXISTS "AppUser_email_key" ON "AppUser"("email")`,
    ];

    for (const sql of statements) {
      // ALTER TABLE statements may fail if column already exists or if the
      // SQLite version doesn't support IF NOT EXISTS in ALTER TABLE (< 3.37.0).
      // Wrap them so a migration failure never blocks table creation.
      if (sql.trimStart().toUpperCase().startsWith("ALTER TABLE")) {
        try {
          await prisma.$executeRawUnsafe(sql);
        } catch {
          // Column already exists or not supported — safe to ignore
        }
      } else {
        await prisma.$executeRawUnsafe(sql);
      }
    }

    console.log("[instrumentation] Database schema initialized successfully.");
  } catch (err) {
    console.error("[instrumentation] Database initialization failed:", err);
  }
}
