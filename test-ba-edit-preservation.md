# Test BA Edit Status Preservation

## Masalah yang Diperbaiki
Ketika edit BA, kolom `is_app_module` ter-reset ke `false` padahal sebelumnya sudah `true`.

## Perbaikan yang Dilakukan

### 1. Frontend (page.tsx)
- ✅ Menambahkan `isAppModule`, `isApproved`, `approvedAt`, `tasklistId` ke data yang dikirim saat update BA
- ✅ `handleEditBA` sudah memuat status approval dengan benar dari data yang ada

### 2. Backend API (update-complete-ba/route.ts)
- ✅ Menggunakan status approval dari data frontend (bukan dari database lama)
- ✅ Menyimpan `isAppModule` untuk modules
- ✅ Menyimpan `isApproved`, `approvedAt`, `approvedBy`, `tasklistId` untuk tasks

### 3. Database Schema
- ✅ Field `isAppModule` sudah ada di `BlueprintModule`
- ✅ Field `isApproved`, `approvedAt`, `approvedBy`, `tasklistId` sudah ada di `TaskBABlueprint`

## Cara Test
1. Buat BA baru dengan beberapa modules dan tasks
2. Approve beberapa modules (status jadi "Aktif di Proyek")
3. Approve beberapa tasks (status jadi "Approved")
4. Edit BA tersebut (ubah nama, tambah/hapus module, dll)
5. Simpan perubahan
6. Verifikasi bahwa status approval tetap terjaga

## Expected Result
- Modules yang sudah di-approve tetap menunjukkan status "Aktif di Proyek"
- Tasks yang sudah di-approve tetap menunjukkan status "Approved"
- Status approval tidak ter-reset ke default saat edit BA