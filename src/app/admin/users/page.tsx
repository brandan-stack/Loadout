import { UsersPageClient } from "@/components/admin/users-page-client";
import { prisma } from "@/lib/db";
import { requirePageAccess, USER_ACCESS_SELECT } from "@/lib/permissions";

export default async function UsersPage() {
  const access = await requirePageAccess("canManageUsers");
  const dbAny = prisma as any;

  const users = await dbAny.appUser.findMany({
    where: { organizationId: access.organizationId },
    select: USER_ACCESS_SELECT,
    orderBy: { name: "asc" },
  });

  return (
    <UsersPageClient
      currentUserId={access.userId}
      organizationName={access.organizationName}
      initialUsers={users.map((user: any) => ({ ...user, email: user.email ?? "" }))}
    />
  );
}