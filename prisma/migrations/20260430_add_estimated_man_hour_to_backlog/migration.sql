-- Add estimated_man_hour column to backlog table
ALTER TABLE "backlog" ADD COLUMN "estimated_man_hour" DECIMAL(8, 2);

-- Create index for estimated_man_hour
CREATE INDEX "idx_backlog_estimated_man_hour" ON "backlog"("estimated_man_hour");
