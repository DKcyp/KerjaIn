-- Add keterangan (notes) field to ba_doc table for RFC/CED/OK comments
ALTER TABLE "ba_doc" ADD COLUMN IF NOT EXISTS "keterangan" TEXT;
