-- Quick fix to update status values
-- Run this in your database

-- First, check current status values
SELECT DISTINCT status FROM business_analyst ORDER BY status;

-- Update the data (this should work even if enum values aren't added yet)
-- We'll update to the new values if they exist, otherwise keep old values

-- Try to update PARTIAL to KIRIM_REVIEW
DO $$
BEGIN
    UPDATE business_analyst SET status = 'KIRIM_REVIEW' WHERE status = 'PARTIAL';
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Could not update PARTIAL to KIRIM_REVIEW - enum value might not exist yet';
END $$;

-- Try to update SIAP_UAT to UAT
DO $$
BEGIN
    UPDATE business_analyst SET status = 'UAT' WHERE status = 'SIAP_UAT';
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Could not update SIAP_UAT to UAT - enum value might not exist yet';
END $$;

-- Try to update SELESAI_UAT to FINISH
DO $$
BEGIN
    UPDATE business_analyst SET status = 'FINISH' WHERE status = 'SELESAI_UAT';
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Could not update SELESAI_UAT to FINISH - enum value might not exist yet';
END $$;

-- Check the results
SELECT DISTINCT status FROM business_analyst ORDER BY status;
