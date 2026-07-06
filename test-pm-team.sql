-- Check if PM exists in master_team_member
SELECT 
    mtm.id,
    mtm.team_id,
    mtm.pegawai_id,
    mtm.role as member_role,
    p.nama_lengkap,
    p.role as pegawai_role,
    mt.nama as team_name
FROM master_team_member mtm
JOIN pegawai p ON mtm.pegawai_id = p.id
JOIN master_team mt ON mtm.team_id = mt.id
WHERE p.role = 'PM'
ORDER BY p.nama_lengkap, mt.nama;

-- Check programmers in teams
SELECT 
    mt.id as team_id,
    mt.nama as team_name,
    COUNT(CASE WHEN p.role = 'PM' THEN 1 END) as pm_count,
    COUNT(CASE WHEN p.role = 'PROGRAMMER' THEN 1 END) as programmer_count,
    STRING_AGG(CASE WHEN p.role = 'PM' THEN p.nama_lengkap END, ', ') as pms,
    STRING_AGG(CASE WHEN p.role = 'PROGRAMMER' THEN p.nama_lengkap END, ', ') as programmers
FROM master_team mt
LEFT JOIN master_team_member mtm ON mt.id = mtm.team_id
LEFT JOIN pegawai p ON mtm.pegawai_id = p.id
WHERE mt.is_active = true
GROUP BY mt.id, mt.nama
ORDER BY mt.nama;

-- Check specific PM's teams and their programmers
-- Replace <PM_ID> with actual PM pegawai ID
/*
SELECT 
    mt.id as team_id,
    mt.nama as team_name,
    p.id as programmer_id,
    p.nama_lengkap as programmer_name
FROM master_team_member mtm_pm
JOIN master_team mt ON mtm_pm.team_id = mt.id
JOIN master_team_member mtm_prog ON mt.id = mtm_prog.team_id
JOIN pegawai p ON mtm_prog.pegawai_id = p.id
WHERE mtm_pm.pegawai_id = <PM_ID>  -- Replace with actual PM ID
  AND p.role = 'PROGRAMMER'
  AND p.is_active = true
  AND mt.is_active = true
ORDER BY mt.nama, p.nama_lengkap;
*/
