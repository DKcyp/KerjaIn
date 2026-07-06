# GitHub Integration - Complete Documentation

## 📋 Overview

Sistem integrasi GitHub yang komprehensif untuk manajemen Pull Request, Conflict Resolution, dan Credential Management dengan role-based access control.

---

## 🗄️ Database Schema

### GitHubCredential
Menyimpan Personal Access Token (PAT) untuk akses GitHub API.

```prisma
model GitHubCredential {
  id          Int      @id @default(autoincrement())
  name        String   // Label kredensial (e.g., "Main Bot Account")
  username    String   // GitHub username/organization
  token       String   // Personal Access Token (PAT)
  isActive    Boolean  @default(false)
  expiresAt   DateTime // Auto-expire setelah 30 hari
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  createdBy   Int?     // User ID pembuat
  
  @@map("github_credential")
}
```

### GitHubRepository
Mapping antara project internal dengan repository GitHub.

```prisma
model GitHubRepository {
  id                   Int      @id @default(autoincrement())
  projectId            Int      @unique
  repositoryName       String   @unique
  repositoryFullName   String   // Format: owner/repo
  createdAt            DateTime @default(now())
  updatedAt            DateTime @updatedAt

  @@index([projectId])
  @@index([repositoryName])
  @@map("github_repository")
}
```

**Key Features:**
- ✅ Single active token enforcement
- ✅ Automatic 30-day expiration
- ✅ Token masking (`*****`) di UI dan API responses
- ✅ Project-to-repository mapping untuk access control

---

## 👥 Role-Based Access

### 1. **SUPER_ADMIN**
**Akses Penuh:**
- ✅ Master GitHub Credentials Management
- ✅ View semua repositories
- ✅ Approve & Merge Pull Requests
- ✅ Resolve Conflicts
- ✅ Dashboard monitoring

**Menu:**
- `/master/github` - Credential Management Dashboard

### 2. **PM (Project Manager)**
**Akses:**
- ✅ View repositories sesuai project yang di-manage
- ✅ Approve & Merge Pull Requests
- ✅ Resolve Conflicts
- ✅ Dashboard monitoring

**Menu:**
- `/github` - GitHub Dashboard
- `/github/repo/[repo]` - Repository Details
- `/github/pr/[repo]/[number]` - Pull Request Details
- `/github/conflict/[repo]/[number]` - Conflict Resolution

### 3. **PROGRAMMER**
**Akses:**
- ✅ View repositories sesuai project yang dikerjakan
- ✅ Create Pull Requests
- ✅ View PR details
- ❌ Tidak bisa merge/approve

**Menu:**
- `/github` - GitHub Dashboard (view-only untuk merge actions)
- `/github/repo/[repo]` - Repository Details
- `/github/pr/[repo]/[number]` - Pull Request Details

---

## 🔐 Authentication Flow

### Backend: `getGitHubToken()`
```typescript
// src/lib/github-auth.ts
export async function getGitHubToken(): Promise<{ token: string; username: string }> {
  // 1. Fetch active token dari database
  const credential = await prisma.gitHubCredential.findFirst({
    where: { isActive: true }
  });

  // 2. Validasi keberadaan
  if (!credential) {
    throw new Error("GitHub token not configured. Please contact Super Admin.");
  }

  // 3. Cek expiration
  if (new Date() > credential.expiresAt) {
    throw new Error("GitHub token expired. Please contact Super Admin to rotate credentials.");
  }

  return { token: credential.token, username: credential.username };
}
```

**Digunakan oleh semua API routes:**
- `/api/github/repositories`
- `/api/github/pull-requests`
- `/api/github/branches`
- `/api/github/merge`
- `/api/github/file-content`
- Dan semua endpoint GitHub lainnya

---

## 📱 Fitur Utama

### 1. Master GitHub Credentials (Super Admin Only)

**Path:** `/master/github`

**Fitur:**
- ➕ Add new credentials (auto-activate)
- 🔄 Activate/Deactivate credentials
- 🗑️ Delete credentials
- 👁️ View credential list (token masked)

**Security:**
- Token di-mask sebagai `*****` setelah disimpan
- Hanya 1 token aktif pada satu waktu
- Auto-expire 30 hari
- Backend role enforcement

