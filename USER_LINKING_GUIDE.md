# User Linking Guide: Portal SSO ↔ Logbook

## Overview

When integrating Portal SSO with Logbook, we need to handle existing Logbook users. This guide explains how user linking works and how to manage it.

## Automatic Linking Strategies

The system uses multiple strategies to automatically link Portal users to existing Logbook users:

### Strategy 1: Already Linked (ssoUserId)
```
Portal User ID: "abc123"
Logbook User: { ssoUserId: "abc123" }
✅ Match found - User already linked
```

**Action:** Update user info from Portal (keep data in sync)

### Strategy 2: Username Match
```
Portal Email: "john.doe@company.com"
Username: "john.doe"
Logbook User: { username: "john.doe", ssoUserId: null }
✅ Match found - Link by username
```

**Action:** Link existing user to Portal by setting `ssoUserId`

### Strategy 3: Name Match (Fuzzy)
```
Portal Name: "John Doe"
Logbook Users with "John" in name: 1 user found
✅ Single match - High confidence link
```

**Action:** Link if exactly ONE user matches (avoids conflicts)

**Note:** If multiple users match, creates new user to avoid incorrect linking

### Strategy 4: Create New User
```
No matches found
✅ Create new user from Portal data
```

**Action:** Create new Logbook user with Portal information

## User Linking Flow

```
┌─────────────────────────────────────────────────────────────┐
│ Portal User Logs In                                         │
│ Email: john.doe@company.com                                 │
│ Name: John Doe                                              │
│ Portal ID: abc123                                           │
└─────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│ Strategy 1: Check ssoUserId                                 │
│ SELECT * FROM pegawai WHERE ssoUserId = 'abc123'            │
└─────────────────────────────────────────────────────────────┘
                          │
                    Found? │ Yes → Update & Login
                          │ No ↓
┌─────────────────────────────────────────────────────────────┐
│ Strategy 2: Check Username                                  │
│ SELECT * FROM pegawai WHERE username = 'john.doe'           │
│                          AND ssoUserId IS NULL              │
└─────────────────────────────────────────────────────────────┘
                          │
                    Found? │ Yes → Link & Login
                          │ No ↓
┌─────────────────────────────────────────────────────────────┐
│ Strategy 3: Check Name (Fuzzy)                              │
│ SELECT * FROM pegawai WHERE namaLengkap ILIKE '%John%'      │
│                          AND ssoUserId IS NULL              │
└─────────────────────────────────────────────────────────────┘
                          │
              Single Match? │ Yes → Link & Login
                          │ No ↓
┌─────────────────────────────────────────────────────────────┐
│ Strategy 4: Create New User                                 │
│ INSERT INTO pegawai (username, namaLengkap, ssoUserId, ...) │
└─────────────────────────────────────────────────────────────┘
                          │
                          ▼
                    Login Success
```

## Manual Linking (Admin Tool)

For cases where automatic linking doesn't work or needs correction, admins can manually link users.

### API Endpoints

#### 1. Get User Link Status
```bash
GET /api/admin/link-portal-user

Response:
{
  "users": [
    {
      "id": 1,
      "username": "john.doe",
      "namaLengkap": "John Doe",
      "role": "PROGRAMMER",
      "ssoUserId": "abc123",  // Linked
      "createdAt": "2024-01-01T00:00:00Z"
    },
    {
      "id": 2,
      "username": "jane.smith",
      "namaLengkap": "Jane Smith",
      "role": "PM",
      "ssoUserId": null,  // Not linked
      "createdAt": "2024-01-02T00:00:00Z"
    }
  ],
  "stats": {
    "total": 50,
    "linked": 35,
    "unlinked": 15
  }
}
```

#### 2. Link User to Portal
```bash
POST /api/admin/link-portal-user
Content-Type: application/json

{
  "logbookUserId": 2,
  "portalUserId": "xyz789"
}

Response:
{
  "success": true,
  "user": {
    "id": 2,
    "username": "jane.smith",
    "namaLengkap": "Jane Smith",
    "ssoUserId": "xyz789"
  }
}
```

#### 3. Unlink User from Portal
```bash
DELETE /api/admin/link-portal-user
Content-Type: application/json

{
  "logbookUserId": 2
}

Response:
{
  "success": true,
  "user": {
    "id": 2,
    "username": "jane.smith",
    "namaLengkap": "Jane Smith",
    "ssoUserId": null
  }
}
```

## Common Scenarios

### Scenario 1: Existing User, Same Username
```
Portal: john.doe@company.com
Logbook: username = "john.doe"
Result: ✅ Automatically linked
```

