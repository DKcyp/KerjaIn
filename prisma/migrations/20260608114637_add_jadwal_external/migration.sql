-- Add jadwal_external column to bacara_task
ALTER TABLE "bacara_task" ADD COLUMN IF NOT EXISTS "jadwal_external" TIMESTAMP(6);

-- Add index for jadwal_external
CREATE INDEX IF NOT EXISTS idx_bacara_task_jadwal_external ON "bacara_task"("jadwal_external");
