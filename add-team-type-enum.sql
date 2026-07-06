-- Add TeamType enum to PostgreSQL database
-- This fixes the "type \"public.TeamType\" does not exist" error

-- Create the TeamType enum
DO $$ BEGIN
    CREATE TYPE "TeamType" AS ENUM ('MANAGED_SERVICE', 'PRODUCT', 'PROJECT');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Update the master_team table to use the enum instead of VARCHAR with CHECK constraint
-- First, add a temporary column with the enum type
ALTER TABLE master_team ADD COLUMN IF NOT EXISTS type_enum "TeamType";

-- Update the temporary column with values from the existing type column
UPDATE master_team SET type_enum = type::"TeamType";

-- Drop the old type column and rename the new one
ALTER TABLE master_team DROP COLUMN IF EXISTS type;
ALTER TABLE master_team RENAME COLUMN type_enum TO type;

-- Set default value for the type column
ALTER TABLE master_team ALTER COLUMN type SET DEFAULT 'PRODUCT'::"TeamType";
ALTER TABLE master_team ALTER COLUMN type SET NOT NULL;

-- Verify the change
-- SELECT column_name, data_type, is_nullable, column_default 
-- FROM information_schema.columns 
-- WHERE table_name = 'master_team' AND column_name = 'type';