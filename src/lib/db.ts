// src/lib/db.ts - Prisma client singleton

import { PrismaClient } from "@prisma/client";

// Default to an ephemeral SQLite database when DATABASE_URL is not configured.
// This allows the app to run locally without requiring external database credentials.
// Set DATABASE_URL to a PostgreSQL connection string for persistent, production-grade storage.
// NOTE: instrumentation.ts sets this env var to "file:/tmp/dev.db" before importing this module,
// so the fallback here is only reached if this module is imported before instrumentation runs.
const DATABASE_URL = normalizeDatabaseUrl(process.env.DATABASE_URL ?? "file:/tmp/dev.db");

function normalizeDatabaseUrl(url: string) {
  if (!url.startsWith("postgres://") && !url.startsWith("postgresql://")) {
    return url;
  }

  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return url;
  }

  const isSupabaseTransactionPooler =
    parsed.hostname.endsWith(".pooler.supabase.com") && parsed.port === "6543";

  if (!isSupabaseTransactionPooler) {
    return url;
  }

  if (!parsed.searchParams.has("pgbouncer")) {
    parsed.searchParams.set("pgbouncer", "true");
  }

  if (!parsed.searchParams.has("connection_limit")) {
    parsed.searchParams.set("connection_limit", "1");
  }

  return parsed.toString();
}

const globalForPrisma = global as unknown as { prisma: PrismaClient };

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({ datasources: { db: { url: DATABASE_URL } } });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
