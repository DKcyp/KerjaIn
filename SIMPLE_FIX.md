# Simple Fix - Manual SQL + Mark Migrations as Applied

The easiest way to fix this is to:
1. Run the SQL manually in your database
2. Mark the migrations as applied

## Step 1: Connect to your database

Use pgAdmin, DBeaver, or psql to connect to your database:
```
Host: 202.152.141.18
Port: 9494
Database: log_prod_trial
```

## Step 2: Run this SQL

Copy and paste this entire block into your SQL editor and run it:

```sql
-- Check if MENUNGGU_APPROVAL already exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum 
        WHERE enumlabel = 'MENUNGGU_APPROVAL' 
        AND enumtypid = 'BAStatus'::regtype
    ) THEN
        -- Add MENUNGGU_APPROVAL
        ALTER TYPE "BAStatus" ADD VALUE 'MENUNGGU_APPROVAL';
        RAISE NOTICE 'Added MENUNGGU_APPROVAL to enum';
    ELSE
        RAISE NOTICE 'MENUNGGU_APPROVAL already exists';
    END IF;
END$$;
```

Wait a moment, then run this in a NEW query window:

```sql
-- Update data
UPDATE "business_analyst" SET status = 'MENUNGGU_APPROVAL' WHERE status = 'PARTIAL';
UPDATE "bacara" SET status = 'MENUNGGU_APPROVAL' WHERE status = 'PARTIAL';
```

Wait a moment, then run this in a NEW query window:

```sql
-- Remove PARTIAL from enum
CREATE TYPE "BAStatus_new" AS ENUM ('DRAFT', 'MENUNGGU_APPROVAL', 'APPROVED', 'SIAP_UAT', 'SELESAI_UAT');
ALTER TABLE "business_analyst" ALTER COLUMN status DROP DEFAULT;
ALTER TABLE "bacara" ALTER COLUMN status DROP DEFAULT;
ALTER TABLE "business_analyst" ALTER COLUMN status TYPE "BAStatus_new" USING (status::text::"BAStatus_new");
ALTER TABLE "bacara" ALTER COLUMN status TYPE "BAStatus_new" USING (status::text::"BAStatus_new");
ALTER TABLE "business_analyst" ALTER COLUMN status SET DEFAULT 'DRAFT'::"BAStatus_new";
ALTER TABLE "bacara" ALTER COLUMN status SET DEFAULT 'DRAFT'::"BAStatus_new";
DROP TYPE "BAStatus";
ALTER TYPE "BAStatus_new" RENAME TO "BAStatus";
```

## Step 3: Mark migrations as applied

After running the SQL successfully, mark the migrations as applied:

```bash
npx prisma migrate resolve --applied 20260424100000_add_menunggu_approval_enum
npx prisma migrate resolve --applied 20260424110000_update_partial_to_menunggu_approval
npx prisma migrate resolve --applied 20260424120000_remove_partial_from_enum
```

## Step 4: Generate Prisma Client

```bash
npx prisma generate
```

## Done!

Your application should now work with the new status name "Menunggu Approval" instead of "Partial".
