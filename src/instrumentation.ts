// src/instrumentation.ts
// Runs once when the Next.js server starts.
// Ensures the database schema is created/migrated before any API request is served.
// - For SQLite (local dev): creates tables directly via raw DDL (idempotent).
// - For PostgreSQL (production): verifies connectivity; relies on `prisma migrate deploy`
//   in the build step to create tables. Applies PostgreSQL DDL as a runtime safety net
//   in case the build-time migration did not run (e.g. DATABASE_URL was unavailable
//   during the Vercel build).

export async function register() {
  if (process.env.NEXT_RUNTIME === "edge") return;

  try {
    // Ensure DATABASE_URL is set and points to a writable path before
    // lib/db.ts is first imported (it uses this env var as a fallback).
    const dbUrl = process.env.DATABASE_URL ?? "";
    const isPostgres =
      dbUrl.startsWith("postgresql://") || dbUrl.startsWith("postgres://");

    if (!isPostgres) {
      // SQLite local dev: set a writable path in /tmp
      if (!process.env.DATABASE_URL) {
        process.env.DATABASE_URL = "file:/tmp/dev.db";
      } else if (process.env.DATABASE_URL.startsWith("file:./")) {
        const filename = process.env.DATABASE_URL.replace("file:./", "");
        process.env.DATABASE_URL = `file:/tmp/${filename}`;
      }
    }

    const { prisma } = await import("@/lib/db");

    if (isPostgres) {
      await initPostgres(prisma);
      return;
    }

    await initSqlite(prisma);
  } catch (err) {
    console.error("[instrumentation] Database initialization failed:", err);
  }
}

