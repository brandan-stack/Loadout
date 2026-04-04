DELETE FROM "AppUser"
WHERE "email" IS NULL
   OR "email" = ''
   OR "passwordHash" IS NULL
   OR "passwordHash" = ''
   OR COALESCE("pinHash", '') <> '';

ALTER TABLE "AppUser"
ALTER COLUMN "email" SET NOT NULL,
ALTER COLUMN "email" DROP DEFAULT,
ALTER COLUMN "passwordHash" SET NOT NULL,
ALTER COLUMN "passwordHash" DROP DEFAULT;

ALTER TABLE "AppUser"
DROP COLUMN IF EXISTS "pinHash";