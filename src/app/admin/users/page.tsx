import { redirect } from "next/navigation";
import { UsersPageClient } from "@/components/admin/users-page-client";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";

export default async function UsersPage() {
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  if (session.role !== "SUPER_ADMIN") {
    redirect("/");
  }

  const users = await prisma.appUser.findMany({
    where: { organizationId: session.organizationId },
    select: { id: true, name: true, email: true, role: true },
    orderBy: { name: "asc" },
  });

  return (
    <UsersPageClient
      currentUserId={session.userId}
      organizationName={session.organizationName}
      initialUsers={users.map((user) => ({
        ...user,
        email: user.email ?? "",
      }))}
    />
  );
}