// ---------------------------------------------------------------------------
// PostgreSQL initialization (runtime safety net)
// ---------------------------------------------------------------------------
// The primary mechanism for creating the schema is `prisma migrate deploy`
// in the build script. This function serves as a runtime safety net: if the
// build-time migration did not run (e.g. DATABASE_URL was not available during
// the Vercel build), it creates the tables directly via idempotent PostgreSQL DDL.
async function initPostgres(prisma: import("@prisma/client").PrismaClient) {
  // Verify basic connectivity first.
  try {
    await prisma.$queryRaw`SELECT 1`;
  } catch (connErr) {
    console.error(
      "[instrumentation] PostgreSQL connection failed. Ensure DATABASE_URL is correct.",
      connErr
    );
    return;
  }

  // Apply all tables idempotently. CREATE TABLE IF NOT EXISTS is safe to
  // repeat and handles the case where prisma migrate deploy was skipped.
  const pgStatements = [
    `CREATE TABLE IF NOT EXISTS "Supplier" (
      "id" TEXT NOT NULL,
      "name" TEXT NOT NULL,
      "contact" TEXT,
      "website" TEXT,
      "leadTimeD" INTEGER NOT NULL DEFAULT 7,
      "notes" TEXT,
      "archived" BOOLEAN NOT NULL DEFAULT false,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "Supplier_pkey" PRIMARY KEY ("id")
    )`,
    `CREATE UNIQUE INDEX IF NOT EXISTS "Supplier_name_key" ON "Supplier"("name")`,
    `CREATE TABLE IF NOT EXISTS "Item" (
      "id" TEXT NOT NULL,
      "name" TEXT NOT NULL,
      "manufacturer" TEXT,
      "partNumber" TEXT,
      "modelNumber" TEXT,
      "serialNumber" TEXT,
      "barcode" TEXT,
      "description" TEXT,
      "quantityOnHand" INTEGER NOT NULL DEFAULT 0,
      "quantityUsedTotal" INTEGER NOT NULL DEFAULT 0,
      "lowStockAmberThreshold" INTEGER NOT NULL DEFAULT 5,
      "lowStockRedThreshold" INTEGER NOT NULL DEFAULT 2,
      "preferredSupplierId" TEXT,
      "lastUnitCost" DOUBLE PRECISION,
      "unitOfMeasure" TEXT NOT NULL DEFAULT 'each',
      "enableLotTracking" BOOLEAN NOT NULL DEFAULT false,
      "enableExpiryTracking" BOOLEAN NOT NULL DEFAULT false,
      "photoUrl" TEXT,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "Item_pkey" PRIMARY KEY ("id")
    )`,
    `CREATE UNIQUE INDEX IF NOT EXISTS "Item_barcode_key" ON "Item"("barcode")`,
    `CREATE INDEX IF NOT EXISTS "Item_barcode_idx" ON "Item"("barcode")`,
    `CREATE INDEX IF NOT EXISTS "Item_lowStockRedThreshold_idx" ON "Item"("lowStockRedThreshold")`,
    `CREATE TABLE IF NOT EXISTS "ItemPhoto" (
      "id" TEXT NOT NULL,
      "itemId" TEXT NOT NULL,
      "fileName" TEXT NOT NULL,
      "filePath" TEXT NOT NULL,
      "isPrimary" BOOLEAN NOT NULL DEFAULT false,
      "notes" TEXT,
      "size" INTEGER NOT NULL DEFAULT 0,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "ItemPhoto_pkey" PRIMARY KEY ("id")
    )`,
    `CREATE INDEX IF NOT EXISTS "ItemPhoto_itemId_idx" ON "ItemPhoto"("itemId")`,
    `CREATE TABLE IF NOT EXISTS "InventoryTransaction" (
      "id" TEXT NOT NULL,
      "itemId" TEXT NOT NULL,
      "type" TEXT NOT NULL,
      "quantity" INTEGER NOT NULL,
      "lotNumber" TEXT,
      "expiryDate" TIMESTAMP(3),
      "notes" TEXT,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "InventoryTransaction_pkey" PRIMARY KEY ("id")
    )`,
    `CREATE INDEX IF NOT EXISTS "InventoryTransaction_itemId_idx" ON "InventoryTransaction"("itemId")`,
    `CREATE INDEX IF NOT EXISTS "InventoryTransaction_createdAt_idx" ON "InventoryTransaction"("createdAt")`,
    `CREATE INDEX IF NOT EXISTS "InventoryTransaction_type_idx" ON "InventoryTransaction"("type")`,
    `CREATE TABLE IF NOT EXISTS "AppUser" (
      "id" TEXT NOT NULL,
      "name" TEXT NOT NULL,
      "email" TEXT NOT NULL DEFAULT '',
      "role" TEXT NOT NULL DEFAULT 'TECH',
      "passwordHash" TEXT NOT NULL DEFAULT '',
      "resetToken" TEXT,
      "resetTokenExpiry" TIMESTAMP(3),
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "AppUser_pkey" PRIMARY KEY ("id")
    )`,
    `CREATE UNIQUE INDEX IF NOT EXISTS "AppUser_email_key" ON "AppUser"("email")`,
    `CREATE TABLE IF NOT EXISTS "Job" (
      "id" TEXT NOT NULL,
      "jobNumber" TEXT NOT NULL,
      "customer" TEXT NOT NULL,
      "technicianId" TEXT NOT NULL,
      "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "status" TEXT NOT NULL DEFAULT 'OPEN',
      "notes" TEXT,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "Job_pkey" PRIMARY KEY ("id")
    )`,
    `CREATE UNIQUE INDEX IF NOT EXISTS "Job_jobNumber_key" ON "Job"("jobNumber")`,
    `CREATE INDEX IF NOT EXISTS "Job_technicianId_idx" ON "Job"("technicianId")`,
    `CREATE INDEX IF NOT EXISTS "Job_status_idx" ON "Job"("status")`,
    `CREATE INDEX IF NOT EXISTS "Job_jobNumber_idx" ON "Job"("jobNumber")`,
    `CREATE TABLE IF NOT EXISTS "JobPart" (
      "id" TEXT NOT NULL,
      "jobId" TEXT NOT NULL,
      "itemId" TEXT NOT NULL,
      "quantity" INTEGER NOT NULL,
      "unitCost" DOUBLE PRECISION NOT NULL DEFAULT 0,
      "notes" TEXT,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "JobPart_pkey" PRIMARY KEY ("id")
    )`,
    `CREATE INDEX IF NOT EXISTS "JobPart_jobId_idx" ON "JobPart"("jobId")`,
    `CREATE INDEX IF NOT EXISTS "JobPart_itemId_idx" ON "JobPart"("itemId")`,
    `CREATE TABLE IF NOT EXISTS "Tool" (
      "id" TEXT NOT NULL,
      "name" TEXT NOT NULL,
      "manufacturer" TEXT,
      "partNumber" TEXT,
      "modelNumber" TEXT,
      "supplier" TEXT,
      "cost" DOUBLE PRECISION NOT NULL DEFAULT 0,
      "notes" TEXT,
      "photoUrl" TEXT,
      "type" TEXT NOT NULL DEFAULT 'SHOP',
      "ownerId" TEXT,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "Tool_pkey" PRIMARY KEY ("id")
    )`,
    `CREATE INDEX IF NOT EXISTS "Tool_name_idx" ON "Tool"("name")`,
    `CREATE INDEX IF NOT EXISTS "Tool_supplier_idx" ON "Tool"("supplier")`,
    `CREATE INDEX IF NOT EXISTS "Tool_ownerId_idx" ON "Tool"("ownerId")`,
    `CREATE TABLE IF NOT EXISTS "ToolCheckout" (
      "id" TEXT NOT NULL,
      "toolId" TEXT NOT NULL,
      "userId" TEXT NOT NULL,
      "checkedOutAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "returnedAt" TIMESTAMP(3),
      "notes" TEXT,
      CONSTRAINT "ToolCheckout_pkey" PRIMARY KEY ("id")
    )`,
    `CREATE INDEX IF NOT EXISTS "ToolCheckout_toolId_idx" ON "ToolCheckout"("toolId")`,
    `CREATE INDEX IF NOT EXISTS "ToolCheckout_userId_idx" ON "ToolCheckout"("userId")`,
    `CREATE TABLE IF NOT EXISTS "ReportView" (
      "id" TEXT NOT NULL,
      "name" TEXT NOT NULL,
      "type" TEXT NOT NULL,
      "filters" TEXT NOT NULL DEFAULT '{}',
      "sortBy" TEXT NOT NULL DEFAULT 'name',
      "archived" BOOLEAN NOT NULL DEFAULT false,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "ReportView_pkey" PRIMARY KEY ("id")
    )`,
    `CREATE TABLE IF NOT EXISTS "ShareLog" (
      "id" TEXT NOT NULL,
      "type" TEXT NOT NULL,
      "reportType" TEXT,
      "emailClient" TEXT,
      "filters" TEXT NOT NULL DEFAULT '{}',
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "ShareLog_pkey" PRIMARY KEY ("id")
    )`,
    `CREATE TABLE IF NOT EXISTS "ItemVariant" (
      "id" TEXT NOT NULL,
      "itemId" TEXT NOT NULL,
      "name" TEXT NOT NULL,
      "sku" TEXT,
      "quantityOnHand" INTEGER NOT NULL DEFAULT 0,
      "attributes" TEXT NOT NULL DEFAULT '{}',
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "ItemVariant_pkey" PRIMARY KEY ("id")
    )`,
    `CREATE UNIQUE INDEX IF NOT EXISTS "ItemVariant_sku_key" ON "ItemVariant"("sku")`,
    `CREATE INDEX IF NOT EXISTS "ItemVariant_itemId_idx" ON "ItemVariant"("itemId")`,
    `CREATE TABLE IF NOT EXISTS "Location" (
      "id" TEXT NOT NULL,
      "name" TEXT NOT NULL,
      "description" TEXT,
      "archived" BOOLEAN NOT NULL DEFAULT false,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "Location_pkey" PRIMARY KEY ("id")
    )`,
    `CREATE UNIQUE INDEX IF NOT EXISTS "Location_name_key" ON "Location"("name")`,
    `CREATE TABLE IF NOT EXISTS "LocationStock" (
      "id" TEXT NOT NULL,
      "locationId" TEXT NOT NULL,
      "itemId" TEXT NOT NULL,
      "quantityOnHand" INTEGER NOT NULL DEFAULT 0,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "LocationStock_pkey" PRIMARY KEY ("id")
    )`,
    `CREATE UNIQUE INDEX IF NOT EXISTS "LocationStock_locationId_itemId_key" ON "LocationStock"("locationId", "itemId")`,
    `CREATE INDEX IF NOT EXISTS "LocationStock_locationId_idx" ON "LocationStock"("locationId")`,
    `CREATE INDEX IF NOT EXISTS "LocationStock_itemId_idx" ON "LocationStock"("itemId")`,
    `CREATE TABLE IF NOT EXISTS "LocationTransfer" (
      "id" TEXT NOT NULL,
      "fromLocationId" TEXT NOT NULL,
      "toLocationId" TEXT NOT NULL,
      "itemId" TEXT NOT NULL,
      "quantity" INTEGER NOT NULL,
      "notes" TEXT,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "LocationTransfer_pkey" PRIMARY KEY ("id")
    )`,
    `CREATE INDEX IF NOT EXISTS "LocationTransfer_itemId_idx" ON "LocationTransfer"("itemId")`,
    `CREATE INDEX IF NOT EXISTS "LocationTransfer_fromLocationId_idx" ON "LocationTransfer"("fromLocationId")`,
    `CREATE INDEX IF NOT EXISTS "LocationTransfer_toLocationId_idx" ON "LocationTransfer"("toLocationId")`,
    `CREATE TABLE IF NOT EXISTS "ScheduledReport" (
      "id" TEXT NOT NULL,
      "name" TEXT NOT NULL,
      "reportType" TEXT NOT NULL,
      "frequency" TEXT NOT NULL,
      "filters" TEXT NOT NULL DEFAULT '{}',
      "lastRun" TIMESTAMP(3),
      "nextRun" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "archived" BOOLEAN NOT NULL DEFAULT false,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "ScheduledReport_pkey" PRIMARY KEY ("id")
    )`,
    `CREATE TABLE IF NOT EXISTS "Settings" (
      "id" TEXT NOT NULL,
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
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "Settings_pkey" PRIMARY KEY ("id")
    )`,
  ];

  for (const sql of pgStatements) {
    try {
      await prisma.$executeRawUnsafe(sql);
    } catch {
      // Index/table already exists — safe to ignore
    }
  }

  // Migration: add missing columns to AppUser if the old schema (pinHash) was
  // applied by a previous deployment. Safe to retry; failures mean the column
  // already exists or is not applicable.
  const appUserMigrations = [
    `ALTER TABLE "AppUser" ADD COLUMN IF NOT EXISTS "email" TEXT NOT NULL DEFAULT ''`,
    `ALTER TABLE "AppUser" ADD COLUMN IF NOT EXISTS "passwordHash" TEXT NOT NULL DEFAULT ''`,
    `ALTER TABLE "AppUser" ADD COLUMN IF NOT EXISTS "resetToken" TEXT`,
    `ALTER TABLE "AppUser" ADD COLUMN IF NOT EXISTS "resetTokenExpiry" TIMESTAMP(3)`,
    `CREATE UNIQUE INDEX IF NOT EXISTS "AppUser_email_key" ON "AppUser"("email")`,
  ];

  for (const sql of appUserMigrations) {
    try {
      await prisma.$executeRawUnsafe(sql);
    } catch {
      // Column or index already exists — safe to ignore
    }
  }

  console.log("[instrumentation] PostgreSQL schema verified/initialized.");
}

