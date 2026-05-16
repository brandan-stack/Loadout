ALTER TABLE "Job"
  ADD COLUMN "title" TEXT,
  ADD COLUMN "siteName" TEXT,
  ADD COLUMN "createdByUserId" TEXT,
  ADD COLUMN "createdByName" TEXT,
  ADD COLUMN "customerSummary" TEXT,
  ADD COLUMN "completedAt" TIMESTAMP(3),
  ADD COLUMN "completedByUserId" TEXT,
  ADD COLUMN "completedByName" TEXT,
  ADD COLUMN "invoiceNumber" TEXT,
  ADD COLUMN "invoiceDate" TIMESTAMP(3),
  ADD COLUMN "invoicedByUserId" TEXT,
  ADD COLUMN "invoicedByName" TEXT;

ALTER TABLE "JobPart"
  ADD COLUMN "markupPercent" DOUBLE PRECISION NOT NULL DEFAULT 0,
  ADD COLUMN "unitSell" DOUBLE PRECISION NOT NULL DEFAULT 0,
  ADD COLUMN "itemPartNumberSnapshot" TEXT;

UPDATE "JobPart"
SET "unitSell" = COALESCE("unitCost", 0)
WHERE "unitSell" = 0;

CREATE TABLE "JobHistory" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "jobId" TEXT NOT NULL,
  "actorUserId" TEXT,
  "actorName" TEXT,
  "actionType" TEXT NOT NULL,
  "actionLabel" TEXT NOT NULL,
  "details" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "JobHistory_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "JobHistory"
  ADD CONSTRAINT "JobHistory_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "JobHistory"
  ADD CONSTRAINT "JobHistory_jobId_fkey"
  FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE INDEX "Job_organizationId_status_latestActivityAt_idx" ON "Job"("organizationId", "status", "latestActivityAt");
CREATE INDEX "Job_organizationId_invoiceNumber_idx" ON "Job"("organizationId", "invoiceNumber");
CREATE INDEX "JobHistory_organizationId_idx" ON "JobHistory"("organizationId");
CREATE INDEX "JobHistory_jobId_idx" ON "JobHistory"("jobId");
CREATE INDEX "JobHistory_jobId_createdAt_idx" ON "JobHistory"("jobId", "createdAt");