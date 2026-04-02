// src/lib/db.ts - Prisma client singleton

import { PrismaClient } from "@prisma/client";

// On Vercel (and any serverless platform), the deployment directory is
// read-only at runtime. SQLite needs a writable path. Redirect any
// relative file: URL to /tmp which IS writable on Vercel Lambda.
// This only applies when the URL is the default local-dev relative path.
if (
  typeof process !== "undefined" &&
  process.env.DATABASE_URL?.startsWith("file:./")
) {
  const filename = process.env.DATABASE_URL.replace("file:./", "");
  process.env.DATABASE_URL = `file:/tmp/${filename}`;
}

const globalForPrisma = global as unknown as { prisma: PrismaClient };

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
