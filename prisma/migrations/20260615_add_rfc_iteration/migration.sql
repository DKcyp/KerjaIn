-- Migration: Add iteration column to ba_detail_rfc for tracking RFC rounds
ALTER TABLE "ba_detail_rfc" ADD COLUMN IF NOT EXISTS "iteration" INTEGER NOT NULL DEFAULT 1;

-- Add rfcCount to bacara for tracking total RFC submissions
ALTER TABLE "bacara" ADD COLUMN IF NOT EXISTS "rfc_count" INTEGER NOT NULL DEFAULT 0;
