# How to Connect Existing Logbook Users to Portal

## Quick Overview

There are 3 ways to connect existing Logbook users to Portal users:

1. **Automatic** - User logs in with Portal SSO (easiest)
2. **Manual API** - Admin links users via API
3. **Bulk Script** - Link many users at once
4. **Direct SQL** - Update database directly (fastest for many users)

---

## Method 1: Automatic Linking (Recommended)

### How It Works

When a user logs in with Portal SSO, the system automatically links their accounts if:
- Username matches (e.g., `john.doe` in Logbook, `john.doe@company.com` in Portal)
- Name matches (if only one user with that name exists)

### Steps

1. User goes to `http://localhost:3002/signin`
2. Clicks "Sign in with Richz Portal"
3. Logs in with Portal credentials
4. System automatically links accounts ✅

### Example

```
Logbook User: { id: 5, username: "john.doe" }
Portal User: { email: "john.doe@company.com" }
→ Automatically linked when user logs in!
```

---

## Method 2: Manual API Linking

### When to Use

- Username doesn't match
- Multiple users with same name
- Need to link before user's first login

### Steps

#### 1. Get Portal User ID

**Option A: From Portal Database**
```sql
SELECT id, email, "firstName", "lastName" 
FROM "User" 
WHERE email = 'john.doe@company.com';
```

**Option B: From Portal API**
```bash
# Login to Portal first, then:
curl http://localhost:3000/api/sso/me \
  -H "Cookie: next-auth.session-token=YOUR_PORTAL_SESSION"
```

#### 2. Get Logbook User ID

```sql
SELECT id, username, "namaLengkap" 
FROM pegawai 
WHERE username = 'john.doe';
```

#### 3. Get Admin Session Cookie

1. Login to Logbook as SUPER_ADMIN
2. Open DevTools (F12)
3. Go to Application → Cookies
4. Copy the value of "session" cookie

#### 4. Link via API

```bash
curl -X POST http://localhost:3002/api/admin/link-portal-user \
  -H "Content-Type: application/json" \
  -H "Cookie: session=YOUR_ADMIN_SESSION" \
  -d '{
    "logbookUserId": 5,
    "portalUserId": "abc123-portal-user-id"
  }'
```

#### 5. Verify

```bash
curl http://localhost:3002/api/admin/link-portal-user \
  -H "Cookie: session=YOUR_ADMIN_SESSION" \
  | jq '.users[] | select(.id == 5)'
```

---

## Method 3: Bulk Linking Script

### When to Use

- Need to link many users at once
- Migrating from old system to Portal SSO
- Pre-linking users before rollout

### Steps

#### 1. Create User Mapping

Run the SQL query to get Logbook users:
```bash
psql -d richz_log_development -f generate-user-mappings.sql
```

This shows all users and their link status.

#### 2. Get Portal User IDs

From Portal database:
```sql
SELECT id, email, "firstName", "lastName" 
FROM "User" 
ORDER BY email;
```

#### 3. Update Bulk Script

Edit `bulk-link-users.js`:
```javascript
const userMappings = [
  { logbookId: 1, portalUserId: 'portal-id-1', name: 'Admin' },
  { logbookId: 2, portalUserId: 'portal-id-2', name: 'John Doe' },
  { logbookId: 3, portalUserId: 'portal-id-3', name: 'Jane Smith' },
  // Add more...
];
```

#### 4. Get Admin Session

1. Login to Logbook as SUPER_ADMIN
2. Get session cookie from DevTools
3. Update `ADMIN_SESSION_COOKIE` in script

#### 5. Run Script

```bash
node bulk-link-users.js
```

Output:
```
🔗 Starting bulk user linking...
Total users to link: 3

✅ Linked: Admin (Logbook ID: 1)
✅ Linked: John Doe (Logbook ID: 2)
✅ Linked: Jane Smith (Logbook ID: 3)

📊 Summary:
✅ Successfully linked: 3
❌ Failed: 0

✅ Done!
```

---

## Method 4: Direct SQL (Fastest)

### When to Use

- Need to link many users quickly
- Have direct database access
- Comfortable with SQL

