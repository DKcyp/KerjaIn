-- Migration: Change version and ba_version from INTEGER to VARCHAR
-- Date: 2026-03-11

-- Change version column to VARCHAR
ALTER TABLE proyek_module 
ALTER COLUMN version TYPE VARCHAR(20);

-- Change ba_version column to VARCHAR
ALTER TABLE proyek_module 
ALTER COLUMN ba_version TYPE VARCHAR(20);

-- Update existing data to semantic versioning format
UPDATE proyek_module 
SET version = '0.0.' || version::text 
WHERE version::text !~ '^\d+\.\d+\.\d+$';

UPDATE proyek_module 
SET ba_version = '0.0.' || ba_version::text 
WHERE ba_version::text !~ '^\d+\.\d+\.\d+$';

-- Add comment
COMMENT ON COLUMN proyek_module.version IS 'Semantic version of the module (e.g., 0.0.1, 1.2.3)';
COMMENT ON COLUMN proyek_module.ba_version IS 'Semantic version of the BA document (e.g., 0.0.1, 1.2.3)';
