-- Insert sample team data
-- Run this after creating the tables

-- Insert root teams
INSERT INTO master_team (nama, deskripsi, type, parent_id, is_active) VALUES
('Managed Service', 'Tim yang mengelola layanan managed service untuk klien', 'MANAGED_SERVICE', NULL, true),
('Product', 'Tim pengembangan produk internal perusahaan', 'PRODUCT', NULL, true),
('Project', 'Tim yang menangani proyek-proyek klien', 'PROJECT', NULL, true);

-- Insert sub-teams (get parent IDs from above)
INSERT INTO master_team (nama, deskripsi, type, parent_id, is_active) VALUES
('Infrastruktur', 'Pengelolaan infrastruktur server dan cloud', 'MANAGED_SERVICE', 
  (SELECT id FROM master_team WHERE nama = 'Managed Service'), true),
('Support & Monitoring', 'Tim support dan monitoring 24/7', 'MANAGED_SERVICE', 
  (SELECT id FROM master_team WHERE nama = 'Managed Service'), true),
('RichzLog', 'Platform logging dan monitoring aktivitas sistem', 'PRODUCT', 
  (SELECT id FROM master_team WHERE nama = 'Product'), true),
('RichzSpot', 'Aplikasi manajemen hotspot dan jaringan', 'PRODUCT', 
  (SELECT id FROM master_team WHERE nama = 'Product'), true),
('Project Alpha', 'Tim proyek untuk klien enterprise', 'PROJECT', 
  (SELECT id FROM master_team WHERE nama = 'Project'), true),
('Project Beta', 'Tim proyek untuk klien SMB', 'PROJECT', 
  (SELECT id FROM master_team WHERE nama = 'Project'), false);

-- Insert team members (assuming some pegawai exist)
-- Get first few pegawai IDs
INSERT INTO master_team_member (team_id, pegawai_id, role) 
SELECT 
  (SELECT id FROM master_team WHERE nama = 'Managed Service'),
  p.id,
  CASE 
    WHEN ROW_NUMBER() OVER (ORDER BY p.id) = 1 THEN 'Team Lead'
    WHEN ROW_NUMBER() OVER (ORDER BY p.id) = 2 THEN 'DevOps Engineer'
    WHEN ROW_NUMBER() OVER (ORDER BY p.id) = 3 THEN 'System Administrator'
    ELSE 'Network Engineer'
  END
FROM pegawai p 
WHERE p.id <= 4
LIMIT 4;

INSERT INTO master_team_member (team_id, pegawai_id, role) 
SELECT 
  (SELECT id FROM master_team WHERE nama = 'Infrastruktur'),
  p.id,
  CASE 
    WHEN ROW_NUMBER() OVER (ORDER BY p.id) = 1 THEN 'System Administrator'
    WHEN ROW_NUMBER() OVER (ORDER BY p.id) = 2 THEN 'Network Engineer'
    ELSE 'Cloud Engineer'
  END
FROM pegawai p 
WHERE p.id BETWEEN 3 AND 5
LIMIT 3;

INSERT INTO master_team_member (team_id, pegawai_id, role) 
SELECT 
  (SELECT id FROM master_team WHERE nama = 'Support & Monitoring'),
  p.id,
  CASE 
    WHEN ROW_NUMBER() OVER (ORDER BY p.id) = 1 THEN 'DevOps Engineer'
    WHEN ROW_NUMBER() OVER (ORDER BY p.id) = 2 THEN 'Support Engineer'
    ELSE 'Monitoring Specialist'
  END
FROM pegawai p 
WHERE p.id BETWEEN 2 AND 4
LIMIT 3;

INSERT INTO master_team_member (team_id, pegawai_id, role) 
SELECT 
  (SELECT id FROM master_team WHERE nama = 'Product'),
  p.id,
  CASE 
    WHEN ROW_NUMBER() OVER (ORDER BY p.id) = 1 THEN 'Product Manager'
    WHEN ROW_NUMBER() OVER (ORDER BY p.id) = 2 THEN 'UI/UX Designer'
    WHEN ROW_NUMBER() OVER (ORDER BY p.id) = 3 THEN 'Frontend Developer'
    WHEN ROW_NUMBER() OVER (ORDER BY p.id) = 4 THEN 'Backend Developer'
    ELSE 'QA Engineer'
  END
FROM pegawai p 
WHERE p.id BETWEEN 8 AND 12
LIMIT 5;

INSERT INTO master_team_member (team_id, pegawai_id, role) 
SELECT 
  (SELECT id FROM master_team WHERE nama = 'RichzLog'),
  p.id,
  CASE 
    WHEN ROW_NUMBER() OVER (ORDER BY p.id) = 1 THEN 'Frontend Developer'
    WHEN ROW_NUMBER() OVER (ORDER BY p.id) = 2 THEN 'Backend Developer'
    ELSE 'QA Engineer'
  END
FROM pegawai p 
WHERE p.id BETWEEN 10 AND 12
LIMIT 3;

INSERT INTO master_team_member (team_id, pegawai_id, role) 
SELECT 
  (SELECT id FROM master_team WHERE nama = 'RichzSpot'),
  p.id,
  CASE 
    WHEN ROW_NUMBER() OVER (ORDER BY p.id) = 1 THEN 'Product Manager'
    WHEN ROW_NUMBER() OVER (ORDER BY p.id) = 2 THEN 'UI/UX Designer'
    WHEN ROW_NUMBER() OVER (ORDER BY p.id) = 3 THEN 'Frontend Developer'
    ELSE 'Backend Developer'
  END
FROM pegawai p 
WHERE p.id BETWEEN 8 AND 11
LIMIT 4;

-- Create some sample project groups
INSERT INTO project_group (nama, deskripsi, team_id) VALUES
('RichzSpot', 'Grup produk RichzSpot — Web & Mobile digabung', 
  (SELECT id FROM master_team WHERE nama = 'RichzSpot')),
('RichzLog', 'Grup produk RichzLog', 
  (SELECT id FROM master_team WHERE nama = 'RichzLog'));

-- Link some projects to groups (if projects exist)
-- This assumes you have some projects in the proyek table
-- Adjust project IDs as needed
INSERT INTO project_group_item (group_id, project_id)
SELECT 
  (SELECT id FROM project_group WHERE nama = 'RichzSpot'),
  p.id
FROM proyek p 
WHERE p.nama_proyek ILIKE '%richz%' OR p.kode_proyek ILIKE '%RS%'
LIMIT 2;

INSERT INTO project_group_item (group_id, project_id)
SELECT 
  (SELECT id FROM project_group WHERE nama = 'RichzLog'),
  p.id
FROM proyek p 
WHERE p.nama_proyek ILIKE '%log%' OR p.kode_proyek ILIKE '%RL%'
LIMIT 2;