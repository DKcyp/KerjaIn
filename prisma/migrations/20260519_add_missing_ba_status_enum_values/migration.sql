-- Migration: Add missing BAStatus enum values that exist in DB but not in schema
-- APPROVED and MENUNGGU_APPROVAL were used in application code but missing from enum definition

ALTER TYPE "BAStatus" ADD VALUE IF NOT EXISTS 'APPROVED';
ALTER TYPE "BAStatus" ADD VALUE IF NOT EXISTS 'MENUNGGU_APPROVAL';
