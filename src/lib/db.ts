// src/lib/db.ts - Prisma client singleton

import { PrismaClient } from "@prisma/client";

// Resolve the database URL at module load time.
// 1. If DATABASE_URL is not set (e.g. Vercel without env var configured),
//    default to a writable /tmp path.
// 2. If it is a relative file: path redirect it to /tmp (deployment dir
//    is read-only on Vercel at runtime).
function resolveDbUrl(): string {
  const raw = process.env.DATABASE_URL;
  if (!raw) return "file:/tmp/dev.db";
  if (raw.startsWith("file:./")) {
    return "file:/tmp/" + raw.slice("file:./".length);
  }
  return raw;
}

const DB_URL = resolveDbUrl();
// Keep the env var in sync so any other code that reads it sees the right value.
process.env.DATABASE_URL = DB_URL;

const globalForPrisma = global as unknown as { prisma: PrismaClient };

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({ datasources: { db: { url: DB_URL } } });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
