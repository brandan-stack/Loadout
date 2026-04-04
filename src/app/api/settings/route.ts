// src/app/api/settings/route.ts - Settings API

import { NextRequest, NextResponse } from "next/server";
import { getSettings, updateSettings } from "@/lib/features/settings-service";
import { requireRequestContext } from "@/lib/request-context";
import { prisma } from "@/lib/db";
import { z } from "zod";

const settingsUpdateSchema = z.object({
  organizationName: z.string().trim().min(1).max(120).optional(),
  organizationContactEmail: z.string().trim().email().optional(),
  premiumEnabled: z.boolean().optional(),
  simpleMode: z.boolean().optional(),
  enableMultiLocation: z.boolean().optional(),
  enableVariants: z.boolean().optional(),
  enableImportWizard: z.boolean().optional(),
  enableLotExpiry: z.boolean().optional(),
  enableBackupZip: z.boolean().optional(),
  enableReportScheduler: z.boolean().optional(),
  enableAITagging: z.boolean().optional(),
  preferredEmailClient: z.string().optional(),
  composeSubjectTemplate: z.string().optional(),
  defaultLowStockAmber: z.number().min(0).optional(),
  defaultLowStockRed: z.number().min(0).optional(),
});

export async function GET(request: NextRequest) {
  try {
    const auth = requireRequestContext(request);
    if (!auth.ok) {
      return auth.response;
    }

    const settings = await getSettings(auth.context.organizationId);
    const organization = await prisma.organization.findUnique({
      where: { id: auth.context.organizationId },
      select: { name: true, contactEmail: true },
    });

    return NextResponse.json({
      ...settings,
      organizationName: organization?.name ?? auth.context.organizationName,
      organizationContactEmail: organization?.contactEmail ?? "",
    });
  } catch (error) {
    console.error("Settings GET error:", error);
    return NextResponse.json(
      { error: "Failed to retrieve settings" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const auth = requireRequestContext(request);
    if (!auth.ok) {
      return auth.response;
    }
    if (auth.context.role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const body = await request.json();
    const updates = settingsUpdateSchema.parse(body);
    const { organizationName, organizationContactEmail, ...settingsUpdates } = updates;

    const [settings, organization] = await Promise.all([
      updateSettings(auth.context.organizationId, settingsUpdates),
      organizationName || organizationContactEmail
        ? prisma.organization.update({
            where: { id: auth.context.organizationId },
            data: {
              ...(organizationName ? { name: organizationName } : {}),
              ...(organizationContactEmail ? { contactEmail: organizationContactEmail } : {}),
            },
            select: { name: true, contactEmail: true },
          })
        : prisma.organization.findUnique({
            where: { id: auth.context.organizationId },
            select: { name: true, contactEmail: true },
          }),
    ]);

    return NextResponse.json({
      ...settings,
      organizationName: organization?.name ?? auth.context.organizationName,
      organizationContactEmail: organization?.contactEmail ?? "",
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    console.error("Settings PATCH error:", error);
    return NextResponse.json(
      { error: "Failed to update settings" },
      { status: 500 }
    );
  }
}
