-- Step 1: Add missing columns to bacara table to match BusinessAnalyst structure
DO $$
BEGIN
    -- Add type column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'bacara' AND column_name = 'type'
    ) THEN
        ALTER TABLE bacara ADD COLUMN type VARCHAR(50) DEFAULT 'BERITA_ACARA';
        RAISE NOTICE 'Added type column to bacara table';
    END IF;

    -- Add file_rfc column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'bacara' AND column_name = 'file_rfc'
    ) THEN
        ALTER TABLE bacara ADD COLUMN file_rfc VARCHAR(255);
        RAISE NOTICE 'Added file_rfc column to bacara table';
    END IF;

    -- Add file_ced column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'bacara' AND column_name = 'file_ced'
    ) THEN
        ALTER TABLE bacara ADD COLUMN file_ced VARCHAR(255);
        RAISE NOTICE 'Added file_ced column to bacara table';
    END IF;

    -- Add file_ok column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'bacara' AND column_name = 'file_ok'
    ) THEN
        ALTER TABLE bacara ADD COLUMN file_ok VARCHAR(255);
        RAISE NOTICE 'Added file_ok column to bacara table';
    END IF;
END $$;

-- Step 2: Create BAType enum if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'BAType') THEN
        CREATE TYPE "BAType" AS ENUM (
            'BLUEPRINT',
            'BERITA_ACARA'
        );
        RAISE NOTICE 'Created BAType enum';
    ELSE
        RAISE NOTICE 'BAType enum already exists';
    END IF;
END $$;

-- Step 3: Update column types to use proper enums
DO $$ 
BEGIN
    -- Update status column to use BAStatus enum if it's not already
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'bacara' 
          AND column_name = 'status' 
          AND data_type = 'character varying'
    ) THEN
        -- Drop default constraint first
        ALTER TABLE bacara ALTER COLUMN status DROP DEFAULT;
        
        -- Update to enum type
        ALTER TABLE bacara 
        ALTER COLUMN status TYPE "BAStatus" 
        USING (status::text::"BAStatus");
        
        -- Set new default
        ALTER TABLE bacara 
        ALTER COLUMN status SET DEFAULT 'DRAFT'::"BAStatus";
        
        RAISE NOTICE 'Updated bacara.status to use BAStatus enum';
    END IF;
    
    -- Update type column to use BAType enum
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'bacara' 
          AND column_name = 'type' 
          AND data_type = 'character varying'
    ) THEN
        -- Drop default constraint first
        ALTER TABLE bacara ALTER COLUMN type DROP DEFAULT;
        
        -- Update to enum type
        ALTER TABLE bacara 
        ALTER COLUMN type TYPE "BAType" 
        USING (type::text::"BAType");
        
        -- Set new default
        ALTER TABLE bacara 
        ALTER COLUMN type SET DEFAULT 'BERITA_ACARA'::"BAType";
        
        RAISE NOTICE 'Updated bacara.type to use BAType enum';
    END IF;
END $$;

-- Step 4: Create indexes to match BusinessAnalyst model
CREATE INDEX IF NOT EXISTS idx_bacara_project_id ON bacara("projectId");
CREATE INDEX IF NOT EXISTS idx_bacara_project_nama ON bacara("projectId", nama);
CREATE INDEX IF NOT EXISTS idx_bacara_project_type ON bacara("projectId", type);
CREATE INDEX IF NOT EXISTS idx_bacara_type ON bacara(type);

-- Step 5: Verify the structure
SELECT 'Updated bacara table structure:' AS info;
SELECT column_name, data_type, udt_name, column_default, is_nullable
FROM information_schema.columns 
WHERE table_name = 'bacara' 
ORDER BY ordinal_position;