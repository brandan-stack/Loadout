// src/lib/db.ts - Prisma client singleton

import { PrismaClient } from "@prisma/client";

// Default to an ephemeral SQLite database when DATABASE_URL is not configured.
// This allows the app to run locally without requiring external database credentials.
// Set DATABASE_URL to a PostgreSQL connection string for persistent, production-grade storage.
// NOTE: instrumentation.ts sets this env var to "file:/tmp/dev.db" before importing this module,
// so the fallback here is only reached if this module is imported before instrumentation runs.
const DATABASE_URL = process.env.DATABASE_URL ?? "file:/tmp/dev.db";

const globalForPrisma = global as unknown as { prisma: PrismaClient };

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({ datasources: { db: { url: DATABASE_URL } } });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
