-- Manual fix for the failed migration
-- Run this directly in your database

-- Step 1: Add new enum values (if not already added)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'KIRIM_REVIEW' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'BAStatus')) THEN
        ALTER TYPE "BAStatus" ADD VALUE 'KIRIM_REVIEW';
        COMMIT;
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'UAT' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'BAStatus')) THEN
        ALTER TYPE "BAStatus" ADD VALUE 'UAT';
        COMMIT;
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'FINISH' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'BAStatus')) THEN
        ALTER TYPE "BAStatus" ADD VALUE 'FINISH';
        COMMIT;
    END IF;
END $$;

-- Step 2: Update existing data
UPDATE "business_analyst" SET status = 'KIRIM_REVIEW' WHERE status = 'PARTIAL';
UPDATE "business_analyst" SET status = 'UAT' WHERE status = 'SIAP_UAT';
UPDATE "business_analyst" SET status = 'FINISH' WHERE status = 'SELESAI_UAT';
