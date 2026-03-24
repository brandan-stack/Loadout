import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Starting database seed...");

  // Clear existing data
  await prisma.item.deleteMany({});
  await prisma.supplier.deleteMany({});
  await prisma.settings.deleteMany({});

  console.log("📦 Creating suppliers...");
  const suppliers = await prisma.supplier.createMany({
    data: [
      {
        name: "Tech Supplier Inc",
        contact: "contact@techsupplier.com",
        leadTimeD: 5,
        notes: "Fast shipping",
      },
      {
        name: "Industrial Parts Co",
        contact: "sales@indparts.com",
        leadTimeD: 10,
        notes: "Bulk discounts available",
      },
      {
        name: "Local Hardware",
        contact: "orders@localhw.com",
        leadTimeD: 2,
        notes: "Next day available",
      },
    ],
  });

  console.log("🏪 Creating default settings...");
  await prisma.settings.create({
    data: {
      premiumEnabled: false,
      simpleMode: true,
      enableMultiLocation: false,
      enableVariants: false,
      enableImportWizard: false,
      enableLotExpiry: false,
      enableBackupZip: false,
      enableReportScheduler: false,
      enableAITagging: false,
      preferredEmailClient: "default",
      defaultLowStockAmber: 5,
      defaultLowStockRed: 2,
    },
  });

  console.log("📝 Creating seed items...");
  const items = [];

  // Create 100 seed items
  for (let i = 1; i <= 100; i++) {
    items.push({
      name: `Item ${i}`,
      barcode: `SKU-${String(i).padStart(6, "0")}`,
      description: `Test item number ${i}`,
      quantityOnHand: Math.floor(Math.random() * 100),
      quantityUsedTotal: Math.floor(Math.random() * 50),
      lowStockAmberThreshold: 10,
      lowStockRedThreshold: 3,
      preferredSupplierId: suppliers.count > 0 ? undefined : undefined,
      lastUnitCost: Math.random() * 1000,
      unitOfMeasure: ["each", "box", "pack"][Math.floor(Math.random() * 3)],
      enableLotTracking: false,
      enableExpiryTracking: false,
    });
  }

  await prisma.item.createMany({
    data: items,
  });

  console.log("✅ Seed complete!");
  console.log(`Created 100 items and ${suppliers.count} suppliers`);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
