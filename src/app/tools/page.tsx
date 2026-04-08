import { redirect } from "next/navigation";
import { ToolsPageClient } from "@/components/tools/tools-page-client";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";

export default async function ToolsPage() {
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  const where =
    session.role === "TECH"
      ? {
          organizationId: session.organizationId,
          OR: [{ type: "SHOP" }, { type: "PERSONAL", ownerId: session.userId }],
        }
      : { organizationId: session.organizationId };

  const tools = await prisma.tool.findMany({
    where,
    orderBy: [{ type: "asc" }, { name: "asc" }],
    select: {
      id: true,
      name: true,
      manufacturer: true,
      partNumber: true,
      modelNumber: true,
      supplier: true,
      cost: true,
      photoUrl: true,
      notes: true,
      type: true,
      createdAt: true,
      owner: { select: { id: true, name: true } },
      checkouts: {
        where: { returnedAt: null },
        take: 1,
        select: {
          id: true,
          checkedOutAt: true,
          user: { select: { id: true, name: true } },
        },
      },
    },
  });

  return (
    <ToolsPageClient
      currentUserId={session.userId}
      currentUserRole={session.role}
      initialTools={tools.map((tool) => ({
        ...tool,
        cost: session.role === "TECH" ? 0 : tool.cost,
        manufacturer: tool.manufacturer ?? undefined,
        partNumber: tool.partNumber ?? undefined,
        modelNumber: tool.modelNumber ?? undefined,
        supplier: tool.supplier ?? undefined,
        photoUrl: tool.photoUrl ?? undefined,
        notes: tool.notes ?? undefined,
        owner: tool.owner ?? undefined,
        type: tool.type as "SHOP" | "PERSONAL",
        checkouts: tool.checkouts.map((checkout) => ({
          ...checkout,
          checkedOutAt: checkout.checkedOutAt.toISOString(),
        })),
        createdAt: tool.createdAt.toISOString(),
      }))}
    />
  );
}