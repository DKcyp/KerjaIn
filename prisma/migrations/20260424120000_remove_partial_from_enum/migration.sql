-- Step 3: Remove the old PARTIAL enum value by recreating the enum

-- Create a temporary type without PARTIAL
CREATE TYPE "BAStatus_new" AS ENUM ('DRAFT', 'MENUNGGU_APPROVAL', 'APPROVED', 'SIAP_UAT', 'SELESAI_UAT');

-- Drop the default constraints temporarily for both tables
ALTER TABLE "business_analyst" ALTER COLUMN status DROP DEFAULT;
ALTER TABLE "bacara" ALTER COLUMN status DROP DEFAULT;

-- Alter the columns to use the new type for both tables
ALTER TABLE "business_analyst" ALTER COLUMN status TYPE "BAStatus_new" USING (status::text::"BAStatus_new");
ALTER TABLE "bacara" ALTER COLUMN status TYPE "BAStatus_new" USING (status::text::"BAStatus_new");

-- Restore the default values for both tables
ALTER TABLE "business_analyst" ALTER COLUMN status SET DEFAULT 'DRAFT'::"BAStatus_new";
ALTER TABLE "bacara" ALTER COLUMN status SET DEFAULT 'DRAFT'::"BAStatus_new";

-- Drop the old type
DROP TYPE "BAStatus";

-- Rename the new type to the original name
ALTER TYPE "BAStatus_new" RENAME TO "BAStatus";
