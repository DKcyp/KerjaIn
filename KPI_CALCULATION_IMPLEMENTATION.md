# Implementasi KPI Calculation API

## Overview
Sistem kalkulasi KPI untuk programmer berdasarkan 4 indikator utama dengan total bobot 100%.

## Formula KPI

### 1. Task Selesai (30%)
```
TS = (Total Tasklist Selesai / Total Tasklist) × 100%
KPI = TS% × 30%
```

### 2. Task Tepat Waktu (40%)
```
TTW = (Total Tasklist Tepat Waktu / Total Tasklist) × 100%
KPI = TTW% × 40%
```
**Kriteria Tepat Waktu**: Jam akhir jadwal (calculatedDueDate) ≥ Jam kirim review terakhir (tasklistHistory dengan status MENUNGGU_REVIEW_PM)

### 3. Waktu Pengerjaan (20%)
```
WP = (Total Jam Jadwal Tasklist / Total Jam Absen) × 100%
KPI = WP% × 20%
```

### 4. Task Revisi (10%)
```
TR = (Total Aksi Revisi per Tasklist / Total Tasklist) × 100%
KPI = 10 - (TR% × 10 / 100)
```
**Note**: Semakin rendah revisi, semakin tinggi skor

### Total KPI Score
```
Total = Task Selesai + Task Tepat Waktu + Waktu Pengerjaan + Task Revisi
```

## API Endpoint

### GET /api/external/kpi-calculation

**Authentication**: Bearer Token (dari login)

**Query Parameters**:
- `pegawaiId` (optional): ID programmer yang akan dihitung KPI-nya
  - Jika tidak ada, akan menggunakan user yang sedang login
  - PROGRAMMER hanya bisa melihat KPI sendiri
  - PM bisa melihat KPI anggota timnya
  - SUPER_ADMIN bisa melihat KPI semua programmer
- `startDate` (optional): Tanggal mulai periode (YYYY-MM-DD)
- `endDate` (optional): Tanggal akhir periode (YYYY-MM-DD)
- `startTime` (optional): Jam mulai (HH:mm, default: 00:00)
- `endTime` (optional): Jam akhir (HH:mm, default: 23:59)

**Response**:
```json
{
  "success": true,
  "data": {
    "programmer": {
      "id": 5,
      "name": "John Doe",
      "username": "john.doe"
    },
    "period": {
      "startDate": "2026-04-01T00:00:00.000Z",
      "endDate": "2026-04-30T23:59:59.999Z",
      "startTime": "00:00",
      "endTime": "23:59"
    },
    "kpi": {
      "taskSelesai": {
        "percentage": 85.5,
        "score": 25.65,
        "weight": 30
      },
      "taskTepatWaktu": {
        "percentage": 78.2,
        "score": 31.28,
        "weight": 40
      },
      "waktuPengerjaan": {
        "percentage": 92.3,
        "score": 18.46,
        "weight": 20
      },
      "taskRevisi": {
        "percentage": 15.5,
        "score": 8.45,
        "weight": 10
      },
      "totalScore": 83.84
    },
    "metrics": {
      "totalTasklist": 45,
      "totalTasklistSelesai": 38,
      "totalTasklistTepatWaktu": 35,
      "totalTasklistRevisi": 7,
      "totalJamJadwal": 156.5,
      "totalJamAbsen": 169.5
    }
  }
}
```

## Authorization Rules

1. **PROGRAMMER**: Hanya bisa melihat KPI sendiri
   - Jika `pegawaiId` tidak diberikan → gunakan ID user yang login
   - Jika `pegawaiId` diberikan dan berbeda dengan ID user → 403 Forbidden

2. **PM**: Bisa melihat KPI anggota timnya
   - Jika `pegawaiId` tidak diberikan → gunakan ID user yang login
   - Jika `pegawaiId` diberikan → cek apakah programmer tersebut ada di tim PM
   - Jika bukan anggota tim → 403 Forbidden

3. **SUPER_ADMIN**: Bisa melihat KPI semua programmer
   - Tidak ada pembatasan akses

## Integrasi di Dashboard

### Dashboard Programmer
- KPI ditampilkan di section "4 Indikator Utama KPI"
- Data di-fetch otomatis saat halaman dimuat
- Data di-refresh saat periode tanggal diubah
- Menggunakan bearer token dari session cookie

