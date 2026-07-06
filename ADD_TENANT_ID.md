# Added Portal Tenant ID Field

## What Changed

✅ Added `portalTenantId` field to Pegawai model in Prisma schema
✅ Updated Portal SSO route to save tenant ID when creating/updating users

## To Apply Changes

### Step 1: Stop the dev server
Press `Ctrl+C` in the terminal running the logbook dev server

### Step 2: Push schema to database
```bash
cd logbook
npx prisma db push
```

This will add the `portal_tenant_id` column to the `pegawai` table.

### Step 3: Regenerate Prisma Client
```bash
npx prisma generate
```

This will update the Prisma client with the new field.

### Step 4: Restart the dev server
```bash
npm run dev -- --port=3002
```

## What Gets Saved

When a user logs in via Portal SSO, the system now saves:

- `ssoUserId` - Portal user ID (e.g., "abc123")
- `portalTenantId` - Portal tenant ID (e.g., "tenant-uuid")
- `namaLengkap` - User's display name from Portal
- `role` - Mapped role (User → PROGRAMMER)

## Example

```javascript
// Portal User Data
{
  id: "user-abc123",
  email: "john.doe@company.com",
  displayName: "John Doe",
  role: "User",
  tenant: {
    id: "tenant-xyz789",
    name: "Expressa",
    slug: "expressa"
  }
}

// Saved in Logbook
{
  id: 1,
  username: "john.doe",
  namaLengkap: "John Doe",
  role: "PROGRAMMER",
  ssoUserId: "user-abc123",
  portalTenantId: "tenant-xyz789"  // ← NEW!
}
```

## Database Schema

```sql
-- New column in pegawai table
ALTER TABLE pegawai ADD COLUMN portal_tenant_id VARCHAR;

-- Check the column
SELECT id, username, sso_user_id, portal_tenant_id 
FROM pegawai 
WHERE sso_user_id IS NOT NULL;
```

## Benefits

- Track which Portal tenant each user belongs to
- Enable multi-tenant features in Logbook
- Filter/scope data by tenant
- Audit trail for tenant access
