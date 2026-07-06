-- Add durasi_pengerjaan column to bacara_task
ALTER TABLE "bacara_task" ADD COLUMN IF NOT EXISTS "durasi_pengerjaan" DECIMAL(6,2);
