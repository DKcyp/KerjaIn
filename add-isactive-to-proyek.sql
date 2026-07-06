-- Add isActive column to proyek table
ALTER TABLE proyek ADD COLUMN is_active BOOLEAN DEFAULT true NOT NULL;

-- Set all existing projects to active
UPDATE proyek SET is_active = true WHERE is_active IS NULL;
