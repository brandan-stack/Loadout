-- AlterTable: make existing NOT NULL columns nullable and add photoUrl
ALTER TABLE "Tool" ADD COLUMN "photoUrl" TEXT;

-- SQLite: to change nullable, we need to recreate the table
-- Drop old + recreate with nullable columns
PRAGMA foreign_keys=OFF;

CREATE TABLE "_Tool_new" (
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
    "updatedAt" DATETIME NOT NULL
);

INSERT INTO "_Tool_new"
SELECT "id","name","manufacturer","partNumber","modelNumber","supplier","cost","notes",NULL,"createdAt","updatedAt"
FROM "Tool";

DROP TABLE "Tool";
ALTER TABLE "_Tool_new" RENAME TO "Tool";

CREATE INDEX "Tool_name_idx" ON "Tool"("name");
CREATE INDEX "Tool_supplier_idx" ON "Tool"("supplier");

PRAGMA foreign_keys=ON;
