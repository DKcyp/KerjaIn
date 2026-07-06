-- Add totalStartStopMinutes column to tasklist_log table
ALTER TABLE "tasklist_log" ADD COLUMN "totalStartStopMinutes" INTEGER DEFAULT 0;

-- Create index for faster queries
CREATE INDEX "tasklist_log_totalStartStopMinutes_idx" ON "tasklist_log"("taskId", "totalStartStopMinutes");
