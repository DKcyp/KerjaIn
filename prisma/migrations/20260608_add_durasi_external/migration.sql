-- Add durasi_external column to bacara_task
ALTER TABLE "bacara_task" ADD COLUMN IF NOT EXISTS "durasi_external" DECIMAL(6,2);
