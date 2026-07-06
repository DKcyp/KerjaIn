-- Add UAT approval fields to ba_task table
ALTER TABLE "ba_task" ADD COLUMN IF NOT EXISTS "uatApproved" BOOLEAN DEFAULT false;
ALTER TABLE "ba_task" ADD COLUMN IF NOT EXISTS "uatApprovedAt" TIMESTAMP;
ALTER TABLE "ba_task" ADD COLUMN IF NOT EXISTS "uatApprovedBy" INTEGER;

-- Add index for UAT queries
CREATE INDEX IF NOT EXISTS "idx_ba_task_uat_approved" ON "ba_task"("uatApproved");