**API Endpoints:**
```
GET    /api/master/github        # List credentials (masked)
POST   /api/master/github        # Create new credential
PUT    /api/master/github        # Update/activate credential
DELETE /api/master/github?id=X   # Delete credential
```

---

### 2. GitHub Dashboard (PM & Programmer)

**Path:** `/github`

**Fitur:**
- 📊 List semua repositories (filtered by access)
- 🔍 Search repositories
- 📈 PR statistics per repository
- 🔗 Quick access ke repository details

**Access Control:**
- PM: Lihat semua repo di project yang di-manage
- Programmer: Lihat repo di project yang dikerjakan

---

### 3. Repository Management

**Path:** `/github/repo/[repo]`

**Fitur:**
- 🌿 Branch list & management
- 📋 Pull Request list (open/closed/all)
- ➕ Create new Pull Request
- 📊 Repository statistics

**Actions:**
- PM: Create PR, Merge PR, Resolve Conflicts
- Programmer: Create PR, View PR

---

### 4. Pull Request Details

**Path:** `/github/pr/[repo]/[number]`

**Fitur:**
- 📄 PR metadata (title, description, author)
- 📝 File changes (diff view)
- 💬 Comments (GitHub native)
- ✅ Merge status & checks
- 🔀 Merge button (PM only)

**API:**
```
GET /api/github/pull-requests/[repo]/[number]
```

**Response:**
```json
{
  "pr": {
    "number": 14,
    "title": "Feature: Add login",
    "state": "open",
    "mergeable": true,
    "head": { "ref": "feature-branch", "sha": "abc123" },
    "base": { "ref": "main" }
  },
  "files": [
    { "filename": "index.html", "status": "modified", "additions": 10, "deletions": 2 }
  ]
}
```

---

### 5. Conflict Resolution (PM Only)

**Path:** `/github/conflict/[repo]/[number]`

**Fitur:**
- 🔍 Detect conflicted files
- ✏️ Inline conflict editor
- 🎯 Resolution strategies:
  - Accept Current (HEAD)
  - Accept Incoming (merge branch)
  - Manual edit
- 💾 Save & commit resolution
- 🔄 Auto-refresh PR status

**Workflow:**
1. PM membuka PR dengan conflict
2. Sistem detect conflicted files
3. PM pilih resolution strategy per file
4. Save → Commit → Push
5. PR otomatis update (conflict resolved)

**API:**
```
POST /api/github/resolve-conflicts
Body: {
  "repo": "owner/repo",
  "prNumber": 14,
  "files": [
    { "path": "index.html", "content": "resolved content" }
  ]
}
```

---

## 🔧 Technical Implementation

### Frontend Components

**1. Credential Management**
```
src/app/(admin)/master/github/page.tsx
```
- Form input (name, username, token)
- Table list credentials
- Activate/Delete actions

**2. GitHub Dashboard**
```
src/app/(admin)/github/page.tsx
```
- Repository grid/list
- PR statistics
- Search & filter

**3. Repository Details**
```
src/app/(admin)/github/repo/[repo]/page.tsx
```
- Branch selector
- PR list
- Create PR form

**4. PR Details**
```
src/app/(admin)/github/pr/[repo]/[number]/page.tsx
```
- PR metadata
- File diff viewer
- Merge button (conditional)

**5. Conflict Resolution**
```
src/app/(admin)/github/conflict/[repo]/[number]/page.tsx
```
- Conflict file list
- Inline editor
- Resolution controls

### Backend API Routes

**Credential Management:**
```
src/app/api/master/github/route.ts
```

**GitHub Integration:**
```
src/app/api/github/
├── repositories/route.ts          # List repos
├── branches/route.ts              # List branches
├── pull-requests/route.ts         # List PRs
├── pull-requests/[repo]/[number]/ # PR details
├── create-pr/route.ts             # Create PR
├── merge/route.ts                 # Merge PR
├── resolve-conflicts/route.ts     # Resolve conflicts
├── file-content/route.ts          # Get/update file
└── check-access/route.ts          # Verify user access
```

**Helper Functions:**
```
src/lib/github-auth.ts             # Token management
```

---

## 🚀 Usage Examples

### Super Admin: Add GitHub Token

1. Login sebagai Super Admin
2. Buka **Master** → **Master GitHub**
3. Klik **+ Add Credential**
4. Isi form:
   - **Name:** Main Bot Account
   - **Username:** my-organization
   - **Token:** ghp_xxxxxxxxxxxxx
