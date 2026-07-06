# 📋 Session dengan Departemen ID - Guide

## ✅ Perubahan yang Telah Dilakukan

### 1. **Update Type Definitions** (`src/lib/auth.ts`)

```typescript
export type SessionPayload = {
  id: number;
  role: 'SUPER_ADMIN' | 'PM' | 'PROGRAMMER' | 'ADMIN';
  namaLengkap?: string | null;
  username?: string | null;
  departemenId?: number | null;  // ✅ BARU
  permissions?: string[];
  iat?: number;
  exp?: number;
};

export type AuthUser = {
  id: number;
  role: 'SUPER_ADMIN' | 'PM' | 'PROGRAMMER' | 'ADMIN';
  namaLengkap?: string | null;
  username?: string | null;
  departemenId?: number | null;  // ✅ BARU
  permissions?: string[];
};
```

### 2. **Update Login Route** (`src/app/api/auth/login/route.ts`)

```typescript
const token = signSession({ 
  id: user.id, 
  role: user.role, 
  namaLengkap: user.namaLengkap, 
  username: user.username,
  departemenId: user.departemenId || null  // ✅ BARU
});
```

### 3. **Update SSO Login** (`src/app/api/auth/sso-login/route.ts`)

```typescript
const sessionToken = signSession({ 
  id: localUser.id, 
  role: localUser.role, 
  namaLengkap: localUser.namaLengkap, 
  username: localUser.username,
  departemenId: localUser.departemenId || null  // ✅ BARU
});
```

### 4. **Update Refresh Session** (`src/app/api/refresh-session/route.ts`)

```typescript
const newSession = {
  id: user.id,
  role: user.role,
  namaLengkap: user.namaLengkap,
  username: user.username,
  departemenId: user.departemenId || null  // ✅ BARU
};
```

### 5. **Update getServerSession** (`src/lib/auth.ts`)

```typescript
return {
  user: {
    id: session.id,
    role: session.role,
    namaLengkap: session.namaLengkap,
    username: session.username,
    departemenId: session.departemenId,  // ✅ BARU
    permissions: userPermissions
  }
};
```

## 📦 Struktur Session Baru

### Session Token (Cookie)
```json
{
  "id": 123,
  "role": "PROGRAMMER",
  "namaLengkap": "Ahmad Rizki",
  "username": "dev1",
  "departemenId": 4,
  "permissions": ["read:tasks", "write:tasks"],
  "iat": 1700000000,
  "exp": 1700604800
}
```

### Mapping dari Database
| Session Field | Database Field | Tabel |
|--------------|----------------|-------|
| `id` | `pegawai.id` | pegawai |
| `role` | `pegawai.role` | pegawai |
| `namaLengkap` | `pegawai.namaLengkap` | pegawai |
| `username` | `pegawai.username` | pegawai |
| `departemenId` | `pegawai.departemen_id` | pegawai |
| `permissions` | RBAC tables | user_role, role_permission, user_permission |

## 🚀 Cara Menggunakan

### 1. **Di API Routes**

```typescript
import { getServerSession } from '@/lib/auth';

export async function GET(req: NextRequest) {
  const { user } = await getServerSession();
  
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // ✅ Akses departemenId
  console.log('User Department ID:', user.departemenId);
  
  // Filter data berdasarkan departemen
  const data = await prisma.someTable.findMany({
    where: {
      departemenId: user.departemenId
    }
  });

  return NextResponse.json({ data });
}
```

### 2. **Filter Data Berdasarkan Departemen**

```typescript
// Hanya tampilkan data dari departemen user
const tasks = await prisma.tasklist.findMany({
  where: {
    pegawai: {
      departemenId: user.departemenId
    }
  }
});
```

### 3. **Cek Akses Berdasarkan Departemen**

```typescript
const { user } = await getServerSession();

// Cek apakah user dari departemen tertentu
if (user.departemenId !== targetDepartemenId) {
  return NextResponse.json({ 
    error: 'Access denied: Different department' 
  }, { status: 403 });
}
```

### 4. **Join dengan Tabel Departemen**

```typescript
const { user } = await getServerSession();

// Ambil info departemen user
const userWithDept = await prisma.pegawai.findUnique({
  where: { id: user.id },
  include: {
    departemen: {
      select: {
        id: true,
        idDep: true,
        nama: true
      }
    }
  }
});

console.log('Department:', userWithDept.departemen?.nama);
```

## 📝 Assign Departemen ke User

### Via SQL
```sql
-- Assign user ke departemen
UPDATE pegawai 
SET departemen_id = 4 
WHERE id = 123;

-- Assign multiple users
UPDATE pegawai 
SET departemen_id = 4 
WHERE username IN ('dev1', 'dev2', 'dev3');
```

### Via Prisma
```typescript
await prisma.pegawai.update({
  where: { id: 123 },
  data: { departemenId: 4 }
});
```

## ⚠️ Penting!

1. **User harus logout & login lagi** setelah departemen_id diupdate di database
2. **Session tidak auto-update** - perubahan baru terlihat setelah login ulang
3. **Null handling** - departemenId bisa null jika user belum di-assign
4. **Type safety** - TypeScript akan warning jika akses field yang tidak ada

## 🧪 Testing

```bash
# Test struktur session
node test-session-departemen.js

# Cek users dengan departemen
node -e "
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
prisma.pegawai.findMany({
  where: { departemenId: { not: null } },
  include: { departemen: true }
}).then(console.table).finally(() => prisma.\$disconnect());
"
```

## 📊 Current Status

✅ Column `departemen_id` exists in `pegawai` table  
✅ Table `master_departemen` created with 5 departments  
✅ Session types updated to include `departemenId`  
✅ Login routes updated to save `departemenId`  
✅ 5 users already have `departemenId` assigned  

## 🎯 Use Cases

1. **Filter Dashboard by Department**
   - Show only tasks/projects from user's department
   
2. **Department-based Permissions**
   - Restrict access based on department
   
3. **Department Reports**
   - Generate reports per department
   
4. **Cross-department Collaboration**
   - Track which departments are working together
   
5. **Department Analytics**
   - Analyze performance by department

## 🔄 Migration Path

Untuk existing users yang belum punya departemen:

```sql
-- Option 1: Assign based on project
UPDATE pegawai p
SET departemen_id = (
  SELECT DISTINCT pr.id_dep::integer
  FROM proyek_team pt
  JOIN proyek pr ON pt.project_id = pr.id
  WHERE pt.pegawai_id = p.id
  AND pr.id_dep IS NOT NULL
  LIMIT 1
)
WHERE p.departemen_id IS NULL;

-- Option 2: Assign default department
UPDATE pegawai 
SET departemen_id = 4  -- PT. EXPRESSA
WHERE departemen_id IS NULL;
```

---

**Created:** 2026-03-26  
**Last Updated:** 2026-03-26  
**Status:** ✅ Implemented & Tested
