-- Add all missing fields to tasklist table
-- This script adds SLA deadline fields, time tracking fields, and other missing columns

BEGIN;

-- Add SLA deadline fields (from SLA monitoring system)
ALTER TABLE tasklist ADD COLUMN IF NOT EXISTS assigneeStartTaskDeadline TIMESTAMP NULL;
ALTER TABLE tasklist ADD COLUMN IF NOT EXISTS assigneeWorkDeadline TIMESTAMP NULL;
ALTER TABLE tasklist ADD COLUMN IF NOT EXISTS pmReviewDeadline TIMESTAMP NULL;

-- Add calculated due date field
ALTER TABLE tasklist ADD COLUMN IF NOT EXISTS calculatedDueDate TIMESTAMP NULL;

-- Add task complexity field (uses SlaType enum: EASY, MEDIUM, HARD)
DO $$ 
BEGIN
    -- Check if SlaType enum exists, create if not
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'SlaType') THEN
        CREATE TYPE "SlaType" AS ENUM ('EASY', 'MEDIUM', 'HARD');
    END IF;
END $$;

ALTER TABLE tasklist ADD COLUMN IF NOT EXISTS taskComplexity "SlaType" DEFAULT 'MEDIUM';

-- Add time tracking fields (from task time tracking system)
ALTER TABLE tasklist ADD COLUMN IF NOT EXISTS started_at TIMESTAMP NULL;
ALTER TABLE tasklist ADD COLUMN IF NOT EXISTS paused_at TIMESTAMP NULL;
ALTER TABLE tasklist ADD COLUMN IF NOT EXISTS total_duration_minutes INTEGER DEFAULT 0;
ALTER TABLE tasklist ADD COLUMN IF NOT EXISTS is_paused BOOLEAN DEFAULT FALSE;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_tasklist_assigneeStartTaskDeadline ON tasklist(assigneeStartTaskDeadline);
CREATE INDEX IF NOT EXISTS idx_tasklist_assigneeWorkDeadline ON tasklist(assigneeWorkDeadline);
CREATE INDEX IF NOT EXISTS idx_tasklist_pmReviewDeadline ON tasklist(pmReviewDeadline);
CREATE INDEX IF NOT EXISTS idx_tasklist_calculatedDueDate ON tasklist(calculatedDueDate);
CREATE INDEX IF NOT EXISTS idx_tasklist_taskComplexity ON tasklist(taskComplexity);
CREATE INDEX IF NOT EXISTS idx_tasklist_started_at ON tasklist(started_at);
CREATE INDEX IF NOT EXISTS idx_tasklist_is_paused ON tasklist(is_paused);

-- Add comments for documentation
COMMENT ON COLUMN tasklist.assigneeStartTaskDeadline IS 'Deadline for assignee to start working on the task';
COMMENT ON COLUMN tasklist.assigneeWorkDeadline IS 'Deadline for assignee to complete the task work';
COMMENT ON COLUMN tasklist.pmReviewDeadline IS 'Deadline for PM to review the completed task';
COMMENT ON COLUMN tasklist.calculatedDueDate IS 'Calculated due date based on task complexity and schedule';
COMMENT ON COLUMN tasklist.taskComplexity IS 'Task complexity level (EASY, MEDIUM, HARD) for SLA calculations';
COMMENT ON COLUMN tasklist.started_at IS 'Timestamp when task was last started/resumed';
COMMENT ON COLUMN tasklist.paused_at IS 'Timestamp when task was paused';
COMMENT ON COLUMN tasklist.total_duration_minutes IS 'Total time spent on task in minutes';
COMMENT ON COLUMN tasklist.is_paused IS 'Whether task is currently paused';

COMMIT;

-- Verify the changes
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'tasklist' 
AND table_schema = 'public'
AND column_name IN (
    'assigneeStartTaskDeadline',
    'assigneeWorkDeadline', 
    'pmReviewDeadline',
    'calculatedDueDate',
    'taskComplexity',
    'started_at',
    'paused_at',
    'total_duration_minutes',
    'is_paused'
)
ORDER BY column_name;
