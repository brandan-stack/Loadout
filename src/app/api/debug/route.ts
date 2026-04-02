import { NextResponse } from "next/server";

export async function GET() {
  const dbUrl = process.env.DATABASE_URL ?? "NOT_SET";
  
  let queryResult = "not_run";
  let queryError = "";
  let initResult = "not_run";
  let initError = "";
  
  try {
    const { prisma } = await import("@/lib/db");
    
    // Try the canary query
    try {
      await prisma.$queryRaw`SELECT 1 FROM "Supplier" LIMIT 1`;
      queryResult = "ok";
    } catch (e) {
      queryResult = "failed";
      queryError = String(e);
    }
    
    // Try creating a simple table to see if writes work
    try {
      await prisma.$executeRawUnsafe(
        `CREATE TABLE IF NOT EXISTS "_health" ("id" TEXT NOT NULL PRIMARY KEY)`
      );
      initResult = "ok";
    } catch (e) {
      initResult = "failed";
      initError = String(e);
    }
  } catch (e) {
    queryError = "import_failed: " + String(e);
  }
  
  return NextResponse.json({
    dbUrlBeforeImport: dbUrl,
    dbUrlAfterImport: process.env.DATABASE_URL ?? "NOT_SET",
    queryResult,
    queryError: queryError.substring(0, 400),
    initResult,
    initError: initError.substring(0, 400),
    cwd: process.cwd(),
    nodeEnv: process.env.NODE_ENV,
  });
}
