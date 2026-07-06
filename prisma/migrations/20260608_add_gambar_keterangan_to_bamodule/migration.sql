-- Add gambar (image) and keterangan (description) fields to bacara_module
ALTER TABLE "bacara_module" ADD COLUMN IF NOT EXISTS "gambar" TEXT;
ALTER TABLE "bacara_module" ADD COLUMN IF NOT EXISTS "keterangan" TEXT;
