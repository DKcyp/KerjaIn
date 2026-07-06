-- Fix missing dep_id column in tasklist table
-- This adds the column if it doesn't exist

-- Check if column exists, if not add it
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'tasklist' 
        AND column_name = 'dep_id'
    ) THEN
        ALTER TABLE tasklist ADD COLUMN dep_id INTEGER;
        
        -- Add index as defined in schema
        CREATE INDEX IF NOT EXISTS idx_tasklist_dep_id ON tasklist(dep_id);
        
        RAISE NOTICE 'Column dep_id added to tasklist table';
    ELSE
        RAISE NOTICE 'Column dep_id already exists in tasklist table';
    END IF;
END $$;

-- Verify the column was added
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'tasklist' 
AND column_name = 'dep_id';
