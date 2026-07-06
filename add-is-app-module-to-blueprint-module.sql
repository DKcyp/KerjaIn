-- Add is_app_module column to blueprint_module table
ALTER TABLE blueprint_module 
ADD COLUMN is_app_module BOOLEAN DEFAULT FALSE;

-- Add index for better performance
CREATE INDEX idx_blueprint_module_is_app_module ON blueprint_module(is_app_module);

-- Update existing records to false (default)
UPDATE blueprint_module SET is_app_module = FALSE WHERE is_app_module IS NULL;