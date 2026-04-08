import { redirect } from "next/navigation";
import { SettingsPageClient } from "@/components/settings/settings-page-client";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getSettings } from "@/lib/features/settings-service";

export default async function SettingsPage() {
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  const [settings, organization] = await Promise.all([
    getSettings(session.organizationId),
    prisma.organization.findUnique({
      where: { id: session.organizationId },
      select: { name: true, contactEmail: true },
    }),
  ]);

  return (
    <SettingsPageClient
      initialSettings={{
        ...settings,
        organizationName: organization?.name ?? session.organizationName,
        organizationContactEmail: organization?.contactEmail ?? "",
      }}
    />
  );
}