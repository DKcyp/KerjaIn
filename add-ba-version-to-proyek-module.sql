-- Migration: Add BA and version fields to proyek_module table
-- Date: 2026-03-11

-- Add ba column (Business Analyst name)
ALTER TABLE proyek_module 
ADD COLUMN IF NOT EXISTS ba VARCHAR(255);

-- Add ba_version column (BA version number)
ALTER TABLE proyek_module 
ADD COLUMN IF NOT EXISTS ba_version INTEGER DEFAULT 1 NOT NULL;

-- Add version column (Module version number)
ALTER TABLE proyek_module 
ADD COLUMN IF NOT EXISTS version INTEGER DEFAULT 1 NOT NULL;

-- Add comment to columns
COMMENT ON COLUMN proyek_module.ba IS 'Business Analyst name for this module';
COMMENT ON COLUMN proyek_module.ba_version IS 'Version number of the BA document';
COMMENT ON COLUMN proyek_module.version IS 'Version number of the module';

-- Update existing records to have default version 1
UPDATE proyek_module 
SET ba_version = 1, version = 1 
WHERE ba_version IS NULL OR version IS NULL;