### Dashboard PM
- Bisa melihat KPI anggota timnya
- Pilih programmer dari dropdown
- Data di-fetch dengan parameter `pegawaiId`

### Dashboard Super Admin
- Bisa melihat KPI semua programmer
- Pilih programmer dari dropdown
- Data di-fetch dengan parameter `pegawaiId`

## Postman Collection

File: `KPI_CALCULATION_API.postman_collection.json`

### Setup Environment
1. Buat environment baru di Postman
2. Tambahkan variable:
   - `base_url`: http://localhost:3000 (atau URL server Anda)
   - `bearer_token`: (akan diisi otomatis setelah login)

### Cara Penggunaan
1. **Login terlebih dahulu**:
   - Pilih endpoint "Login - Get Bearer Token"
   - Ubah username dan password sesuai user Anda
   - Klik Send
   - Bearer token akan otomatis tersimpan di environment variable

2. **Get KPI**:
   - Pilih salah satu endpoint KPI
   - Bearer token sudah otomatis digunakan dari environment
   - Sesuaikan query parameters jika perlu
   - Klik Send

### Endpoints Available
- **Authentication**:
  - Login - Get Bearer Token
  - Login - Programmer
  - Login - PM
  - Login - Super Admin

- **KPI Calculation**:
  - Get My KPI - Current User (30 hari terakhir)
  - Get My KPI - Custom Date Range
  - Get My KPI - With Time Range
  - Get Specific Programmer KPI - By Admin/PM
  - Get KPI - This Month

## Testing

### Test Case 1: Programmer melihat KPI sendiri
```bash
# Login sebagai programmer
POST /api/auth/login
{
  "username": "programmer1",
  "password": "password123"
}

# Get KPI (tanpa pegawaiId)
GET /api/external/kpi-calculation?startDate=2026-04-01&endDate=2026-04-30
Authorization: Bearer {token}

# Expected: Success, menampilkan KPI programmer1
```

### Test Case 2: Programmer mencoba melihat KPI orang lain
```bash
# Login sebagai programmer1
POST /api/auth/login
{
  "username": "programmer1",
  "password": "password123"
}

# Get KPI programmer lain
GET /api/external/kpi-calculation?pegawaiId=10
Authorization: Bearer {token}

# Expected: 403 Forbidden
```

### Test Case 3: PM melihat KPI anggota timnya
```bash
# Login sebagai PM
POST /api/auth/login
{
  "username": "pm1",
  "password": "password123"
}

# Get KPI anggota tim
GET /api/external/kpi-calculation?pegawaiId=5&startDate=2026-04-01&endDate=2026-04-30
Authorization: Bearer {token}

# Expected: Success jika programmer ID 5 ada di tim PM
```

### Test Case 4: Super Admin melihat KPI semua programmer
```bash
# Login sebagai Super Admin
POST /api/auth/login
{
  "username": "admin",
  "password": "admin123"
}

# Get KPI programmer manapun
GET /api/external/kpi-calculation?pegawaiId=5&startDate=2026-04-01&endDate=2026-04-30
Authorization: Bearer {token}

# Expected: Success
```

## Files Modified/Created

### Created:
1. `src/app/api/external/kpi-calculation/route.ts` - API endpoint
2. `KPI_CALCULATION_API.postman_collection.json` - Postman collection
3. `KPI_CALCULATION_IMPLEMENTATION.md` - Dokumentasi ini

### Modified:
1. `src/app/(admin)/project-dashboard/page.tsx` - Integrasi KPI di dashboard programmer
2. `src/app/(admin)/page.tsx` - Removed KPI widget

### Deleted:
1. `src/components/dashboard/KPICalculationWidget.tsx` - Widget tidak digunakan lagi

## Notes

- Bearer token didapat dari cookie `session` setelah login
- Token otomatis di-verify di API endpoint
- Periode default adalah 30 hari terakhir jika tidak ada parameter tanggal
- Semua perhitungan dilakukan di server-side untuk keamanan
- Data absensi digunakan untuk menghitung total jam kerja
- Task history digunakan untuk menentukan waktu kirim review terakhir
