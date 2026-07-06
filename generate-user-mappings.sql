-- Generate User Mappings for Bulk Linking
-- This helps you create the mapping between Logbook and Portal users

-- Step 1: Export Logbook users
SELECT 
  id as logbook_id,
  username,
  "namaLengkap" as nama_lengkap,
  sso_user_id,
  CASE 
    WHEN sso_user_id IS NOT NULL THEN 'Already Linked'
    ELSE 'Not Linked'
  END as status
FROM pegawai
ORDER BY id;

-- Step 2: Find users that need linking
SELECT 
  id as logbook_id,
  username,
  "namaLengkap" as nama_lengkap,
  -- Try to guess Portal email from username
  username || '@company.com' as suggested_portal_email
FROM pegawai
WHERE sso_user_id IS NULL
ORDER BY id;

-- Step 3: After you have Portal user IDs, link them directly in SQL (alternative to API)
-- UPDATE pegawai SET sso_user_id = 'portal-user-id', portal_tenant_id = 'tenant-id' WHERE id = 1;

-- Example bulk update (update these values):
/*
UPDATE pegawai SET sso_user_id = 'portal-user-id-1', portal_tenant_id = 'tenant-id-1' WHERE id = 1;
UPDATE pegawai SET sso_user_id = 'portal-user-id-2', portal_tenant_id = 'tenant-id-1' WHERE id = 2;
UPDATE pegawai SET sso_user_id = 'portal-user-id-3', portal_tenant_id = 'tenant-id-1' WHERE id = 3;
*/

-- Step 4: Verify the links
SELECT 
  id,
  username,
  "namaLengkap",
  sso_user_id,
  portal_tenant_id,
  CASE 
    WHEN sso_user_id IS NOT NULL THEN '✅ Linked'
    ELSE '❌ Not Linked'
  END as status
FROM pegawai
ORDER BY id;

-- Step 5: Count linked vs unlinked
SELECT 
  COUNT(*) as total_users,
  COUNT(sso_user_id) as linked_users,
  COUNT(*) - COUNT(sso_user_id) as unlinked_users,
  ROUND(COUNT(sso_user_id)::numeric / COUNT(*)::numeric * 100, 2) as link_percentage
FROM pegawai;
