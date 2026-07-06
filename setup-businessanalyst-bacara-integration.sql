-- Complete setup script to integrate BusinessAnalyst with bacara tables
-- Run this script in your production database

-- Step 1: Create required enums
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'BAStatus') THEN
        CREATE TYPE "BAStatus" AS ENUM (
            'DRAFT',
            'PENGAJUAN', 
            'REVIEW',
            'RFC',
            'CED',
            'KIRIM_OK',
            'DEVELOPMENT',
            'UAT_INTERNAL',
            'UAT_EXTERNAL',
            'SELESAI'
        );
        RAISE NOTICE 'Created BAStatus enum';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'BAType') THEN
        CREATE TYPE "BAType" AS ENUM (
            'BLUEPRINT',
            'BERITA_ACARA'
        );
        RAISE NOTICE 'Created BAType enum';
    END IF;
END $$;

-- Step 2: Update bacara table structure to match BusinessAnalyst model
DO $$
BEGIN
    -- Add missing columns
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'bacara' AND column_name = 'type'
    ) THEN
        ALTER TABLE bacara ADD COLUMN type VARCHAR(50) DEFAULT 'BERITA_ACARA';
        RAISE NOTICE 'Added type column to bacara table';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'bacara' AND column_name = 'file_rfc'
    ) THEN
        ALTER TABLE bacara ADD COLUMN file_rfc VARCHAR(255);
        RAISE NOTICE 'Added file_rfc column to bacara table';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'bacara' AND column_name = 'file_ced'
    ) THEN
        ALTER TABLE bacara ADD COLUMN file_ced VARCHAR(255);
        RAISE NOTICE 'Added file_ced column to bacara table';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'bacara' AND column_name = 'file_ok'
    ) THEN
        ALTER TABLE bacara ADD COLUMN file_ok VARCHAR(255);
        RAISE NOTICE 'Added file_ok column to bacara table';
    END IF;

    -- Update column types to use enums
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'bacara' 
          AND column_name = 'status' 
          AND data_type = 'character varying'
    ) THEN
        ALTER TABLE bacara ALTER COLUMN status DROP DEFAULT;
        ALTER TABLE bacara ALTER COLUMN status TYPE "BAStatus" USING (status::text::"BAStatus");
        ALTER TABLE bacara ALTER COLUMN status SET DEFAULT 'DRAFT'::"BAStatus";
        RAISE NOTICE 'Updated bacara.status to use BAStatus enum';
    END IF;
    
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'bacara' 
          AND column_name = 'type' 
          AND data_type = 'character varying'
    ) THEN
        ALTER TABLE bacara ALTER COLUMN type DROP DEFAULT;
        ALTER TABLE bacara ALTER COLUMN type TYPE "BAType" USING (type::text::"BAType");
        ALTER TABLE bacara ALTER COLUMN type SET DEFAULT 'BERITA_ACARA'::"BAType";
        RAISE NOTICE 'Updated bacara.type to use BAType enum';
    END IF;
END $$;

-- Step 3: Update bacara_module table column names
DO $$
BEGIN
    -- Check and rename columns to match Prisma mappings
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'bacara_module' AND column_name = 'project_id') THEN
        ALTER TABLE bacara_module RENAME COLUMN project_id TO "projectId";
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'bacara_module' AND column_name = 'ba_id') THEN
        ALTER TABLE bacara_module RENAME COLUMN ba_id TO "baId";
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'bacara_module' AND column_name = 'parent_id') THEN
        ALTER TABLE bacara_module RENAME COLUMN parent_id TO "parentId";
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'bacara_module' AND column_name = 'created_at') THEN
        ALTER TABLE bacara_module RENAME COLUMN created_at TO "createdAt";
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'bacara_module' AND column_name = 'updated_at') THEN
        ALTER TABLE bacara_module RENAME COLUMN updated_at TO "updatedAt";
    END IF;
    
    RAISE NOTICE 'Updated bacara_module column names';
END $$;

-- Step 4: Update bacara_task table column names
DO $$
BEGIN
    -- Check and rename columns to match Prisma mappings
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'bacara_task' AND column_name = 'project_id') THEN
        ALTER TABLE bacara_task RENAME COLUMN project_id TO "projectId";
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'bacara_task' AND column_name = 'module_id') THEN
        ALTER TABLE bacara_task RENAME COLUMN module_id TO "moduleId";
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'bacara_task' AND column_name = 'programmer_id') THEN
        ALTER TABLE bacara_task RENAME COLUMN programmer_id TO "programmerId";
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'bacara_task' AND column_name = 'created_at') THEN
        ALTER TABLE bacara_task RENAME COLUMN created_at TO "createdAt";
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'bacara_task' AND column_name = 'updated_at') THEN
        ALTER TABLE bacara_task RENAME COLUMN updated_at TO "updatedAt";
    END IF;
    
    RAISE NOTICE 'Updated bacara_task column names';
END $$;

-- Step 5: Create indexes to match BusinessAnalyst model
CREATE INDEX IF NOT EXISTS idx_bacara_project_id ON bacara("projectId");
CREATE INDEX IF NOT EXISTS idx_bacara_project_nama ON bacara("projectId", nama);
CREATE INDEX IF NOT EXISTS idx_bacara_project_type ON bacara("projectId", type);
CREATE INDEX IF NOT EXISTS idx_bacara_type ON bacara(type);

-- Step 6: Update foreign key constraints
DO $$
BEGIN
    -- Drop existing constraints if they exist
    BEGIN
        ALTER TABLE bacara_module DROP CONSTRAINT IF EXISTS bacara_module_baId_fkey;
        ALTER TABLE bacara_module DROP CONSTRAINT IF EXISTS bacara_module_parentId_fkey;
        ALTER TABLE bacara_task DROP CONSTRAINT IF EXISTS bacara_task_moduleId_fkey;
    EXCEPTION WHEN OTHERS THEN
        NULL; -- Ignore errors if constraints don't exist
    END;
    
    -- Add new constraints with correct column names
    ALTER TABLE bacara_module 
    ADD CONSTRAINT bacara_module_baId_fkey 
    FOREIGN KEY ("baId") REFERENCES bacara(id) ON DELETE CASCADE;
    
    ALTER TABLE bacara_module 
    ADD CONSTRAINT bacara_module_parentId_fkey 
    FOREIGN KEY ("parentId") REFERENCES bacara_module(id) ON DELETE CASCADE;
    
    ALTER TABLE bacara_task 
    ADD CONSTRAINT bacara_task_moduleId_fkey 
    FOREIGN KEY ("moduleId") REFERENCES bacara_module(id) ON DELETE CASCADE;
    
    RAISE NOTICE 'Updated foreign key constraints';
END $$;

-- Step 7: Verify the final structure
SELECT 'Final bacara table structure:' AS info;
SELECT column_name, data_type, udt_name, column_default, is_nullable
FROM information_schema.columns 
WHERE table_name = 'bacara' 
ORDER BY ordinal_position;

SELECT 'Setup completed successfully!' AS status;