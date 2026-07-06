# Admin: Portal User Linking Tool

## Quick Reference

### Check User Link Status

```bash
# Get all users and their link status
curl http://localhost:3002/api/admin/link-portal-user \
  -H "Cookie: session=YOUR_SESSION_COOKIE"
```

### Link a User

```bash
# Link Logbook user ID 5 to Portal user "abc123"
curl -X POST http://localhost:3002/api/admin/link-portal-user \
  -H "Content-Type: application/json" \
  -H "Cookie: session=YOUR_SESSION_COOKIE" \
  -d '{
    "logbookUserId": 5,
    "portalUserId": "abc123"
  }'
```

### Unlink a User

```bash
# Unlink Logbook user ID 5 from Portal
curl -X DELETE http://localhost:3002/api/admin/link-portal-user \
  -H "Content-Type: application/json" \
  -H "Cookie: session=YOUR_SESSION_COOKIE" \
  -d '{
    "logbookUserId": 5
  }'
```

## How to Get Portal User ID

### Method 1: From Portal Database

```sql
-- In Portal database
SELECT id, email, "firstName", "lastName" 
FROM "User" 
WHERE email = 'user@company.com';
```

### Method 2: From Portal API (when logged in)

```bash
# Login to Portal and check session
curl http://localhost:3000/api/sso/me \
  -H "Cookie: next-auth.session-token=YOUR_PORTAL_SESSION"
```

Response will include:
```json
{
  "authenticated": true,
  "user": {
    "id": "abc123",  // <-- This is the Portal User ID
    "email": "user@company.com",
    "displayName": "John Doe"
  }
}
```

## Common Admin Tasks

### Task 1: Pre-link All Existing Users

Before enabling Portal SSO for everyone, pre-link existing users:

```javascript
// Script to run in Node.js or browser console
const users = [
  { logbookId: 1, portalEmail: "admin@company.com" },
  { logbookId: 2, portalEmail: "john.doe@company.com" },
  { logbookId: 3, portalEmail: "jane.smith@company.com" },
];

// First, get Portal user IDs
const portalUsers = await fetch('http://localhost:3000/api/admin/users')
  .then(r => r.json());

// Then link each user
for (const user of users) {
  const portalUser = portalUsers.find(p => p.email === user.portalEmail);
  if (portalUser) {
    await fetch('http://localhost:3002/api/admin/link-portal-user', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        logbookUserId: user.logbookId,
        portalUserId: portalUser.id
      })
    });
    console.log(`Linked ${user.portalEmail}`);
  }
}
```

### Task 2: Find Unlinked Users

```bash
# Get all users
curl http://localhost:3002/api/admin/link-portal-user \
  -H "Cookie: session=YOUR_SESSION_COOKIE" \
  | jq '.users[] | select(.ssoUserId == null)'
```

### Task 3: Audit Linked Users

```bash
# Get statistics
curl http://localhost:3002/api/admin/link-portal-user \
  -H "Cookie: session=YOUR_SESSION_COOKIE" \
  | jq '.stats'
```

Output:
```json
{
  "total": 50,
  "linked": 35,
  "unlinked": 15
}
```

## Migration Workflow

### Step 1: Export Users

```sql
-- From Logbook database
SELECT 
  id as logbook_id,
  username,
  namaLengkap,
  ssoUserId
FROM pegawai
ORDER BY id;
```

### Step 2: Match with Portal Users

Create a mapping file `user-mapping.json`:
```json
[
  {
    "logbookId": 1,
    "logbookUsername": "admin",
    "portalEmail": "admin@company.com",
    "portalUserId": "abc123"
  },
  {
    "logbookId": 2,
    "logbookUsername": "john.doe",
    "portalEmail": "john.doe@company.com",
    "portalUserId": "def456"
  }
]
```

### Step 3: Bulk Link Users

```javascript
// bulk-link.js
const fs = require('fs');
const fetch = require('node-fetch');

const mapping = JSON.parse(fs.readFileSync('user-mapping.json'));
const sessionCookie = 'YOUR_SESSION_COOKIE';

async function linkUsers() {
  for (const user of mapping) {
    try {
      const response = await fetch('http://localhost:3002/api/admin/link-portal-user', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': `session=${sessionCookie}`
        },
        body: JSON.stringify({
          logbookUserId: user.logbookId,
          portalUserId: user.portalUserId
        })
      });
      
      const result = await response.json();
      
      if (result.success) {
        console.log(`✅ Linked: ${user.logbookUsername} → ${user.portalEmail}`);
      } else {
        console.error(`❌ Failed: ${user.logbookUsername} - ${result.error}`);
      }
    } catch (error) {
      console.error(`❌ Error linking ${user.logbookUsername}:`, error.message);
    }
  }
}

linkUsers();
```

Run:
```bash
node bulk-link.js
```

### Step 4: Verify Links

```bash
# Check all users are linked
curl http://localhost:3002/api/admin/link-portal-user \
  -H "Cookie: session=YOUR_SESSION_COOKIE" \
  | jq '.stats'
```

## Troubleshooting

### Error: "Portal user is already linked"

**Problem:** Trying to link Portal user that's already linked to another Logbook user

**Solution:**
1. Find which Logbook user is linked:
   ```bash
   curl http://localhost:3002/api/admin/link-portal-user \
     -H "Cookie: session=YOUR_SESSION_COOKIE" \
     | jq '.users[] | select(.ssoUserId == "PORTAL_USER_ID")'
   ```
2. Unlink the incorrect user
3. Link to correct user

### Error: "Unauthorized"

**Problem:** Not logged in as SUPER_ADMIN

**Solution:**
1. Login to Logbook as SUPER_ADMIN
2. Get session cookie from browser DevTools
3. Use cookie in API requests

### Error: "User not found"

**Problem:** Logbook user ID doesn't exist

**Solution:**
1. Verify user ID exists:
   ```sql
   SELECT * FROM pegawai WHERE id = 123;
   ```
2. Use correct user ID

## Security Notes

1. **Admin Only** - Only SUPER_ADMIN can access these APIs
2. **Audit Trail** - All links are logged in server console
3. **Validation** - System prevents duplicate links
4. **Reversible** - Links can be undone if needed

## Best Practices

1. **Test First** - Test linking with a few users before bulk operation
2. **Backup Database** - Backup before bulk linking
3. **Document Mapping** - Keep user mapping file for reference
4. **Verify After** - Check link status after bulk operation
5. **Communicate** - Inform users about Portal SSO before enabling

## Quick Commands Cheat Sheet

```bash
# Get session cookie (from browser DevTools)
# Application → Cookies → session

# Check link status
curl http://localhost:3002/api/admin/link-portal-user -H "Cookie: session=XXX" | jq

# Link user
curl -X POST http://localhost:3002/api/admin/link-portal-user \
  -H "Content-Type: application/json" \
  -H "Cookie: session=XXX" \
  -d '{"logbookUserId":1,"portalUserId":"abc123"}'

# Unlink user
curl -X DELETE http://localhost:3002/api/admin/link-portal-user \
  -H "Content-Type: application/json" \
  -H "Cookie: session=XXX" \
  -d '{"logbookUserId":1}'

# Find unlinked users
curl http://localhost:3002/api/admin/link-portal-user -H "Cookie: session=XXX" \
  | jq '.users[] | select(.ssoUserId == null) | {id, username, namaLengkap}'

# Count linked vs unlinked
curl http://localhost:3002/api/admin/link-portal-user -H "Cookie: session=XXX" \
  | jq '.stats'
```
