-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Item" (
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
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Item_preferredSupplierId_fkey" FOREIGN KEY ("preferredSupplierId") REFERENCES "Supplier" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Item" ("barcode", "createdAt", "description", "enableExpiryTracking", "enableLotTracking", "id", "lastUnitCost", "lowStockAmberThreshold", "lowStockRedThreshold", "name", "preferredSupplierId", "quantityOnHand", "quantityUsedTotal", "unitOfMeasure", "updatedAt") SELECT "barcode", "createdAt", "description", "enableExpiryTracking", "enableLotTracking", "id", "lastUnitCost", "lowStockAmberThreshold", "lowStockRedThreshold", "name", "preferredSupplierId", "quantityOnHand", "quantityUsedTotal", "unitOfMeasure", "updatedAt" FROM "Item";
DROP TABLE "Item";
ALTER TABLE "new_Item" RENAME TO "Item";
CREATE UNIQUE INDEX "Item_barcode_key" ON "Item"("barcode");
CREATE INDEX "Item_barcode_idx" ON "Item"("barcode");
CREATE INDEX "Item_lowStockRedThreshold_idx" ON "Item"("lowStockRedThreshold");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
