// src/instrumentation.ts
// Runs once when the Next.js server starts. Used to ensure the database
// is initialized with the correct schema before any requests are served.

export async function register() {
  // Only run database initialization on the server (Node.js runtime)
  if (process.env.NEXT_RUNTIME !== "edge") {
    try {
      // Dynamically import to avoid bundling issues
      const { execSync } = await import("child_process");

      // Apply any pending migrations (creates the db file if it doesn't exist)
      // This ensures Vercel's ephemeral or newly-created SQLite database is
      // always up-to-date with the latest schema.
      execSync("npx prisma migrate deploy --schema=./prisma/schema.prisma", {
        stdio: "pipe",
        timeout: 30000,
      });
    } catch (err) {
      // Log the error but don't crash the server start-up.
      // If migrations fail (e.g. DB is read-only on this tier),
      // the app will still serve pages; individual API routes will
      // return 500 until the DB is accessible.
      console.error("[instrumentation] prisma migrate deploy failed:", err);

      // Fallback: try db push (creates schema without migration history)
      try {
        const { execSync } = await import("child_process");
        execSync(
          "npx prisma db push --accept-data-loss --schema=./prisma/schema.prisma",
          { stdio: "pipe", timeout: 30000 }
        );
        console.log("[instrumentation] prisma db push succeeded (fallback)");
      } catch (pushErr) {
        console.error("[instrumentation] prisma db push also failed:", pushErr);
      }
    }
  }
}
