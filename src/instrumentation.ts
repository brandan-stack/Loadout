// src/instrumentation.ts
// Runs once when the Next.js server starts.
// The Postgres app does not need runtime schema bootstrapping here.

export async function register() {
  if (process.env.NEXT_RUNTIME === "edge") return;

  if (
    process.env.DATABASE_URL?.startsWith("postgres://") ||
    process.env.DATABASE_URL?.startsWith("postgresql://")
  ) {
    console.log("[instrumentation] PostgreSQL datasource detected; skipping SQLite bootstrap.");
    return;
  }
}
