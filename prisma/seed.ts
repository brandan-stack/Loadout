import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Starting database seed...");

  // Clear existing data
  await prisma.organization.deleteMany({});

  console.log("🏢 Creating seeded organization...");
  const organization = await prisma.organization.create({
    data: {
      name: "Seeded Workspace",
      contactEmail: "owner@example.com",
    },
  });

  console.log("📦 Creating suppliers...");
  const suppliers = await prisma.supplier.createMany({
    data: [
      {
        organizationId: organization.id,
        name: "Tech Supplier Inc",
        contact: "contact@techsupplier.com",
        leadTimeD: 5,
        notes: "Fast shipping",
      },
      {
        organizationId: organization.id,
        name: "Industrial Parts Co",
        contact: "sales@indparts.com",
        leadTimeD: 10,
        notes: "Bulk discounts available",
      },
      {
        organizationId: organization.id,
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
      organizationId: organization.id,
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

  // Fetch the created supplier IDs so we can assign them to items
  const supplierRecords = await prisma.supplier.findMany({
    where: { organizationId: organization.id },
    select: { id: true },
  });

  const items = [];

  // Create 100 seed items
  for (let i = 1; i <= 100; i++) {
    items.push({
      organizationId: organization.id,
      name: `Item ${i}`,
      barcode: `SKU-${String(i).padStart(6, "0")}`,
      description: `Test item number ${i}`,
      quantityOnHand: Math.floor(Math.random() * 100),
      quantityUsedTotal: Math.floor(Math.random() * 50),
      lowStockAmberThreshold: 10,
      lowStockRedThreshold: 3,
      preferredSupplierId:
        supplierRecords.length > 0
          ? supplierRecords[i % supplierRecords.length].id
          : undefined,
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
