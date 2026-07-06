-- Manual fix for BAStatus enum
-- Run this SQL directly in your PostgreSQL database

-- Check current enum values
SELECT unnest(enum_range(NULL::BAStatus));

-- If PARTIAL exists and MENUNGGU_APPROVAL doesn't exist, run these:
DO $$
BEGIN
    -- Add MENUNGGU_APPROVAL if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'MENUNGGU_APPROVAL' AND enumtypid = 'BAStatus'::regtype) THEN
        ALTER TYPE "BAStatus" ADD VALUE 'MENUNGGU_APPROVAL';
    END IF;
END$$;

-- Commit the transaction
COMMIT;

-- Now update the data (in a new transaction)
BEGIN;
UPDATE "business_analyst" SET status = 'MENUNGGU_APPROVAL' WHERE status = 'PARTIAL';
UPDATE "bacara" SET status = 'MENUNGGU_APPROVAL' WHERE status = 'PARTIAL';
COMMIT;

-- Now remove PARTIAL by recreating the enum (in a new transaction)
BEGIN;
CREATE TYPE "BAStatus_new" AS ENUM ('DRAFT', 'MENUNGGU_APPROVAL', 'APPROVED', 'SIAP_UAT', 'SELESAI_UAT');
ALTER TABLE "business_analyst" ALTER COLUMN status DROP DEFAULT;
ALTER TABLE "bacara" ALTER COLUMN status DROP DEFAULT;
ALTER TABLE "business_analyst" ALTER COLUMN status TYPE "BAStatus_new" USING (status::text::"BAStatus_new");
ALTER TABLE "bacara" ALTER COLUMN status TYPE "BAStatus_new" USING (status::text::"BAStatus_new");
ALTER TABLE "business_analyst" ALTER COLUMN status SET DEFAULT 'DRAFT'::"BAStatus_new";
ALTER TABLE "bacara" ALTER COLUMN status SET DEFAULT 'DRAFT'::"BAStatus_new";
DROP TYPE "BAStatus";
ALTER TYPE "BAStatus_new" RENAME TO "BAStatus";
COMMIT;

-- Verify the result
SELECT unnest(enum_range(NULL::BAStatus));
