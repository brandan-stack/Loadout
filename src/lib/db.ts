// src/lib/db.ts - Prisma client singleton

import { PrismaClient } from "@prisma/client";

// Default to an ephemeral SQLite database when DATABASE_URL is not configured.
// This allows the app to run locally without requiring external database credentials.
// Set DATABASE_URL to a PostgreSQL connection string for persistent, production-grade storage.
const DATABASE_URL = process.env.DATABASE_URL ?? "file:/tmp/loadout-dev.db";

const globalForPrisma = global as unknown as { prisma: PrismaClient };

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({ datasources: { db: { url: DATABASE_URL } } });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
