-- Migration: Add is_nonaktif and id_blueprint_baru to bacara table
ALTER TABLE "bacara" ADD COLUMN IF NOT EXISTS "is_nonaktif" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "bacara" ADD COLUMN IF NOT EXISTS "id_blueprint_baru" INTEGER;
