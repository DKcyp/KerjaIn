# Fix Failed Migration

The migration failed because the column has a default value. The migration has been fixed.

## Step 1: Resolve the failed migration

Run this command to mark the failed migration as rolled back:

```bash
npx prisma migrate resolve --rolled-back 20260424_remove_partial_enum
```

## Step 2: Apply the corrected migration

Now run the migration again:

```bash
npx prisma migrate deploy
```

## Step 3: Generate Prisma Client

```bash
npx prisma generate
```

## What was fixed?

The third migration now:
1. Drops the default constraint temporarily
2. Changes the column type
3. Restores the default value with the new type
4. Drops the old enum type
5. Renames the new type

## Alternative: Manual SQL Fix

If the above doesn't work, you can manually run this SQL in your database:

```sql
-- Create new enum type
CREATE TYPE "BAStatus_new" AS ENUM ('DRAFT', 'MENUNGGU_APPROVAL', 'APPROVED', 'SIAP_UAT', 'SELESAI_UAT');

-- Drop default temporarily
ALTER TABLE "business_analyst" ALTER COLUMN status DROP DEFAULT;

-- Change column type
ALTER TABLE "business_analyst" ALTER COLUMN status TYPE "BAStatus_new" USING (status::text::"BAStatus_new");

-- Restore default
ALTER TABLE "business_analyst" ALTER COLUMN status SET DEFAULT 'DRAFT'::"BAStatus_new";

-- Drop old type
DROP TYPE "BAStatus";

-- Rename new type
ALTER TYPE "BAStatus_new" RENAME TO "BAStatus";
```

Then mark the migration as applied:

```bash
npx prisma migrate resolve --applied 20260424_remove_partial_enum
```
