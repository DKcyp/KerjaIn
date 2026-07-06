-- Add version column to tasklist table
ALTER TABLE tasklist 
ADD COLUMN IF NOT EXISTS version VARCHAR(50) DEFAULT '0.0.1';

-- Add index for version column
CREATE INDEX IF NOT EXISTS idx_tasklist_version ON tasklist(version);

-- Add ba_version column to tasklist table (to track which BA version this task came from)
ALTER TABLE tasklist 
ADD COLUMN IF NOT EXISTS ba_version VARCHAR(50) DEFAULT '0.0.1';

-- Add index for ba_version column
CREATE INDEX IF NOT EXISTS idx_tasklist_ba_version ON tasklist(ba_version);

COMMENT ON COLUMN tasklist.version IS 'Version of the task itself';
COMMENT ON COLUMN tasklist.ba_version IS 'Version of the BA (Business Analyst) that this task was approved from';
