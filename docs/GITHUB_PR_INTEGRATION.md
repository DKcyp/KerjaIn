# GitHub Pull Request Integration - Tasklist

## Overview
Fitur integrasi GitHub Pull Request memungkinkan programmer untuk membuat Pull Request otomatis ketika submit task. User pilih branch di detail task, lalu saat klik submit akan muncul popup konfirmasi yang menampilkan info PR yang akan dibuat.

## Fitur Utama

### 1. Lokasi Fitur
- **Lokasi**: Di dalam **TaskDetailModal** (detail task)
- **Section**: "GitHub Pull Request" dengan icon GitHub
- **Akses**: Semua user yang membuka detail task

### 2. Cara Kerja - Pilih Branch, Konfirmasi, PR Otomatis Dibuat!
1. User membuka detail task (klik task di list)
2. Scroll ke section "GitHub Pull Request"
3. **Pilih Source Branch** (dropdown biru 📤) - branch yang akan di-merge
4. **Pilih Target Branch** (dropdown hijau 📥) - branch tujuan (main/staging/trial)
5. **Preview ditampilkan**: `source → target` + info "PR akan dibuat saat submit"
6. User klik action task (Selesaikan Task / Approve)
7. **Popup konfirmasi muncul** dengan:
   - Input catatan (opsional)
   - Info PR yang akan dibuat: `source → target`
   - Tombol "Kirim Review" / "Approve"
8. User klik konfirmasi
9. **PR otomatis dibuat!** setelah task di-submit
10. Toast notification: "Pull Request #XX berhasil dibuat!"

### 3. Komponen
- **2 Dropdown Button**:
  - Source Branch (biru): Semua branches dari repository
  - Target Branch (hijau): Filtered branches (main, staging, trial, develop, production)
  - **Disabled** jika task sudah selesai
- **Preview Box**: Menampilkan branch yang dipilih + info PR akan dibuat saat submit
- **Popup Konfirmasi**: 
  - Textarea untuk catatan (opsional)
  - Info PR yang akan dibuat
  - Tombol Batal & Konfirmasi
- **Toast notification**: Success/error message

## Flow Detail

### Skenario 1: Programmer Complete Task dengan PR
1. Programmer buka detail task
2. Pilih source branch (misal: `feature/login`)
3. Pilih target branch (misal: `staging`)
4. Preview: "PR akan dibuat: feature/login → staging"
5. Klik **"Selesaikan Task"**
6. **Popup konfirmasi muncul**:
   - Title: "🚀 Kirim Review"
   - Input catatan (opsional)
   - Info: "🔀 Pull Request akan dibuat: feature/login → staging"
7. User isi catatan (opsional) dan klik **"Kirim Review"**
8. Task status berubah ke "Menunggu Review PM"
9. **PR otomatis dibuat** di GitHub
10. Notifikasi ke PM: "PR #123 berhasil dibuat"

### Skenario 2: PM Approve Task dengan PR
1. PM buka detail task yang sudah di-review
2. Programmer sudah pilih branch sebelumnya
3. PM klik **"Approve"**
4. **Popup konfirmasi muncul**:
   - Title: "✅ Approve Task"
   - Input catatan (opsional)
   - Info: "🔀 Pull Request akan dibuat: feature/login → staging"
5. PM klik **"Approve"**
6. Task status berubah ke "Selesai"
7. **PR otomatis dibuat** di GitHub
8. Notifikasi: "PR #123 berhasil dibuat"

### Skenario 3: Submit Task Tanpa PR
1. User tidak pilih branch
2. Klik "Selesaikan Task" / "Approve"
3. **Popup konfirmasi muncul**:
   - Title: "🚀 Kirim Review" / "✅ Approve Task"
   - Input catatan (opsional)
   - Info: "ℹ️ Tidak ada Pull Request yang akan dibuat"
4. User klik konfirmasi
5. Task di-submit tanpa PR
6. **Tidak ada PR yang dibuat** (skip)

### Skenario 4: Task Sudah Selesai
1. User buka detail task yang sudah selesai
2. Dropdown branch **disabled** (tidak bisa diklik)
3. Info: "ℹ️ Task sudah selesai. Branch tidak dapat diubah."

## Komponen yang Dibuat

### 1. `CreatePRDropdown.tsx` (CreatePRSimple)
Komponen dengan 2 dropdown + preview:
- Fetch repository info berdasarkan projectId
- Fetch branches dari GitHub API
- Callback `onBranchSelect` untuk notify parent
- Validasi: source ≠ target branch
- **Disabled** jika task sudah selesai (`taskStatus === 'SELESAI'`)
- Preview box dengan info "PR akan dibuat saat submit"
- **useCallback** untuk prevent infinite loop

