-- Add extra_files column to tasklist_chat table
-- Stores additional file attachments as JSON array for multi-image chat messages
ALTER TABLE tasklist_chat
ADD COLUMN IF NOT EXISTS extra_files JSONB DEFAULT '[]'::jsonb;

-- Add source column to tasklist_chat table
-- Distinguishes between regular chat ("chat") and action notes ("action_note")
ALTER TABLE tasklist_chat
ADD COLUMN IF NOT EXISTS source VARCHAR(20) DEFAULT 'chat';