5. Klik **Save & Activate**
6. Token otomatis aktif, yang lama otomatis non-aktif

### PM: Merge Pull Request

1. Login sebagai PM
2. Buka **GitHub** → Pilih repository
3. Klik PR yang ingin di-merge
4. Review changes
5. Klik **Approve & Merge**
6. PR ter-merge ke branch target

### PM: Resolve Conflict

1. Login sebagai PM
2. Buka **GitHub** → Pilih repository
3. Klik PR dengan conflict
4. Sistem redirect ke `/github/conflict/[repo]/[number]`
5. Pilih resolution strategy per file
6. Klik **Save Resolution**
7. Conflict resolved, PR ready to merge

### Programmer: Create Pull Request

1. Login sebagai Programmer
2. Buka **GitHub** → Pilih repository
3. Klik **Create Pull Request**
4. Pilih source & target branch
5. Isi title & description
6. Klik **Create**
7. PR dibuat, menunggu review PM

---

## 🔒 Security Features

### 1. Token Security
- ✅ Token di-mask di UI (`*****`)
- ✅ Token di-mask di API responses
- ✅ Token stored di database (encrypted recommended)
- ✅ Auto-expire 30 hari
- ✅ Single active token enforcement

### 2. Access Control
- ✅ Backend role enforcement di semua API
- ✅ Frontend role check untuk UX
- ✅ Project-based repository access
- ✅ Action restrictions (merge, resolve)

### 3. Audit Trail
- ✅ `createdBy` tracking
- ✅ `createdAt` / `updatedAt` timestamps
- ✅ Activity logs (via GitHub API)

---

## 📊 Monitoring & Troubleshooting

### Common Issues

**1. "GitHub token not configured"**
- **Cause:** Tidak ada active token di database
- **Solution:** Super Admin harus add credential di `/master/github`

**2. "GitHub token expired"**
- **Cause:** Token sudah lewat 30 hari
- **Solution:** Super Admin add token baru atau update existing

**3. "Access denied to repository"**
- **Cause:** User tidak punya akses ke project terkait
- **Solution:** Cek `GitHubRepository` mapping & user project assignment

**4. "PR shows 0 changes after conflict resolution"**
- **Cause:** Normal behavior setelah conflict resolved
- **Solution:** Klik "Approve & Merge" untuk finalisasi

### Debug Mode

Enable logging di API routes:
```typescript
console.log('[GitHub Auth] Token fetch:', { username, expiresAt });
```

Check database:
```sql
SELECT * FROM github_credential WHERE "isActive" = true;
SELECT * FROM github_repository WHERE "projectId" = X;
```

---

## 🎯 Best Practices

### For Super Admin
1. **Rotate tokens** sebelum expire (25 hari)
2. **Gunakan PAT** dengan scope minimal (`repo`, `read:org`)
3. **Backup credentials** di secure vault
4. **Monitor usage** via GitHub API rate limits

### For PM
1. **Review PR** sebelum merge
2. **Test conflict resolution** di local dulu jika kompleks
3. **Communicate** dengan programmer sebelum merge

### For Programmer
1. **Create descriptive PR** (title & description)
2. **Keep PR small** (< 500 lines changes)
3. **Resolve conflicts locally** jika memungkinkan
4. **Notify PM** saat PR ready for review

---

## 📝 Migration Notes

### From `.env` to Database

**Old way:**
```env
GITHUB_TOKEN=ghp_xxxxxxxxxxxxx
GITHUB_ORG=my-organization
```

**New way:**
1. Remove `GITHUB_TOKEN` dan `GITHUB_ORG` dari `.env`
2. Super Admin add via UI `/master/github`
3. Semua API otomatis pakai database token

**Benefits:**
- ✅ No server restart needed
- ✅ Token rotation tanpa downtime
- ✅ Audit trail
- ✅ Multi-token support (future)

---

## 🔮 Future Enhancements

- [ ] Multiple active tokens (load balancing)
- [ ] Token usage analytics
- [ ] Webhook integration untuk auto-update PR status
- [ ] GitHub Actions integration
- [ ] Code review comments dari UI
- [ ] Branch protection rules management

---

**Last Updated:** 2025-12-26  
**Version:** 1.0.0  
**Maintained by:** Development Team
