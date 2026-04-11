import { redirect } from "next/navigation";
import { SettingsPageClient } from "@/components/settings/settings-page-client";
import { prisma } from "@/lib/db";
import { getSettings } from "@/lib/features/settings-service";
import { requirePageAccess } from "@/lib/permissions";

export default async function SettingsPage() {
  const access = await requirePageAccess("canViewSettings");

  const [settings, organization] = await Promise.all([
    getSettings(access.organizationId),
    prisma.organization.findUnique({
      where: { id: access.organizationId },
      select: { name: true, contactEmail: true },
    }),
  ]);

  return (
    <SettingsPageClient
      initialSettings={{
        ...settings,
        organizationName: organization?.name ?? access.organizationName,
        organizationContactEmail: organization?.contactEmail ?? "",
        canManageSettings: access.canManageSettings,
        canManageUsers: access.canManageUsers,
        canClearCache: access.canClearCache,
      }}
    />
  );
}