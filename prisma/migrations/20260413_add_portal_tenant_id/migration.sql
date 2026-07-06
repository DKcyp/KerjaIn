-- AlterTable
-- Add portal_tenant_id column to pegawai table for Portal V2 SSO integration
ALTER TABLE "pegawai" ADD COLUMN IF NOT EXISTS "portal_tenant_id" TEXT;

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS "idx_pegawai_portal_tenant_id" ON "pegawai"("portal_tenant_id");
