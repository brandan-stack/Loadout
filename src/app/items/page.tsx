import { ItemCatalogClient } from "@/components/items/item-catalog-client";
import { prisma } from "@/lib/db";
import { requirePageAccess } from "@/lib/permissions";

function getInitialItemId(value: string | string[] | undefined) {
  const candidate = Array.isArray(value) ? value[0] : value;

  return typeof candidate === "string" && candidate.trim() ? candidate : undefined;
}

export default async function ItemsPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const access = await requirePageAccess("canViewInventory");
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const dbAny = prisma as any;

  const [items, suppliers, locations, jobs] = await Promise.all([
    dbAny.item.findMany({
      where: { organizationId: access.organizationId },
      orderBy: { lastMovementAt: "desc" },
      select: {
        id: true,
        name: true,
        manufacturer: true,
        partNumber: true,
        modelNumber: true,
        category: true,
        description: true,
        photoUrl: true,
        quantityOnHand: true,
        lowStockAmberThreshold: true,
        lowStockRedThreshold: true,
        preferredSupplier: { select: { id: true, name: true } },
        defaultLocation: { select: { id: true, name: true } },
        lastUnitCost: true,
        unitOfMeasure: true,
        lastMovementAt: true,
        lastMovementType: true,
        _count: { select: { jobParts: true } },
      },
    }),
    prisma.supplier.findMany({
      where: {
        archived: false,
        organizationId: access.organizationId,
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
        organizationId: access.organizationId,
      },
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        description: true,
      },
    }),
    access.canUseInventoryOnJob || access.canReturnInventoryFromJob
      ? dbAny.job.findMany({
          where: { organizationId: access.organizationId },
          orderBy: { latestActivityAt: "desc" },
          select: {
            id: true,
            jobNumber: true,
            description: true,
            customer: true,
            date: true,
            status: true,
          },
          take: 50,
        })
      : [],
  ]);

  return (
    <ItemCatalogClient
      financialVisibilityMode={access.financialVisibilityMode}
      permissions={{
        canAddInventory: access.canAddInventory,
        canEditInventory: access.canEditInventory,
        canMoveInventory: access.canMoveInventory,
        canRemoveInventory: access.canRemoveInventory,
        canUseInventoryOnJob: access.canUseInventoryOnJob,
        canReturnInventoryFromJob: access.canReturnInventoryFromJob,
      }}
      initialItems={items.map((item: any) => ({
        ...item,
        manufacturer: item.manufacturer ?? undefined,
        partNumber: item.partNumber ?? undefined,
        modelNumber: item.modelNumber ?? undefined,
        category: item.category ?? undefined,
        description: item.description ?? undefined,
        photoUrl: item.photoUrl ?? undefined,
        preferredSupplierName: item.preferredSupplier?.name ?? undefined,
        preferredSupplierId: item.preferredSupplier?.id ?? undefined,
        defaultLocationName: item.defaultLocation?.name ?? undefined,
        defaultLocationId: item.defaultLocation?.id ?? undefined,
        lastUnitCost: item.lastUnitCost ?? undefined,
        lastMovementAt: item.lastMovementAt?.toISOString(),
        lastMovementType: item.lastMovementType ?? undefined,
        linkedJobsCount: item._count.jobParts,
      }))}
      initialSuppliers={suppliers}
      initialLocations={locations.map((location) => ({
        id: location.id,
        name: location.name,
        description: location.description ?? undefined,
      }))}
      initialJobs={jobs.map((job: any) => ({
        ...job,
        description: job.description ?? undefined,
        date: job.date.toISOString(),
      }))}
      initialSelectedItemId={getInitialItemId(resolvedSearchParams?.item)}
    />
  );
}