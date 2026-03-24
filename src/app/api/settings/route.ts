// src/app/api/settings/route.ts - Settings API

import { NextRequest, NextResponse } from "next/server";
import { getSettings, updateSettings } from "@/lib/features/settings-service";
import { z } from "zod";

const settingsUpdateSchema = z.object({
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

export async function GET() {
  try {
    const settings = await getSettings();
    return NextResponse.json(settings);
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
    const body = await request.json();
    const updates = settingsUpdateSchema.parse(body);
    const settings = await updateSettings(updates);
    return NextResponse.json(settings);
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
