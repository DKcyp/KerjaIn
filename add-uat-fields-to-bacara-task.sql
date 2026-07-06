-- Add UAT approval fields to bacara_task (the renamed/canonical table)
ALTER TABLE "bacara_task" ADD COLUMN IF NOT EXISTS "uatApproved" BOOLEAN DEFAULT false;
ALTER TABLE "bacara_task" ADD COLUMN IF NOT EXISTS "uatApprovedAt" TIMESTAMP;
ALTER TABLE "bacara_task" ADD COLUMN IF NOT EXISTS "uatApprovedBy" INTEGER;

ALTER TABLE "bacara_task" ADD COLUMN IF NOT EXISTS "uatExternalApproved" BOOLEAN DEFAULT false;
ALTER TABLE "bacara_task" ADD COLUMN IF NOT EXISTS "uatExternalApprovedAt" TIMESTAMP;
ALTER TABLE "bacara_task" ADD COLUMN IF NOT EXISTS "uatExternalApprovedBy" INTEGER;

CREATE INDEX IF NOT EXISTS "idx_bacara_task_uat_approved" ON "bacara_task"("uatApproved");
CREATE INDEX IF NOT EXISTS "idx_bacara_task_uat_external_approved" ON "bacara_task"("uatExternalApproved");