// ---------------------------------------------------------------------------
// SQLite initialization (local dev)
// ---------------------------------------------------------------------------
async function initSqlite(prisma: import("@prisma/client").PrismaClient) {
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
      "name" TEXT NOT NULL,
      "email" TEXT NOT NULL UNIQUE,
      "role" TEXT NOT NULL DEFAULT 'TECH',
      "passwordHash" TEXT NOT NULL,
      "resetToken" TEXT,
      "resetTokenExpiry" DATETIME,
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
    // Migrations: add new columns to existing tables (safe to re-run, errors ignored).
    // These ALTER TABLE statements ensure older SQLite databases (created before
    // these columns were added) are upgraded to the current schema automatically.
    `ALTER TABLE "Supplier" ADD COLUMN "website" TEXT`,
    `ALTER TABLE "Item" ADD COLUMN "photoUrl" TEXT`,
    `ALTER TABLE "Location" ADD COLUMN "archived" BOOLEAN NOT NULL DEFAULT false`,
    `ALTER TABLE "Location" ADD COLUMN "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP`,
    // Migrate AppUser from pinHash/name-unique to email/passwordHash
    `ALTER TABLE "AppUser" ADD COLUMN "email" TEXT NOT NULL DEFAULT ''`,
    `ALTER TABLE "AppUser" ADD COLUMN "passwordHash" TEXT NOT NULL DEFAULT ''`,
    // Add password reset fields
    `ALTER TABLE "AppUser" ADD COLUMN "resetToken" TEXT`,
    `ALTER TABLE "AppUser" ADD COLUMN "resetTokenExpiry" DATETIME`,
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

  console.log("[instrumentation] SQLite schema initialized successfully.");
}
