-- Migration: Add revisi fields to bacara_task table
ALTER TABLE "bacara_task" ADD COLUMN IF NOT EXISTS "revisi_keterangan" TEXT;
ALTER TABLE "bacara_task" ADD COLUMN IF NOT EXISTS "revisi_file_url" TEXT;
ALTER TABLE "bacara_task" ADD COLUMN IF NOT EXISTS "revisi_at" TIMESTAMP(6);
ALTER TABLE "bacara_task" ADD COLUMN IF NOT EXISTS "revisi_by" INTEGER;
