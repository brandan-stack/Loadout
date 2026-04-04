// src/lib/features/settings-service.ts - Feature toggle and settings management

import { prisma } from "@/lib/db";

export interface AppSettings {
  premiumEnabled: boolean;
  simpleMode: boolean;
  enableMultiLocation: boolean;
  enableVariants: boolean;
  enableImportWizard: boolean;
  enableLotExpiry: boolean;
  enableBackupZip: boolean;
  enableReportScheduler: boolean;
  enableAITagging: boolean;
  preferredEmailClient: string;
  composeSubjectTemplate: string;
  defaultLowStockAmber: number;
  defaultLowStockRed: number;
}

const settingsCache = new Map<string, { value: AppSettings; cacheTime: number }>();
const CACHE_TTL = 30_000; // 30 seconds

export async function getSettings(organizationId: string): Promise<AppSettings> {
  // Cache for 30s to avoid hammering the DB on every request
  const cachedSettings = settingsCache.get(organizationId);
  if (cachedSettings && Date.now() - cachedSettings.cacheTime < CACHE_TTL) {
    return cachedSettings.value;
  }

  const settings = await prisma.settings.findUnique({
    where: { organizationId },
  });

  if (!settings) {
    // Return defaults if no settings row exists
    return {
      premiumEnabled: false,
      simpleMode: true,
      enableMultiLocation: false,
      enableVariants: false,
      enableImportWizard: false,
      enableLotExpiry: false,
      enableBackupZip: false,
      enableReportScheduler: false,
      enableAITagging: false,
      preferredEmailClient: "default",
      composeSubjectTemplate: "${reportType} Report - ${date}",
      defaultLowStockAmber: 10,
      defaultLowStockRed: 5,
    };
  }

  const result = {
    premiumEnabled: settings.premiumEnabled,
    simpleMode: settings.simpleMode,
    enableMultiLocation: settings.enableMultiLocation,
    enableVariants: settings.enableVariants,
    enableImportWizard: settings.enableImportWizard,
    enableLotExpiry: settings.enableLotExpiry,
    enableBackupZip: settings.enableBackupZip,
    enableReportScheduler: settings.enableReportScheduler,
    enableAITagging: settings.enableAITagging,
    preferredEmailClient: settings.preferredEmailClient,
    composeSubjectTemplate: settings.composeSubjectTemplate,
    defaultLowStockAmber: settings.defaultLowStockAmber,
    defaultLowStockRed: settings.defaultLowStockRed,
  };

  settingsCache.set(organizationId, { value: result, cacheTime: Date.now() });
  return result;
}

const DEFAULT_SETTINGS_CREATE = {
  premiumEnabled: false,
  simpleMode: true,
  enableMultiLocation: false,
  enableVariants: false,
  enableImportWizard: false,
  enableLotExpiry: false,
  enableBackupZip: false,
  enableReportScheduler: false,
  enableAITagging: false,
  preferredEmailClient: "default",
  composeSubjectTemplate: "${reportType} Report - ${date}",
  defaultLowStockAmber: 5,
  defaultLowStockRed: 2,
};

export async function updateSettings(
  organizationId: string,
  updates: Partial<AppSettings>
): Promise<AppSettings> {
  const existing = await prisma.settings.findUnique({
    where: { organizationId },
  });

  const updated = existing
    ? await prisma.settings.update({ where: { id: existing.id }, data: updates })
    : await prisma.settings.create({ data: { organizationId, ...DEFAULT_SETTINGS_CREATE, ...updates } });

  // Invalidate cache
  settingsCache.delete(organizationId);

  return {
    premiumEnabled: updated.premiumEnabled,
    simpleMode: updated.simpleMode,
    enableMultiLocation: updated.enableMultiLocation,
    enableVariants: updated.enableVariants,
    enableImportWizard: updated.enableImportWizard,
    enableLotExpiry: updated.enableLotExpiry,
    enableBackupZip: updated.enableBackupZip,
    enableReportScheduler: updated.enableReportScheduler,
    enableAITagging: updated.enableAITagging,
    preferredEmailClient: updated.preferredEmailClient,
    composeSubjectTemplate: updated.composeSubjectTemplate,
    defaultLowStockAmber: updated.defaultLowStockAmber,
    defaultLowStockRed: updated.defaultLowStockRed,
  };
}
