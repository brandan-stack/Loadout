import { SuppliersPageClient } from "@/components/suppliers/suppliers-page-client";
import { prisma } from "@/lib/db";
import { requirePageAccess } from "@/lib/permissions";
import { getPrimarySupplierEmail, normalizeSupplierEmailContacts } from "@/lib/supplier-contacts";

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
        emailContacts: true,
        website: true,
        leadTimeD: true,
        isPreferred: true,
        isFastest: true,
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

  return (
    <SuppliersPageClient
      initialSuppliers={suppliers.map((supplier) => {
        const emailContacts = normalizeSupplierEmailContacts(supplier.emailContacts);

        return {
          ...supplier,
          contact: getPrimarySupplierEmail(emailContacts, supplier.contact) ?? undefined,
          emailContacts,
          website: supplier.website ?? undefined,
          notes: supplier.notes ?? undefined,
          linkedItemCount: linkedCountsBySupplier.get(supplier.id) ?? 0,
          preferred: supplier.isPreferred,
          fastest: supplier.isFastest,
          rating: Math.max(
            2,
            Math.min(
              5,
              3 +
                (emailContacts.length > 0 || supplier.contact || supplier.website ? 1 : 0) +
                (supplier.leadTimeD <= 3 ? 1 : supplier.leadTimeD >= 10 ? -1 : 0)
            )
          ),
        };
      })}
    />
  );
}