import { NextResponse } from "next/server";

/**
 * GET /api/health — returns configuration status including whether
 * the database is using persistent or temporary storage.
 */
export async function GET() {
  const dbUrl = process.env.DATABASE_URL ?? "";

  // Warn if using ephemeral storage (SQLite in /tmp or no URL set)
  const isEphemeral =
    !dbUrl ||
    dbUrl.startsWith("file:/tmp/") ||
    dbUrl === "file:/tmp/dev.db";

  return NextResponse.json({
    ok: true,
    dbPersistent: !isEphemeral,
    dbWarning: isEphemeral
      ? "Database is stored in temporary memory. Data will be lost when the server restarts. Set DATABASE_URL to a persistent database (e.g. PostgreSQL) to retain data across sessions and devices."
      : null,
  });
}
