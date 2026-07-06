# Final Migration Steps

The migrations have been recreated with proper ordering using timestamps.

## Step 1: Resolve all failed migrations

```bash
npx prisma migrate resolve --rolled-back 20260424_update_partial_data
npx prisma migrate resolve --rolled-back 20260424_rename_partial_to_menunggu_approval  
npx prisma migrate resolve --rolled-back 20260424_remove_partial_enum
npx prisma migrate resolve --rolled-back 20260424110000_update_partial_to_menunggu_approval
```

## Step 2: Apply the new migrations

The new migrations are properly ordered:
1. `20260424100000_add_menunggu_approval_enum` - Adds MENUNGGU_APPROVAL to enum
2. `20260424110000_update_partial_to_menunggu_approval` - Updates data from PARTIAL to MENUNGGU_APPROVAL
3. `20260424120000_remove_partial_from_enum` - Removes PARTIAL from enum

```bash
npx prisma migrate deploy
```

## Step 3: Generate Prisma Client

```bash
npx prisma generate
```

## What Changed?

The migrations now use timestamps (100000, 110000, 120000) to ensure they run in the correct order:
- 10:00:00 - Add new enum value
- 11:00:00 - Update data
- 12:00:00 - Remove old enum value

This ensures alphabetical sorting matches the logical order.

## If migrations keep failing

You can manually run the SQL in your database and then mark them as applied:

```sql
-- 1. Add new enum value
ALTER TYPE "BAStatus" ADD VALUE IF NOT EXISTS 'MENUNGGU_APPROVAL';

-- 2. Update data (run in separate transaction after committing above)
UPDATE "business_analyst" SET status = 'MENUNGGU_APPROVAL' WHERE status = 'PARTIAL';
UPDATE "bacara" SET status = 'MENUNGGU_APPROVAL' WHERE status = 'PARTIAL';

-- 3. Remove old enum value (run in separate transaction)
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

Then mark as applied:
```bash
npx prisma migrate resolve --applied 20260424100000_add_menunggu_approval_enum
npx prisma migrate resolve --applied 20260424110000_update_partial_to_menunggu_approval
npx prisma migrate resolve --applied 20260424120000_remove_partial_from_enum
```
