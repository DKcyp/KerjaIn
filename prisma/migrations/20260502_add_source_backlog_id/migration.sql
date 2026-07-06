-- Add source_backlog_id column to tasklist table
ALTER TABLE "tasklist" ADD COLUMN "source_backlog_id" INTEGER;

-- Create index for source_backlog_id
CREATE INDEX "idx_tasklist_source_backlog_id" ON "tasklist"("source_backlog_id");
