-- AlterTable: add website to Supplier
ALTER TABLE "Supplier" ADD COLUMN "website" TEXT;

-- AlterTable: add photoUrl to Item
ALTER TABLE "Item" ADD COLUMN "photoUrl" TEXT;
