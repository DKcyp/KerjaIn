-- Add extra_files column to tasklist_chat table
-- Stores additional file attachments as JSON array for multi-image chat messages
ALTER TABLE tasklist_chat
ADD COLUMN IF NOT EXISTS extra_files JSONB DEFAULT '[]'::jsonb;

-- Add source column to tasklist_chat table
-- Distinguishes between regular chat ("chat") and action notes ("reject", "approve", "kirim_review", "mulai", "pause", "kembalikan", "action_note")
ALTER TABLE tasklist_chat
ADD COLUMN IF NOT EXISTS source VARCHAR(20) DEFAULT 'chat';

-- Add comments to columns for documentation
COMMENT ON COLUMN tasklist_chat.extra_files IS 'Additional file attachments stored as JSON array for multi-image chat messages';
COMMENT ON COLUMN tasklist_chat.source IS 'Source of the chat message: chat | reject | approve | kirim_review | mulai | pause | kembalikan | action_note';