### 2. TaskDetailModal Updates
- State untuk menyimpan pilihan branch:
  - `prSourceBranch`
  - `prTargetBranch`
  - `prRepoFullName`
- State untuk popup konfirmasi:
  - `showConfirmModal`
  - `confirmAction` ('complete' | 'approve')
  - `confirmNote`
- Handler `handleBranchSelect` untuk terima pilihan dari CreatePRSimple
- Function `createPullRequest` untuk create PR
- Wrapper functions:
  - `handleCompleteTask`: Show popup konfirmasi
  - `handleStatusChange`: Show popup konfirmasi (jika approve)
- Function `confirmAndExecute`: Execute action + create PR
- **Popup Modal**: Konfirmasi dengan info PR

### 3. API Routes

#### `/api/github/repo-by-project/[projectId]`
- **Method**: GET
- **Params**: `Promise<{ projectId: string }>` (Next.js 15)
- **Fungsi**: Get repository info untuk project
- **Response**: Repository name dan full name

#### `/api/github/branches/[repo]`
- **Method**: GET
- **Params**: `Promise<{ repo: string }>` (Next.js 15)
- **Fungsi**: Get semua branches dari repository
- **Response**: List branches (name, sha, protected)

#### `/api/github/create-pr` (existing)
- **Method**: POST
- **Fungsi**: Create pull request di GitHub
- **Body**: `{ repo, head, base, title, body }`

## PR Format
- **Title**: `[TASK-CODE] Task Description`
- **Body**: 
  ```
  Task: TASK-CODE
  
  Task Description
  ```

## UI/UX

### Design
- **2 Dropdown Button**: Side by side, warna berbeda (biru & hijau)
- **Disabled State**: Jika task sudah selesai
- **Preview Box**: Muncul setelah kedua branch dipilih
  - Menampilkan: `source → target`
  - Info: "💡 PR akan otomatis dibuat ketika Anda submit task"
- **Popup Konfirmasi**:
  - Title sesuai action (Kirim Review / Approve)
  - Textarea untuk catatan (opsional)
  - Info PR yang akan dibuat (jika ada)
  - Tombol Batal & Konfirmasi
- **Toast Notification**: Success/error setelah PR dibuat

### Validasi
- Source = Target → Error toast + reset source
- Repository tidak terhubung → Component tidak muncul
- Gagal fetch branches → Error toast
- Tidak pilih branch → Skip create PR (tidak error)
- Task sudah selesai → Dropdown disabled

## Konfigurasi

### Database Schema
```sql
CREATE TABLE github_repository (
  id SERIAL PRIMARY KEY,
  project_id INTEGER UNIQUE NOT NULL,
  repository_name VARCHAR NOT NULL,
  repository_full_name VARCHAR NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### GitHub Token
```env
GITHUB_TOKEN=your_github_token
```

## Notifikasi
Setelah PR dibuat:
1. Toast notification ke user yang submit
2. Notifikasi ke PM project (database)
3. Real-time notification via Pusher

## Error Handling
- Repository tidak ditemukan → Component hidden
- Gagal fetch branches → Error toast
- Source = Target → Validasi error + reset
- PR sudah ada → Error dari GitHub API
- Network error → Error toast
- Tidak pilih branch → Skip (tidak error)
- Infinite loop → Fixed dengan useCallback

## Keunggulan Design Ini
✅ **Non-blocking**: Pilih branch tidak langsung create PR
✅ **Flexible**: User bisa pilih branch kapan saja sebelum submit
✅ **Optional**: Tidak wajib pilih branch, bisa skip
✅ **Confirmation**: Popup konfirmasi dengan info PR sebelum submit
✅ **Clear Info**: User tahu persis PR yang akan dibuat
✅ **Integrated**: PR dibuat sebagai bagian dari workflow submit task
✅ **Protected**: Task selesai tidak bisa ubah branch
✅ **Clean UI**: Tidak ada popup/modal tambahan yang mengganggu
✅ **Mobile Friendly**: Dropdown native, responsive
✅ **No Loop**: useCallback prevent infinite loop

## Testing
1. Pastikan project terhubung dengan GitHub repository
2. Buka detail task
3. Pilih source branch
4. Pilih target branch
5. Verify preview muncul
6. Klik "Selesaikan Task" / "Approve"
7. Verify popup konfirmasi muncul dengan info PR
8. Isi catatan (opsional)
9. Klik konfirmasi
10. Verify PR dibuat di GitHub
11. Check notifikasi terkirim
12. Test task selesai → dropdown disabled

## Future Improvements
- [ ] Save branch selection to database (persist)
- [ ] Show recent PRs for this task
- [ ] Link PR to task in database
- [ ] Auto-detect branch from task description
- [ ] Show PR status in task detail
- [ ] Quick actions: merge, close PR from task detail
- [ ] Add note to PR body from confirmation modal
