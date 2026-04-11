import { redirect } from "next/navigation";
import { LocationsPageClient } from "@/components/locations/locations-page-client";
import { prisma } from "@/lib/db";
import { getDefaultHomePath, requirePageAccess } from "@/lib/permissions";

export default async function LocationsPage() {
  const access = await requirePageAccess("canViewInventory");

  if (!access.canMoveInventory && !access.canManageLocations) {
    redirect(getDefaultHomePath(access));
  }

  const locations = await prisma.location.findMany({
    where: {
      archived: false,
      organizationId: access.organizationId,
    },
    orderBy: { name: "asc" },
    include: {
      stock: {
        include: {
          item: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      },
    },
  });

  return (
    <LocationsPageClient
      initialLocations={locations.map((location) => ({
        ...location,
        description: location.description ?? null,
      }))}
    />
  );
}