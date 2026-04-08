import { redirect } from "next/navigation";
import { SuppliersPageClient } from "@/components/suppliers/suppliers-page-client";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";

export default async function SuppliersPage() {
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  const suppliers = await prisma.supplier.findMany({
    where: {
      archived: false,
      organizationId: session.organizationId,
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
  });

  return (
    <SuppliersPageClient
      initialSuppliers={suppliers.map((supplier) => ({
        ...supplier,
        contact: supplier.contact ?? undefined,
        website: supplier.website ?? undefined,
        notes: supplier.notes ?? undefined,
      }))}
    />
  );
}