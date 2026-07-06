-- Migration to add SSO fields to pegawai table
-- Run this SQL script on your PostgreSQL database

ALTER TABLE pegawai 
ADD COLUMN IF NOT EXISTS "ssoAccessToken" TEXT,
ADD COLUMN IF NOT EXISTS "ssoRefreshToken" TEXT,
ADD COLUMN IF NOT EXISTS "ssoTokenExpiry" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS "ssoUserId" TEXT,
ADD COLUMN IF NOT EXISTS "ssoRoleId" TEXT,
ADD COLUMN IF NOT EXISTS "ssoCompanyId" TEXT;

-- Add comments for documentation
COMMENT ON COLUMN pegawai."ssoAccessToken" IS 'SSO access token (encrypted)';
COMMENT ON COLUMN pegawai."ssoRefreshToken" IS 'SSO refresh token (encrypted)';
COMMENT ON COLUMN pegawai."ssoTokenExpiry" IS 'SSO token expiry timestamp';
COMMENT ON COLUMN pegawai."ssoUserId" IS 'SSO user identifier';
COMMENT ON COLUMN pegawai."ssoRoleId" IS 'SSO role identifier';
COMMENT ON COLUMN pegawai."ssoCompanyId" IS 'SSO company identifier';