### Steps

#### 1. Get Portal User IDs and Tenant ID

```sql
-- In Portal database
SELECT id, email, "tenantId" 
FROM "User" 
ORDER BY email;
```

#### 2. Update Logbook Database

```sql
-- Link single user
UPDATE pegawai 
SET sso_user_id = 'portal-user-id-here',
    portal_tenant_id = 'tenant-id-here'
WHERE id = 5;

-- Bulk link multiple users
UPDATE pegawai SET sso_user_id = 'portal-id-1', portal_tenant_id = 'tenant-id' WHERE id = 1;
UPDATE pegawai SET sso_user_id = 'portal-id-2', portal_tenant_id = 'tenant-id' WHERE id = 2;
UPDATE pegawai SET sso_user_id = 'portal-id-3', portal_tenant_id = 'tenant-id' WHERE id = 3;
```

#### 3. Verify

```sql
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
```

---

## Comparison

| Method | Speed | Ease | Best For |
|--------|-------|------|----------|
| Automatic | Slow (one by one) | ⭐⭐⭐⭐⭐ Easiest | Small teams, matching usernames |
| Manual API | Medium | ⭐⭐⭐ Moderate | Few users, non-matching usernames |
| Bulk Script | Fast | ⭐⭐⭐ Moderate | Many users, pre-migration |
| Direct SQL | Fastest | ⭐⭐ Advanced | Many users, database access |

---

## Recommended Workflow

### For Small Teams (< 10 users)
1. Use **Automatic Linking**
2. Have each user login with Portal SSO
3. System links automatically

### For Medium Teams (10-50 users)
1. Use **Bulk Script**
2. Pre-link all users before rollout
3. Users login seamlessly on first try

### For Large Teams (> 50 users)
1. Use **Direct SQL**
2. Export Portal users
3. Match with Logbook users
4. Bulk update database
5. Verify all links

---

## Troubleshooting

### User Not Linking Automatically

**Problem:** User logs in but new account is created

**Solution:**
- Check username matches email prefix
- Use Manual API to link correct account
- Delete duplicate account if needed

### API Returns "Unauthorized"

**Problem:** Can't access admin API

**Solution:**
- Login as SUPER_ADMIN
- Get fresh session cookie
- Verify cookie in request

### Portal User Already Linked

**Problem:** Portal user is linked to wrong Logbook user

**Solution:**
```bash
# 1. Unlink
curl -X DELETE http://localhost:3002/api/admin/link-portal-user \
  -H "Content-Type: application/json" \
  -H "Cookie: session=XXX" \
  -d '{"logbookUserId": WRONG_ID}'

# 2. Link to correct user
curl -X POST http://localhost:3002/api/admin/link-portal-user \
  -H "Content-Type: application/json" \
  -H "Cookie: session=XXX" \
  -d '{"logbookUserId": CORRECT_ID, "portalUserId": "portal-id"}'
```

---

## Files Reference

- `bulk-link-users.js` - Bulk linking script
- `generate-user-mappings.sql` - SQL queries to help create mappings
- `ADMIN_USER_LINKING.md` - Admin API reference
- `USER_LINKING_GUIDE.md` - Technical details

---

## Quick Commands

```bash
# Check link status
curl http://localhost:3002/api/admin/link-portal-user \
  -H "Cookie: session=XXX" | jq '.stats'

# Link user
curl -X POST http://localhost:3002/api/admin/link-portal-user \
  -H "Content-Type: application/json" \
  -H "Cookie: session=XXX" \
  -d '{"logbookUserId":5,"portalUserId":"abc123"}'

# Unlink user
curl -X DELETE http://localhost:3002/api/admin/link-portal-user \
  -H "Content-Type: application/json" \
  -H "Cookie: session=XXX" \
  -d '{"logbookUserId":5}'

# Run bulk script
node bulk-link-users.js
```

---

## Summary

Choose the method that fits your needs:
- **Just starting?** → Use Automatic Linking
- **Few users to fix?** → Use Manual API
- **Migrating everyone?** → Use Bulk Script or Direct SQL

All methods are safe and reversible. You can always unlink and relink users if needed.
