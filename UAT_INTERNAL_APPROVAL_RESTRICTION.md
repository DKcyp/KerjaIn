# UAT Internal Approval Restriction

## Overview
UAT Internal approval pada blueprint sekarang dibatasi hanya untuk akun mas Erda. Hanya user dengan ID yang sesuai dengan `UAT_INTERNAL_APPROVER_ID` yang dapat approve UAT Internal.

## Implementation Details

### 1. Environment Configuration
File: `.env.local`

```env
# UAT Internal Approval Configuration
# User ID yang diizinkan untuk approve UAT Internal (mas Erda)
UAT_INTERNAL_APPROVER_ID="2"
```

**Note**: Ganti nilai `"2"` dengan user ID mas Erda yang sebenarnya di database.

### 2. Endpoint Modification
File: `src/app/api/blueprint-baru/[id]/uat/route.ts`

**POST Endpoint** - Approve UAT for a task

Penambahan validasi:
```typescript
// Check if user is trying to approve UAT Internal
// Only the designated approver (mas Erda) can approve UAT Internal
if (approved) {
  const uatInternalApproverId = process.env.UAT_INTERNAL_APPROVER_ID;
  if (uatInternalApproverId && session.id !== parseInt(uatInternalApproverId)) {
    return NextResponse.json(
      { 
        success: false, 
        error: 'Hanya mas Erda yang dapat approve UAT Internal. Hubungi administrator untuk informasi lebih lanjut.' 
      }, 
      { status: 403 }
    );
  }
}
```

### 3. Behavior

#### Approval Allowed
- User dengan ID yang sesuai dengan `UAT_INTERNAL_APPROVER_ID` dapat approve UAT Internal
- Response: `200 OK` dengan data task yang di-approve

#### Approval Denied
- User lain mencoba approve UAT Internal
- Response: `403 Forbidden` dengan pesan error:
  ```json
  {
    "success": false,
    "error": "Hanya mas Erda yang dapat approve UAT Internal. Hubungi administrator untuk informasi lebih lanjut."
  }
  ```

#### Rejection Allowed
- Semua user yang authorized dapat reject UAT (approved = false)
- Hanya restriction untuk approval (approved = true)

### 4. How to Find mas Erda's User ID

Query database untuk menemukan user ID mas Erda:

```sql
SELECT id, namaLengkap, username FROM pegawai 
WHERE namaLengkap LIKE '%Erda%' OR username LIKE '%erda%';
```

Kemudian update `.env.local` dengan user ID yang ditemukan.

### 5. Testing

#### Test Case 1: Approval by mas Erda (Should Succeed)
```bash
curl -X POST http://localhost:3002/api/blueprint-baru/1/uat \
  -H "Content-Type: application/json" \
  -H "Cookie: session=<mas_erda_session>" \
  -d '{"taskId": 1, "approved": true}'
```

Expected Response: `200 OK`

#### Test Case 2: Approval by Other User (Should Fail)
```bash
curl -X POST http://localhost:3002/api/blueprint-baru/1/uat \
  -H "Content-Type: application/json" \
  -H "Cookie: session=<other_user_session>" \
  -d '{"taskId": 1, "approved": true}'
```

Expected Response: `403 Forbidden` dengan error message

#### Test Case 3: Rejection by Any User (Should Succeed)
```bash
curl -X POST http://localhost:3002/api/blueprint-baru/1/uat \
  -H "Content-Type: application/json" \
  -H "Cookie: session=<any_user_session>" \
  -d '{"taskId": 1, "approved": false}'
```

Expected Response: `200 OK`

## Notes

- Restriction hanya berlaku untuk **approval** (approved = true)
- **Rejection** (approved = false) tetap dapat dilakukan oleh user yang authorized
- Environment variable `UAT_INTERNAL_APPROVER_ID` harus di-set dengan benar
- Jika environment variable tidak di-set, restriction tidak akan berlaku (backward compatible)
- Pesan error ditampilkan dalam Bahasa Indonesia untuk user experience yang lebih baik

## Related Files

- `src/app/api/blueprint-baru/[id]/uat/route.ts` - Main endpoint
- `.env.local` - Configuration file
- `src/lib/auth.ts` - Session parsing logic
