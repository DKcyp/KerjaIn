-- Recreate BAStatus enum from scratch
-- The enum was accidentally dropped, so we need to recreate it

-- Step 1: Create the enum with all values including the new one
CREATE TYPE "BAStatus" AS ENUM ('DRAFT', 'MENUNGGU_APPROVAL', 'APPROVED', 'SIAP_UAT', 'SELESAI_UAT');

-- Step 2: Set the column types back to use the enum
-- First, let's check what type the columns currently have
-- They might be text or the columns might not exist

-- For business_analyst table
DO $$
BEGIN
    -- Try to alter the column type
    ALTER TABLE "business_analyst" ALTER COLUMN status TYPE "BAStatus" USING (status::text::"BAStatus");
    ALTER TABLE "business_analyst" ALTER COLUMN status SET DEFAULT 'DRAFT';
    RAISE NOTICE 'Updated business_analyst.status column';
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Could not update business_analyst.status: %', SQLERRM;
END$$;

-- For bacara table
DO $$
BEGIN
    -- Try to alter the column type
    ALTER TABLE "bacara" ALTER COLUMN status TYPE "BAStatus" USING (status::text::"BAStatus");
    ALTER TABLE "bacara" ALTER COLUMN status SET DEFAULT 'DRAFT';
    RAISE NOTICE 'Updated bacara.status column';
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Could not update bacara.status: %', SQLERRM;
END$$;

-- Verify the enum was created
SELECT enumlabel FROM pg_enum WHERE enumtypid = 'BAStatus'::regtype ORDER BY enumsortorder;
