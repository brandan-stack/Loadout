import { UsersPageClient } from "@/components/admin/users-page-client";
import { prisma } from "@/lib/db";
import { getSettings } from "@/lib/features/settings-service";
import { requirePageAccess, USER_ACCESS_SELECT } from "@/lib/permissions";

export default async function UsersPage() {
  const access = await requirePageAccess("canManageUsers");
  const dbAny = prisma as any;

  const [users, settings] = await Promise.all([
    dbAny.appUser.findMany({
      where: { organizationId: access.organizationId },
      select: USER_ACCESS_SELECT,
      orderBy: { name: "asc" },
    }),
    getSettings(access.organizationId),
  ]);

  return (
    <UsersPageClient
      currentUserId={access.userId}
      organizationName={access.organizationName}
      organizationDefaults={{
        financialVisibilityMode: settings.defaultFinancialVisibilityMode,
        canViewBasePrice: settings.defaultCanViewBasePrice,
        canViewMarginPrice: settings.defaultCanViewMarginPrice,
        canViewTotalPrice: settings.defaultCanViewTotalPrice,
      }}
      initialUsers={users.map((user: any) => ({ ...user, email: user.email ?? "" }))}
    />
  );
}