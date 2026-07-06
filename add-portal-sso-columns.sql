-- Migration script to add Portal V2 SSO columns to pegawai table
-- Run this manually on production database if needed

-- Add portal_tenant_id column if not exists
ALTER TABLE "pegawai" ADD COLUMN IF NOT EXISTS "portal_tenant_id" TEXT;

-- Add other SSO columns if they don't exist (safety check)
ALTER TABLE "pegawai" ADD COLUMN IF NOT EXISTS "ssoAccessToken" TEXT;
ALTER TABLE "pegawai" ADD COLUMN IF NOT EXISTS "ssoCompanyId" TEXT;
ALTER TABLE "pegawai" ADD COLUMN IF NOT EXISTS "ssoRefreshToken" TEXT;
ALTER TABLE "pegawai" ADD COLUMN IF NOT EXISTS "ssoRoleId" TEXT;
ALTER TABLE "pegawai" ADD COLUMN IF NOT EXISTS "ssoTokenExpiry" TIMESTAMP(3);
ALTER TABLE "pegawai" ADD COLUMN IF NOT EXISTS "ssoUserId" TEXT;

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS "idx_pegawai_portal_tenant_id" ON "pegawai"("portal_tenant_id");
CREATE INDEX IF NOT EXISTS "idx_pegawai_sso_user_id" ON "pegawai"("ssoUserId");

-- Verify the columns were added
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'pegawai'
  AND column_name IN ('portal_tenant_id', 'ssoAccessToken', 'ssoCompanyId', 'ssoRefreshToken', 'ssoRoleId', 'ssoTokenExpiry', 'ssoUserId')
ORDER BY column_name;
