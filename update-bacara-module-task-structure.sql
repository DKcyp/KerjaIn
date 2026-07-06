-- Step 1: Update bacara_module table structure to match BAModule model
DO $$
BEGIN
    -- Rename columns to match Prisma field mappings
    -- Note: We need to check if columns exist with old names and rename them
    
    -- Rename project_id to projectId if it exists
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'bacara_module' AND column_name = 'project_id'
    ) THEN
        ALTER TABLE bacara_module RENAME COLUMN project_id TO "projectId";
        RAISE NOTICE 'Renamed project_id to projectId in bacara_module';
    END IF;
    
    -- Rename ba_id to baId if it exists
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'bacara_module' AND column_name = 'ba_id'
    ) THEN
        ALTER TABLE bacara_module RENAME COLUMN ba_id TO "baId";
        RAISE NOTICE 'Renamed ba_id to baId in bacara_module';
    END IF;
    
    -- Rename parent_id to parentId if it exists
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'bacara_module' AND column_name = 'parent_id'
    ) THEN
        ALTER TABLE bacara_module RENAME COLUMN parent_id TO "parentId";
        RAISE NOTICE 'Renamed parent_id to parentId in bacara_module';
    END IF;
    
    -- Rename created_at to createdAt if it exists
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'bacara_module' AND column_name = 'created_at'
    ) THEN
        ALTER TABLE bacara_module RENAME COLUMN created_at TO "createdAt";
        RAISE NOTICE 'Renamed created_at to createdAt in bacara_module';
    END IF;
    
    -- Rename updated_at to updatedAt if it exists
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'bacara_module' AND column_name = 'updated_at'
    ) THEN
        ALTER TABLE bacara_module RENAME COLUMN updated_at TO "updatedAt";
        RAISE NOTICE 'Renamed updated_at to updatedAt in bacara_module';
    END IF;
END $$;

-- Step 2: Update bacara_task table structure to match BATask model
DO $$
BEGIN
    -- Rename columns to match Prisma field mappings
    
    -- Rename project_id to projectId if it exists
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'bacara_task' AND column_name = 'project_id'
    ) THEN
        ALTER TABLE bacara_task RENAME COLUMN project_id TO "projectId";
        RAISE NOTICE 'Renamed project_id to projectId in bacara_task';
    END IF;
    
    -- Rename module_id to moduleId if it exists
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'bacara_task' AND column_name = 'module_id'
    ) THEN
        ALTER TABLE bacara_task RENAME COLUMN module_id TO "moduleId";
        RAISE NOTICE 'Renamed module_id to moduleId in bacara_task';
    END IF;
    
    -- Rename programmer_id to programmerId if it exists
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'bacara_task' AND column_name = 'programmer_id'
    ) THEN
        ALTER TABLE bacara_task RENAME COLUMN programmer_id TO "programmerId";
        RAISE NOTICE 'Renamed programmer_id to programmerId in bacara_task';
    END IF;
    
    -- Rename created_at to createdAt if it exists
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'bacara_task' AND column_name = 'created_at'
    ) THEN
        ALTER TABLE bacara_task RENAME COLUMN created_at TO "createdAt";
        RAISE NOTICE 'Renamed created_at to createdAt in bacara_task';
    END IF;
    
    -- Rename updated_at to updatedAt if it exists
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'bacara_task' AND column_name = 'updated_at'
    ) THEN
        ALTER TABLE bacara_task RENAME COLUMN updated_at TO "updatedAt";
        RAISE NOTICE 'Renamed updated_at to updatedAt in bacara_task';
    END IF;
END $$;

-- Step 3: Update foreign key constraints to match new column names
DO $$
BEGIN
    -- Drop old foreign key constraints if they exist
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'bacara_module_baId_fkey'
    ) THEN
        ALTER TABLE bacara_module DROP CONSTRAINT bacara_module_baId_fkey;
    END IF;
    
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'bacara_task_moduleId_fkey'
    ) THEN
        ALTER TABLE bacara_task DROP CONSTRAINT bacara_task_moduleId_fkey;
    END IF;
    
    -- Add new foreign key constraints
    ALTER TABLE bacara_module 
    ADD CONSTRAINT bacara_module_baId_fkey 
    FOREIGN KEY ("baId") REFERENCES bacara(id) ON DELETE CASCADE;
    
    ALTER TABLE bacara_task 
    ADD CONSTRAINT bacara_task_moduleId_fkey 
    FOREIGN KEY ("moduleId") REFERENCES bacara_module(id) ON DELETE CASCADE;
    
    RAISE NOTICE 'Updated foreign key constraints';
END $$;

-- Step 4: Verify the updated structure
SELECT 'Updated bacara_module structure:' AS info;
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'bacara_module' 
ORDER BY ordinal_position;

SELECT 'Updated bacara_task structure:' AS info;
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'bacara_task' 
ORDER BY ordinal_position;