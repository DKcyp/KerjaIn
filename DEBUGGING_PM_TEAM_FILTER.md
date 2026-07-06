# Debugging PM Team Filter Issue

## Problem
PM account is not seeing filtered team members in the KPI Tim section of the dashboard.

## Steps to Debug

### 1. Check Database Structure

Run these SQL queries to verify the data:

```sql
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
```

### 2. Test the Debug API Endpoint

1. Login as PM
2. Visit: `http://your-app-url/api/master-team/debug-teams`
3. Check the JSON response for:
   - `currentUser`: Your PM user info
   - `userTeams`: Teams where you're a member
   - `programmersInMyTeams`: Programmers in those teams
   - `allTeamsInSystem`: All teams and their members

### 3. Check Browser Console

1. Open browser DevTools (F12)
2. Go to Console tab
3. Look for logs starting with:
   - `📊 [PM Dashboard]`
   - `[my-team-members]`

### 4. Check Server Logs

Look for these log messages:
- `[my-team-members] User role: PM, User ID: X`
- `[my-team-members] PM found in X teams: [...]`
- `[my-team-members] Found X unique programmers in PM's teams`

### 5. Verify Session

Check if the PM's user ID in the session matches the pegawai_id in master_team_member:

```sql
-- Replace <PM_USER_ID> with the actual user ID from session
SELECT * FROM master_team_member WHERE pegawai_id = <PM_USER_ID>;
```

## Common Issues

### Issue 1: PM not added to master_team_member
**Solution**: Add PM to a team via the Master Team page

### Issue 2: Team is not active
**Solution**: Check `is_active` column in `master_team` table

### Issue 3: Programmers not added to team
**Solution**: Add programmers to the same team as the PM

### Issue 4: Session user ID doesn't match pegawai ID
**Solution**: Check the auth system and ensure user IDs are consistent

## Quick Fix SQL

If you need to manually add PM and programmers to a team:

```sql
-- Create a team (if not exists)
INSERT INTO master_team (nama, deskripsi, type, is_active, created_at, updated_at)
VALUES ('Team Alpha', 'Development Team', 'PRODUCT', true, NOW(), NOW())
RETURNING id;

-- Add PM to team (replace <TEAM_ID> and <PM_PEGAWAI_ID>)
INSERT INTO master_team_member (team_id, pegawai_id, role, created_at, updated_at)
VALUES (<TEAM_ID>, <PM_PEGAWAI_ID>, 'pm', NOW(), NOW())
ON CONFLICT (team_id, pegawai_id) DO NOTHING;

-- Add programmers to team (replace <TEAM_ID> and <PROGRAMMER_PEGAWAI_ID>)
INSERT INTO master_team_member (team_id, pegawai_id, role, created_at, updated_at)
VALUES 
  (<TEAM_ID>, <PROGRAMMER_1_ID>, 'member', NOW(), NOW()),
  (<TEAM_ID>, <PROGRAMMER_2_ID>, 'member', NOW(), NOW())
ON CONFLICT (team_id, pegawai_id) DO NOTHING;
```

## Testing the Fix

1. Clear browser cache and cookies
2. Login as PM
3. Go to dashboard
4. Check "KPI Tim" section
5. Should only show programmers from PM's teams
