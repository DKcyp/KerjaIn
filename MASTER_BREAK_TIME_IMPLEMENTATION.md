# Master Break Time Implementation

## Overview
Master Break Time adalah fitur untuk mengelola jadwal istirahat karyawan di sistem Logbook. Fitur ini memungkinkan admin dan PM untuk membuat, mengedit, menghapus, dan mengaktifkan/menonaktifkan jadwal istirahat dengan berbagai tipe penerapan (Global, User Spesifik, Departemen, atau Role).

## Database Schema

### Table: `master_break_time`
```sql
CREATE TABLE "master_break_time" (
    "id" SERIAL NOT NULL PRIMARY KEY,
    "nama" VARCHAR(255) NOT NULL,
    "deskripsi" TEXT,
    "jam_mulai" VARCHAR(8) NOT NULL,
    "jam_selesai" VARCHAR(8) NOT NULL,
    "tipe_penerapan" VARCHAR(50) NOT NULL DEFAULT 'GLOBAL',
    "pegawai_id" INTEGER,
    "departemen_id" INTEGER,
    "role" VARCHAR(50),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL
);
```

### Indexes
- `idx_master_break_time_active` - untuk filter status aktif/nonaktif
- `idx_master_break_time_tipe` - untuk filter tipe penerapan
- `idx_master_break_time_pegawai` - untuk lookup user spesifik
- `idx_master_break_time_departemen` - untuk lookup departemen
- `idx_master_break_time_role` - untuk lookup role

## API Endpoints

### GET /api/master-break-time
Mengambil semua data break time.

**Response:**
```json
[
  {
    "id": 1,
    "nama": "Istirahat Siang",
    "deskripsi": "Waktu istirahat siang hari",
    "jam_mulai": "12:00",
    "jam_selesai": "13:00",
    "tipe_penerapan": "GLOBAL",
    "pegawai_id": null,
    "departemen_id": null,
    "role": null,
    "is_active": true
  }
]
```

### POST /api/master-break-time
Membuat break time baru.

**Request Body:**
```json
{
  "nama": "Istirahat Siang",
  "deskripsi": "Waktu istirahat siang hari",
  "jam_mulai": "12:00",
  "jam_selesai": "13:00",
  "tipe_penerapan": "GLOBAL",
  "pegawai_id": null,
  "departemen_id": null,
  "role": null
}
```

**Response:**
```json
{
  "message": "Break time created successfully"
}
```

### PUT /api/master-break-time/[id]
Mengupdate break time yang sudah ada.

**Request Body:**
```json
{
  "nama": "Istirahat Siang Updated",
  "jam_mulai": "12:30",
  "jam_selesai": "13:30",
  "is_active": true
}
```

**Response:**
```json
{
  "message": "Break time updated successfully"
}
```

### DELETE /api/master-break-time/[id]
Menghapus break time.

**Response:**
```json
{
  "message": "Break time deleted successfully"
}
```

## Frontend Implementation

### Page: `/master-break-time`
Located at: `src/app/(admin)/master-break-time/page.tsx`

**Features:**
- View semua break time dalam bentuk table
- Create break time baru dengan modal form
- Edit break time yang sudah ada
- Delete break time
- Toggle status aktif/nonaktif
- Dark mode support
- Responsive design

**Form Fields:**
- **Nama** (required) - Nama break time
- **Deskripsi** (optional) - Deskripsi break time
- **Jam Mulai** (required) - Waktu mulai istirahat (format HH:MM)
- **Jam Selesai** (required) - Waktu selesai istirahat (format HH:MM)
- **Tipe Penerapan** (required) - Pilihan: GLOBAL, USER, DEPARTEMEN, ROLE
- **Pegawai ID** (conditional) - Muncul jika tipe = USER
- **Departemen ID** (conditional) - Muncul jika tipe = DEPARTEMEN
- **Role** (conditional) - Muncul jika tipe = ROLE

## Permissions & Access Control

### Roles yang dapat akses:
- **SUPER_ADMIN** - Full access (view, create, edit, delete)
- **PM** - Full access (view, create, edit, delete)

### Permissions:
- `master_break_time_view` - View master break time
- `master_break_time_create` - Create master break time
- `master_break_time_edit` - Edit master break time
- `master_break_time_delete` - Delete master break time

## Menu Navigation

Master Break Time dapat diakses melalui:
- **Sidebar** → Master → Master Break Time
- **Direct URL** → `/master-break-time`

## Tipe Penerapan

