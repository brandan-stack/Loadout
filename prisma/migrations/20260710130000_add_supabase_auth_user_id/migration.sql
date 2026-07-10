-- Add mapping from local app users to Supabase Auth users.
ALTER TABLE "AppUser"
ADD COLUMN "supabaseAuthUserId" TEXT;

CREATE UNIQUE INDEX "AppUser_supabaseAuthUserId_key"
ON "AppUser"("supabaseAuthUserId");
