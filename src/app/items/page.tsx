import { redirect } from "next/navigation";
import { ItemCatalogClient } from "@/components/items/item-catalog-client";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";

export default async function ItemsPage() {
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  const [items, suppliers, locations] = await Promise.all([
    prisma.item.findMany({
      where: { organizationId: session.organizationId },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        manufacturer: true,
        partNumber: true,
        modelNumber: true,
        serialNumber: true,
        barcode: true,
        description: true,
        photoUrl: true,
        quantityOnHand: true,
        quantityUsedTotal: true,
        lowStockAmberThreshold: true,
        lowStockRedThreshold: true,
        preferredSupplierId: true,
        lastUnitCost: true,
        unitOfMeasure: true,
        createdAt: true,
      },
    }),
    prisma.supplier.findMany({
      where: {
        archived: false,
        organizationId: session.organizationId,
      },
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        leadTimeD: true,
      },
    }),
    prisma.location.findMany({
      where: {
        archived: false,
        organizationId: session.organizationId,
      },
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        description: true,
      },
    }),
  ]);

  return (
    <ItemCatalogClient
      currentUserRole={session.role}
      initialItems={items.map((item) => ({
        ...item,
        manufacturer: item.manufacturer ?? undefined,
        partNumber: item.partNumber ?? undefined,
        modelNumber: item.modelNumber ?? undefined,
        serialNumber: item.serialNumber ?? undefined,
        barcode: item.barcode ?? undefined,
        description: item.description ?? undefined,
        photoUrl: item.photoUrl ?? undefined,
        preferredSupplierId: item.preferredSupplierId ?? undefined,
        lastUnitCost: item.lastUnitCost ?? undefined,
        createdAt: item.createdAt.toISOString(),
      }))}
      initialSuppliers={suppliers}
      initialLocations={locations.map((location) => ({
        id: location.id,
        name: location.name,
        description: location.description ?? undefined,
      }))}
    />
  );
}