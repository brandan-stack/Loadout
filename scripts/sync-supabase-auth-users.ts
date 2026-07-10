import { PrismaClient } from "@prisma/client";
import { ensureSupabaseAuthUser } from "../src/lib/supabase/admin";

const prisma = new PrismaClient();

async function main() {
  const prismaAny = prisma as any;

  const users = await prismaAny.appUser.findMany({
    select: {
      id: true,
      email: true,
      name: true,
      organizationId: true,
      supabaseAuthUserId: true,
    },
    orderBy: { createdAt: "asc" },
  });

  let created = 0;
  let linkedExisting = 0;
  let skipped = 0;
  let failed = 0;

  for (const user of users) {
    if (user.supabaseAuthUserId) {
      skipped += 1;
      continue;
    }

    try {
      const ensured = await ensureSupabaseAuthUser({
        email: user.email,
        name: user.name,
        appUserId: user.id,
        organizationId: user.organizationId,
      });

      await prismaAny.appUser.update({
        where: { id: user.id },
        data: { supabaseAuthUserId: ensured.userId },
      });

      if (ensured.created) {
        created += 1;
      } else {
        linkedExisting += 1;
      }

      console.log(`synced ${user.email} -> ${ensured.userId}`);
    } catch (error) {
      failed += 1;
      const message = error instanceof Error ? error.message : String(error);
      console.error(`failed ${user.email}: ${message}`);
    }
  }

  console.log("--- sync summary ---");
  console.log(`total users: ${users.length}`);
  console.log(`created auth users: ${created}`);
  console.log(`linked existing auth users: ${linkedExisting}`);
  console.log(`already linked: ${skipped}`);
  console.log(`failed: ${failed}`);

  if (failed > 0) {
    process.exitCode = 1;
  }
}

main()
  .catch((error) => {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`sync failed: ${message}`);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
