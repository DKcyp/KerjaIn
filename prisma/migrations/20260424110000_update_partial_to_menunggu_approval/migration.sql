-- Step 2: Update existing data to use the new status name in both tables
UPDATE "business_analyst" SET status = 'MENUNGGU_APPROVAL' WHERE status = 'PARTIAL';
UPDATE "bacara" SET status = 'MENUNGGU_APPROVAL' WHERE status = 'PARTIAL';
