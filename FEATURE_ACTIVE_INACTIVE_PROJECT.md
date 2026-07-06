# Fitur Aktif/Non-Aktif Proyek

## Deskripsi
Fitur ini memungkinkan pengguna untuk mengaktifkan atau menonaktifkan proyek di halaman Master Proyek.

## Perubahan yang Dibuat

### 1. Database Schema (Prisma)
- Menambahkan field `isActive` (Boolean) ke model `Proyek` dengan default value `true`
- Field ini di-map ke kolom `is_active` di database

### 2. Database Migration
- Menjalankan SQL migration untuk menambahkan kolom `is_active` ke tabel `proyek`
- Semua proyek existing diset sebagai aktif secara default

### 3. API Updates

#### `/api/proyek` (POST & GET)
- Menambahkan support untuk field `isActive` dalam create dan response
- Default value `true` untuk proyek baru

#### `/api/proyek/[id]` (PUT)
- Menambahkan support untuk update field `isActive`

#### `/api/proyek/[id]/toggle-status` (PATCH) - NEW
- API endpoint baru untuk toggle status aktif/non-aktif
- Memerlukan permission `project.update`
- Mengembalikan status baru dan pesan konfirmasi

### 4. Frontend Updates

#### Master Proyek Page (`/master/proyek`)
- Menambahkan kolom "Status" di tabel
- Menampilkan badge status (Aktif/Non-Aktif) dengan warna berbeda
- Menambahkan tombol toggle "Aktifkan/Nonaktifkan" di kolom aksi
- Update interface `Proyek` untuk include field `isActive`

## Cara Penggunaan

1. Buka halaman Master Proyek di `/master/proyek`
2. Lihat kolom "Status" yang menampilkan status aktif/non-aktif proyek
3. Klik tombol "Aktifkan" atau "Nonaktifkan" di kolom aksi untuk mengubah status
4. Status akan berubah secara real-time dengan notifikasi sukses

## Permissions Required
- `project.update` - untuk mengubah status proyek

## Visual Indicators
- **Aktif**: Badge hijau dengan teks "Aktif"
- **Non-Aktif**: Badge merah dengan teks "Non-Aktif"
- **Tombol Toggle**: 
  - Merah "Nonaktifkan" untuk proyek aktif
  - Hijau "Aktifkan" untuk proyek non-aktif

## Database Schema
```sql
ALTER TABLE proyek ADD COLUMN is_active BOOLEAN DEFAULT true;
```

## API Endpoints
- `PATCH /api/proyek/[id]/toggle-status` - Toggle status aktif/non-aktif

## Update Filter Proyek Aktif

### API Enhancement
- Menambahkan query parameter `activeOnly=true` pada endpoint `/api/proyek`
- Ketika parameter ini digunakan, API hanya mengembalikan proyek dengan `isActive: true`

### Halaman yang Diupdate untuk Filter Proyek Aktif:
- `/backlog` - Hanya menampilkan proyek aktif di dropdown filter
- `/tasklist` - Hanya menampilkan proyek aktif di dropdown filter  
- `/reports` - Hanya menampilkan proyek aktif di dropdown filter
- `/gantt-chart-project` - Hanya menampilkan proyek aktif
- `/uat-approval` - Hanya menampilkan proyek aktif
- `/uat` - Hanya menampilkan proyek aktif
- `/calendar` - Hanya menampilkan proyek aktif
- `/tasklist-report` - Hanya menampilkan proyek aktif
- `/laporan` - Hanya menampilkan proyek aktif
- `/go-live` - Hanya menampilkan proyek aktif
- `/gantt-chart` - Hanya menampilkan proyek aktif
- `/eut` - Hanya menampilkan proyek aktif

### Halaman yang Tetap Menampilkan Semua Proyek:
- `/master/proyek` - Untuk keperluan manajemen proyek (perlu melihat semua status)

## Dampak Perubahan
- User tidak dapat lagi memilih proyek yang sudah dinonaktifkan saat membuat task/backlog baru
- Dropdown filter proyek di semua halaman operasional hanya menampilkan proyek aktif
- Halaman Master Proyek tetap menampilkan semua proyek untuk keperluan manajemen
- Proyek yang dinonaktifkan secara otomatis disembunyikan dari workflow operasional

## API Usage
```javascript
// Mendapatkan semua proyek (untuk master proyek)
fetch('/api/proyek')

// Mendapatkan hanya proyek aktif (untuk halaman operasional)
fetch('/api/proyek?activeOnly=true')
```