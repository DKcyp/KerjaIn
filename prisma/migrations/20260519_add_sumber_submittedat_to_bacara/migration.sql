-- Migration: Add BAFrom enum, sumber and submitted_at fields to bacara table

-- 1. Create the BAFrom enum type
CREATE TYPE "BAFrom" AS ENUM ('CRM', 'LOGBOOK');

-- 2. Add sumber column with default LOGBOOK
ALTER TABLE "bacara"
  ADD COLUMN "sumber" "BAFrom" NOT NULL DEFAULT 'LOGBOOK';

-- 3. Add submitted_at column (nullable)
ALTER TABLE "bacara"
  ADD COLUMN "submitted_at" TIMESTAMP(3);

-- 4. Backfill: existing BLUEPRINT type records get sumber = CRM
UPDATE "bacara"
  SET "sumber" = 'CRM'
  WHERE "type" = 'BLUEPRINT';

-- 5. Backfill: records already past DRAFT get submitted_at = updatedAt as best estimate
UPDATE "bacara"
  SET "submitted_at" = "updatedAt"
  WHERE "status" IN (
    'PENGAJUAN', 'REVIEW', 'RFC', 'CED', 'KIRIM_OK',
    'DEVELOPMENT', 'UAT_INTERNAL', 'UAT_INTERNAL_SELESAI',
    'UAT_EXTERNAL', 'UAT_EXTERNAL_SELESAI', 'SELESAI'
  )
  AND "submitted_at" IS NULL;

-- 6. Index on sumber
CREATE INDEX "idx_bacara_sumber" ON "bacara" ("sumber");