### 1. GLOBAL
Break time berlaku untuk semua karyawan di organisasi.
- Tidak perlu mengisi pegawai_id, departemen_id, atau role

### 2. USER (User Spesifik)
Break time berlaku untuk karyawan tertentu.
- Wajib mengisi pegawai_id
- Contoh: Break time khusus untuk user dengan ID 5

### 3. DEPARTEMEN
Break time berlaku untuk seluruh departemen tertentu.
- Wajib mengisi departemen_id
- Contoh: Break time khusus untuk departemen IT

### 4. ROLE
Break time berlaku untuk role tertentu.
- Wajib mengisi role
- Contoh: Break time khusus untuk role PM

## Implementation Details

### Database Migration
File: `prisma/migrations/20260506_add_master_break_time/migration.sql`

Migration ini membuat table `master_break_time` dengan struktur lengkap dan indexes.

### API Routes
- **GET/POST**: `src/app/api/master-break-time/route.ts`
- **PUT/DELETE**: `src/app/api/master-break-time/[id]/route.ts`

### Frontend Components
- **Page**: `src/app/(admin)/master-break-time/page.tsx`
- **Sidebar Menu**: `src/layout/AppSidebar.tsx`

## Usage Example

### Create Break Time
```javascript
const response = await fetch('/api/master-break-time', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    nama: 'Istirahat Siang',
    deskripsi: 'Waktu istirahat siang hari',
    jam_mulai: '12:00',
    jam_selesai: '13:00',
    tipe_penerapan: 'GLOBAL'
  })
});
```

### Update Break Time
```javascript
const response = await fetch('/api/master-break-time/1', {
  method: 'PUT',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    nama: 'Istirahat Siang Updated',
    jam_mulai: '12:30',
    jam_selesai: '13:30'
  })
});
```

### Delete Break Time
```javascript
const response = await fetch('/api/master-break-time/1', {
  method: 'DELETE'
});
```

### Toggle Status
```javascript
const response = await fetch('/api/master-break-time/1', {
  method: 'PUT',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    is_active: false
  })
});
```

## Testing

### Manual Testing Steps
1. Login dengan akun SUPER_ADMIN atau PM
2. Navigate ke Master → Master Break Time
3. Klik "Tambah Break Time"
4. Isi form dengan data break time
5. Klik "Simpan"
6. Verify data muncul di table
7. Klik "Edit" untuk mengubah data
8. Klik "Hapus" untuk menghapus data
9. Klik status badge untuk toggle aktif/nonaktif

### Test Cases
- ✅ Create break time dengan tipe GLOBAL
- ✅ Create break time dengan tipe USER
- ✅ Create break time dengan tipe DEPARTEMEN
- ✅ Create break time dengan tipe ROLE
- ✅ Edit break time
- ✅ Delete break time
- ✅ Toggle status aktif/nonaktif
- ✅ View all break times
- ✅ Dark mode display
- ✅ Responsive design

## Troubleshooting

### Issue: Table tidak ada di database
**Solution:** Jalankan migration dengan command:
```bash
npx prisma migrate deploy
```

### Issue: Edit/Update tidak bisa disimpan
**Solution:** Pastikan API route `/api/master-break-time/[id]/route.ts` sudah benar dan database connection aktif.

### Issue: Menu Master Break Time tidak muncul
**Solution:** 
1. Pastikan user memiliki role SUPER_ADMIN atau PM
2. Refresh page atau clear browser cache
3. Check AppSidebar.tsx untuk filter role

## Future Enhancements

- [ ] Bulk import break time dari CSV
- [ ] Bulk delete break time
- [ ] Export break time ke CSV/Excel
- [ ] Schedule break time dengan date range
- [ ] Integration dengan working hours validation
- [ ] Notification ketika break time dimulai
- [ ] Analytics untuk break time usage

## Related Files

- Database: `prisma/migrations/20260506_add_master_break_time/migration.sql`
- API: `src/app/api/master-break-time/route.ts`, `src/app/api/master-break-time/[id]/route.ts`
- Frontend: `src/app/(admin)/master-break-time/page.tsx`
- Sidebar: `src/layout/AppSidebar.tsx`
- Service: `src/lib/breakTimeService.ts`

## Notes

- Semua waktu menggunakan format 24-jam (HH:MM)
- Break time yang nonaktif tidak akan digunakan dalam validasi working hours
- Perubahan break time tidak retroaktif, hanya berlaku untuk data baru
- Setiap perubahan dicatat dengan timestamp `updated_at`