### Scenario 2: Existing User, Different Username
```
Portal: john.doe@company.com
Logbook: username = "jdoe"
Result: ⚠️ Creates new user (admin can manually link)
```

### Scenario 3: Multiple Users with Similar Names
```
Portal: John Doe
Logbook: 
  - John Doe (Developer)
  - John Doe (Manager)
Result: ⚠️ Creates new user (admin must manually link correct one)
```

### Scenario 4: New User
```
Portal: new.user@company.com
Logbook: No matching user
Result: ✅ Creates new user automatically
```

## Best Practices

### For Administrators

1. **Review Auto-Links**
   - Check logs after first Portal SSO deployment
   - Verify users were linked correctly
   - Use admin API to check link status

2. **Manual Linking**
   - Link users before they first login with Portal SSO
   - Prevents duplicate user creation
   - Maintains user history and data

3. **Username Convention**
   - Use email prefix as username in Logbook
   - Makes auto-linking more reliable
   - Example: `john.doe@company.com` → username: `john.doe`

4. **Migration Plan**
   ```
   1. Export Portal users list
   2. Export Logbook users list
   3. Match users by email/name
   4. Use admin API to pre-link users
   5. Enable Portal SSO
   6. Monitor first logins
   ```

### For Users

1. **First Login**
   - Use Portal SSO button
   - System will find or create your account
   - Check your profile after login

2. **If You Have Issues**
   - Contact admin
   - Provide both Portal email and Logbook username
   - Admin can manually link accounts

## Database Schema

The `ssoUserId` field in the `pegawai` table stores the Portal user ID:

```sql
-- Check linked users
SELECT 
  id,
  username,
  namaLengkap,
  ssoUserId,
  CASE 
    WHEN ssoUserId IS NOT NULL THEN 'Linked'
    ELSE 'Not Linked'
  END as status
FROM pegawai
ORDER BY namaLengkap;

-- Find unlinked users
SELECT * FROM pegawai WHERE ssoUserId IS NULL;

-- Find linked users
SELECT * FROM pegawai WHERE ssoUserId IS NOT NULL;

-- Link user manually (SQL)
UPDATE pegawai 
SET ssoUserId = 'portal-user-id-here'
WHERE id = 123;

-- Unlink user manually (SQL)
UPDATE pegawai 
SET ssoUserId = NULL
WHERE id = 123;
```

## Troubleshooting

### User Created Twice
**Problem:** User exists in Logbook but Portal SSO created new user

**Solution:**
1. Identify both user accounts
2. Use admin API to link correct account
3. Optionally delete duplicate account
4. User logs in again with Portal SSO

### Wrong User Linked
**Problem:** Portal user linked to wrong Logbook user

**Solution:**
1. Use admin API to unlink incorrect user
2. Use admin API to link correct user
3. User logs in again with Portal SSO

### User Can't Login
**Problem:** User tries Portal SSO but gets error

**Solution:**
1. Check Portal login works
2. Check Logbook logs for errors
3. Verify user exists in Portal
4. Try manual linking via admin API

## Security Considerations

1. **ssoUserId is Immutable**
   - Once linked, user is tied to Portal account
   - Prevents account hijacking
   - Admin can unlink if needed

2. **No Password for SSO Users**
   - SSO users have empty `passwordHash`
   - Can't login with regular login
   - Must use Portal SSO

3. **Role Synchronization**
   - User role updated from Portal on each login
   - Ensures permissions stay in sync
   - Portal is source of truth for roles

## Monitoring

### Check Linking Success Rate
```sql
SELECT 
  COUNT(*) as total_users,
  COUNT(ssoUserId) as linked_users,
  COUNT(*) - COUNT(ssoUserId) as unlinked_users,
  ROUND(COUNT(ssoUserId)::numeric / COUNT(*)::numeric * 100, 2) as link_percentage
FROM pegawai;
```

### Recent Portal Logins
```sql
SELECT 
  id,
  username,
  namaLengkap,
  ssoUserId,
  updatedAt
FROM pegawai
WHERE ssoUserId IS NOT NULL
ORDER BY updatedAt DESC
LIMIT 20;
```

## Summary

The user linking system is designed to be:
- ✅ **Automatic** - Links users without manual intervention when possible
- ✅ **Safe** - Avoids incorrect links by being conservative
- ✅ **Flexible** - Admins can manually link when needed
- ✅ **Auditable** - All links are logged and trackable

For most users, linking happens automatically. For edge cases, admins have tools to manage links manually.
