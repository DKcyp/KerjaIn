# Quick Test Guide for PM Team Filtering

## Step 1: Test the Debug Endpoint

1. Login to your app as PM: https://log-trial.richz.id
2. Open browser DevTools (F12)
3. Go to Console tab
4. Copy and paste this code:

```javascript
fetch('/api/master-team/debug-teams', {
  credentials: 'include',
  headers: { 'Content-Type': 'application/json' }
})
.then(r => r.json())
.then(data => {
  console.log('=== DEBUG RESULTS ===');
  console.log('Current User:', data.debug?.currentUser);
  console.log('User Teams:', data.debug?.userTeams);
  console.log('Programmers in My Teams:', data.debug?.programmersInMyTeams);
  console.log('All Teams in System:', data.debug?.allTeamsInSystem);
});
```

## Step 2: Test the Team Members Endpoint

In the same console, run:

```javascript
fetch('/api/master-team/my-team-members', {
  credentials: 'include',
  headers: { 'Content-Type': 'application/json' }
})
.then(r => r.json())
.then(data => {
  console.log('=== TEAM MEMBERS RESULTS ===');
  console.log('Success:', data.success);
  console.log('Team Members:', data.items);
  console.log('Message:', data.message);
});
```

## Step 3: Check Network Tab

1. Go to Network tab in DevTools
2. Refresh the dashboard page
3. Look for request: `my-team-members`
4. Click on it and check:
   - Status code (should be 200)
   - Response data
   - Request headers

## Expected Results

### If PM is in a team:
- `userTeams` should show the team(s)
- `programmersInMyTeams` should show programmers from those teams
- `items` in my-team-members should match the programmers

### If PM is NOT in any team:
- `userTeams` will be empty `[]`
- `programmersInMyTeams` will be empty `[]`
- `message` will say "PM tidak terdaftar di tim manapun"

## Step 4: If PM is Not in Any Team

Run this SQL to add PM to a team:

```sql
-- Find PM's ID
SELECT id, nama_lengkap, role FROM pegawai WHERE role = 'PM';

-- Find or create a team
SELECT id, nama FROM master_team WHERE is_active = true;

-- Add PM to team (replace IDs)
INSERT INTO master_team_member (team_id, pegawai_id, role, created_at, updated_at)
VALUES (1, <PM_PEGAWAI_ID>, 'pm', NOW(), NOW())
ON CONFLICT (team_id, pegawai_id) DO NOTHING;

-- Add programmers to same team
INSERT INTO master_team_member (team_id, pegawai_id, role, created_at, updated_at)
SELECT 1, id, 'member', NOW(), NOW()
FROM pegawai 
WHERE role = 'PROGRAMMER'
ON CONFLICT (team_id, pegawai_id) DO NOTHING;
```

## Step 5: Verify the Fix

After adding PM to a team:
1. Refresh the dashboard
2. Check "KPI Tim" section
3. Should only show programmers from PM's team(s)

---

## Troubleshooting

### Error: 500 Internal Server Error
- Check server logs for Prisma errors
- Verify database schema matches Prisma schema

### Error: Unauthorized
- Check if you're logged in
- Verify session cookie exists

### Empty team members but PM is in a team
- Check if programmers are added to the same team
- Verify team is active (`is_active = true`)
- Check if programmers have role = 'PROGRAMMER'

---

**Need Help?**
Share the console output from Step 1 and Step 2 above.
