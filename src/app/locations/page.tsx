import { redirect } from "next/navigation";
import { LocationsPageClient } from "@/components/locations/locations-page-client";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";

export default async function LocationsPage() {
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  const locations = await prisma.location.findMany({
    where: {
      archived: false,
      organizationId: session.organizationId,
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