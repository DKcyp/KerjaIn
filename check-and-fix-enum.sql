-- Check current enum values
SELECT enumlabel 
FROM pg_enum 
WHERE enumtypid = 'BAStatus'::regtype 
ORDER BY enumsortorder;

-- This will show you what values currently exist in the enum
-- Expected output should include: DRAFT, MENUNGGU_APPROVAL, APPROVED, SIAP_UAT, SELESAI_UAT
-- If PARTIAL is there and MENUNGGU_APPROVAL is missing, continue below

-- Add MENUNGGU_APPROVAL if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum 
        WHERE enumlabel = 'MENUNGGU_APPROVAL' 
        AND enumtypid = 'BAStatus'::regtype
    ) THEN
        ALTER TYPE "BAStatus" ADD VALUE 'MENUNGGU_APPROVAL';
        RAISE NOTICE 'Added MENUNGGU_APPROVAL';
    ELSE
        RAISE NOTICE 'MENUNGGU_APPROVAL already exists';
    END IF;
END$$;

-- Check again to confirm
SELECT enumlabel 
FROM pg_enum 
WHERE enumtypid = 'BAStatus'::regtype 
ORDER BY enumsortorder;
