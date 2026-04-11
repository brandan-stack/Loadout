import { SuppliersPageClient } from "@/components/suppliers/suppliers-page-client";
import { prisma } from "@/lib/db";
import { requirePageAccess } from "@/lib/permissions";

export default async function SuppliersPage() {
  const access = await requirePageAccess("canViewSuppliers");

  const [suppliers, linkedCounts] = await Promise.all([
    prisma.supplier.findMany({
      where: {
        archived: false,
        organizationId: access.organizationId,
      },
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        contact: true,
        website: true,
        leadTimeD: true,
        notes: true,
        archived: true,
      },
    }),
    prisma.item.groupBy({
      by: ["preferredSupplierId"],
      where: {
        organizationId: access.organizationId,
        preferredSupplierId: { not: null },
      },
      _count: {
        preferredSupplierId: true,
      },
    }),
  ]);

  const linkedCountsBySupplier = new Map(
    linkedCounts
      .filter((entry) => entry.preferredSupplierId)
      .map((entry) => [entry.preferredSupplierId as string, entry._count.preferredSupplierId])
  );
  const fastestLeadTime = suppliers.reduce(
    (minLeadTime, supplier) => Math.min(minLeadTime, supplier.leadTimeD),
    Number.POSITIVE_INFINITY
  );

  return (
    <SuppliersPageClient
      initialSuppliers={suppliers.map((supplier) => ({
        ...supplier,
        contact: supplier.contact ?? undefined,
        website: supplier.website ?? undefined,
        notes: supplier.notes ?? undefined,
        linkedItemCount: linkedCountsBySupplier.get(supplier.id) ?? 0,
        preferred: (linkedCountsBySupplier.get(supplier.id) ?? 0) > 0,
        fastest: supplier.leadTimeD === fastestLeadTime,
        rating: Math.max(
          2,
          Math.min(
            5,
            3 +
              (supplier.contact || supplier.website ? 1 : 0) +
              (supplier.leadTimeD <= 3 ? 1 : supplier.leadTimeD >= 10 ? -1 : 0)
          )
        ),
      }))}
    />
  );
}