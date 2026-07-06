-- Update BAStatus enum values
-- Rename PARTIAL to KIRIM_REVIEW
-- Rename SIAP_UAT to UAT
-- Rename SELESAI_UAT to FINISH

-- Step 1: Add new enum values (each in separate statement)
DO $$ 
BEGIN
    -- Add KIRIM_REVIEW if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'KIRIM_REVIEW' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'BAStatus')) THEN
        ALTER TYPE "BAStatus" ADD VALUE 'KIRIM_REVIEW';
    END IF;
END $$;

DO $$ 
BEGIN
    -- Add UAT if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'UAT' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'BAStatus')) THEN
        ALTER TYPE "BAStatus" ADD VALUE 'UAT';
    END IF;
END $$;

DO $$ 
BEGIN
    -- Add FINISH if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'FINISH' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'BAStatus')) THEN
        ALTER TYPE "BAStatus" ADD VALUE 'FINISH';
    END IF;
END $$;

-- Step 2: Update existing data to use new values
UPDATE "business_analyst" SET status = 'KIRIM_REVIEW' WHERE status = 'PARTIAL';
UPDATE "business_analyst" SET status = 'UAT' WHERE status = 'SIAP_UAT';
UPDATE "business_analyst" SET status = 'FINISH' WHERE status = 'SELESAI_UAT';

-- Note: PostgreSQL doesn't support removing enum values directly
-- Old values (PARTIAL, SIAP_UAT, SELESAI_UAT) will remain in the enum but won't be used
-- To fully remove them, you would need to recreate the enum type
