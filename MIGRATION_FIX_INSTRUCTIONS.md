# How to Fix the Failed Migration

The migration failed because PostgreSQL requires enum values to be committed before they can be used. Here's how to fix it:

## Option 1: Resolve and Reapply (Recommended)

```bash
# 1. Mark the failed migration as resolved
npx prisma migrate resolve --applied 20260423_update_ba_status_enum

# 2. Run the migration again
npx prisma migrate deploy

# 3. Regenerate Prisma client
npx prisma generate
```

## Option 2: Manual SQL Fix

If Option 1 doesn't work, run the SQL manually:

```bash
# Connect to your database
psql -U svc_pg3xp -h 202.152.141.18 -p 9494 -d log_prod_trial

# Then run these commands one by one:
```

```sql
-- Add KIRIM_REVIEW
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'KIRIM_REVIEW' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'BAStatus')) THEN
        ALTER TYPE "BAStatus" ADD VALUE 'KIRIM_REVIEW';
    END IF;
END $$;

-- Add UAT
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'UAT' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'BAStatus')) THEN
        ALTER TYPE "BAStatus" ADD VALUE 'UAT';
    END IF;
END $$;

-- Add FINISH
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'FINISH' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'BAStatus')) THEN
        ALTER TYPE "BAStatus" ADD VALUE 'FINISH';
    END IF;
END $$;

-- Update existing data
UPDATE "business_analyst" SET status = 'KIRIM_REVIEW' WHERE status = 'PARTIAL';
UPDATE "business_analyst" SET status = 'UAT' WHERE status = 'SIAP_UAT';
UPDATE "business_analyst" SET status = 'FINISH' WHERE status = 'SELESAI_UAT';
```

Then mark the migration as applied:

```bash
npx prisma migrate resolve --applied 20260423_update_ba_status_enum
npx prisma generate
```

## Option 3: Rollback and Recreate

If you want to start fresh:

```bash
# 1. Mark as rolled back
npx prisma migrate resolve --rolled-back 20260423_update_ba_status_enum

# 2. Delete the migration folder
rm -rf prisma/migrations/20260423_update_ba_status_enum

# 3. Create a new migration
npx prisma migrate dev --name update_ba_status_enum_v2
```

## Verify the Changes

After applying the fix, verify the enum values:

```sql
SELECT enumlabel 
FROM pg_enum 
WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'BAStatus')
ORDER BY enumlabel;
```

You should see:
- APPROVED
- DRAFT
- FINISH
- KIRIM_REVIEW
- PARTIAL (old, unused)
- SIAP_UAT (old, unused)
- SELESAI_UAT (old, unused)
- UAT

## After Fix

Don't forget to restart your application!
