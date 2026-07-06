# Panduan Setup API Tasklist

## File yang Dibuat

1. **TASKLIST_API_DOCUMENTATION.md** - Dokumentasi lengkap API
2. **Tasklist_API_Postman_Collection.json** - Collection Postman
3. **Tasklist_API_Environment.json** - Environment variables untuk Postman
4. **TASKLIST_API_SETUP_GUIDE.md** - Panduan setup ini

## Cara Import ke Postman

### 1. Import Collection
1. Buka Postman
2. Klik **Import** di pojok kiri atas
3. Pilih **Upload Files**
4. Pilih file `Tasklist_API_Postman_Collection.json`
5. Klik **Import**

### 2. Import Environment
1. Di Postman, klik **Import** lagi
2. Pilih file `Tasklist_API_Environment.json`
3. Klik **Import**
4. Pilih environment "Tasklist API Environment" di dropdown pojok kanan atas

### 3. Setup Environment Variables
1. Klik ikon mata (👁️) di pojok kanan atas
2. Klik **Edit** pada "Tasklist API Environment"
3. Pastikan nilai berikut sudah benar:
   - `sessionToken`: **172dc4710ab54af8b1b405c89d6de9f0** (sudah diset)
   - `testUserId`: ID user untuk testing (default: 3)
   - `testProjectId`: ID project untuk testing (default: 1)
   - `testTaskId`: ID task untuk testing (default: 123)

**Note:** Session token sudah diset ke `172dc4710ab54af8b1b405c89d6de9f0` dan siap digunakan!

## Cara Mendapatkan Session Token

**Session token sudah diset ke: `172dc4710ab54af8b1b405c89d6de9f0`**

Jika perlu mengganti token di masa depan, berikut caranya:

### Opsi 1: Melalui Browser
1. Login ke aplikasi di browser
2. Buka Developer Tools (F12)
3. Pergi ke tab **Application** > **Cookies**
4. Cari cookie dengan nama `session`
5. Copy nilai cookie tersebut

### Opsi 2: Melalui API Login (jika ada)
```bash
curl -X POST "http://192.168.1.10:3000/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"username": "your-username", "password": "your-password"}'
```

## Struktur Collection

### 📁 Get All Tasklist
- **Get All Tasks (Basic)** - Mengambil semua task
- **Get Tasks by User ID** - Filter berdasarkan user ID
- **Get Tasks by Project ID** - Filter berdasarkan project ID
- **Get Tasks by User and Project** - Kombinasi filter user dan project
- **Get Tasks with Pagination** - Dengan pagination
- **Get Tasks by Status** - Filter berdasarkan status tunggal
- **Get Tasks by Multiple Status** - Filter berdasarkan multiple status
- **Get Tasks by Date Range** - Filter berdasarkan rentang tanggal
- **Get Tasks by Module** - Filter berdasarkan module ID
- **Get Tasks by Type** - Filter berdasarkan tipe task
- **Get Tasks with Sorting** - Dengan sorting

### 📁 Get Tasklist by ID
- **Get Tasklist by ID** - Mengambil detail task berdasarkan ID

### 📁 Task Status Management
- **Start Task** - Mulai mengerjakan task
- **Submit for Review** - Submit task untuk review
- **Pause Task** - Pause task
- **Resume Task** - Resume task yang di-pause

### 📁 Approval System
- **Approve Task** - Approve task (untuk PM/Admin)
- **Reject Task** - Reject task dengan keterangan
- **Approve with Attachment** - Approve dengan file attachment

### 📁 Complex Filters
- **Get My Tasks in Specific Project** - Task saya di project tertentu
- **Get Tasks for Review (PM)** - Task yang menunggu review
- **Get Overdue Tasks** - Task yang terlambat
- **Get Development Tasks This Month** - Task development bulan ini

## Status Task yang Tersedia

| Status Code | Status Name | Description |
|-------------|-------------|-------------|
| 0 | `MENUNGGU_PROSES_USER` | Menunggu dikerjakan user |
| 1 | `SEDANG_DIPROSES_USER` | Sedang dikerjakan user |
| 2 | `MENUNGGU_REVIEW_PM` | Menunggu review PM |
| 3 | `SELESAI` | Task selesai/approved |
| 4 | `SEDANG_DIPROSES_USER_PAUSED` | Task di-pause |

## Role-Based Access

### PROGRAMMER
- Hanya dapat melihat task mereka sendiri
- Dapat mengubah status task mereka (start, pause, resume, submit)
- Tidak dapat menggunakan filter `pegawaiId`

### PM (Project Manager)
- Dapat melihat task di project mereka
- Dapat melihat task yang mereka buat
- Dapat approve/reject task
- Dapat menggunakan filter `pegawaiId`

### ADMIN/SUPER_ADMIN
- Dapat melihat semua task
- Dapat approve/reject semua task
- Dapat menggunakan semua filter

## Contoh Skenario Testing

### 1. Testing sebagai Programmer
```
1. Get My Tasks: GET /api/tasklist
2. Start Task: PUT /api/tasklist/123 (status: SEDANG_DIPROSES_USER)
3. Submit for Review: PUT /api/tasklist/123 (status: MENUNGGU_REVIEW_PM)
```

### 2. Testing sebagai PM
```
1. Get Tasks for Review: GET /api/tasklist?status=MENUNGGU_REVIEW_PM
2. Get Task Detail: GET /api/tasklist/123
3. Approve Task: PUT /api/tasklist/123 (status: SELESAI)
```

### 3. Testing Filter Kombinasi
```
1. Get My Active Tasks: GET /api/tasklist?status=SEDANG_DIPROSES_USER,MENUNGGU_REVIEW_PM
2. Get Project Tasks: GET /api/tasklist?projectId=1&page=1&size=20
3. Get Overdue Tasks: GET /api/tasklist?to=2026-03-22&status=SEDANG_DIPROSES_USER
```

## Tips Penggunaan

1. **Selalu set environment** sebelum menjalankan request
2. **Update session token** secara berkala jika expired
3. **Gunakan test scripts** untuk validasi response
4. **Cek available actions** dalam response untuk mengetahui aksi yang bisa dilakukan
5. **Perhatikan role-based access** saat testing dengan user berbeda

## Troubleshooting

### 401 Unauthorized
- Pastikan session token valid dan tidak expired
- Login ulang untuk mendapatkan session token baru

### 403 Forbidden
- Pastikan user memiliki permission untuk aksi tersebut
- Cek role user dan ownership task

### 404 Not Found
- Pastikan task ID exists
- Cek apakah user memiliki akses ke task tersebut

### 400 Bad Request
- Cek format request body
- Pastikan status transition valid
- Validasi required fields

## Response Format

Semua response menggunakan format JSON dengan struktur:

### Success Response
```json
{
  "items": [...],  // untuk list
  "item": {...},   // untuk single item
  "total": 100,    // untuk pagination
  "page": 1,       // untuk pagination
  "size": 10       // untuk pagination
}
```

### Error Response
```json
{
  "error": "Error Type",
  "message": "Detailed error message"
}
```

## Fitur Tambahan

- **Auto Notification**: WhatsApp dan Pusher notification
- **Activity Logging**: Semua perubahan tercatat
- **UAT Auto-creation**: Otomatis buat UAT saat task selesai
- **CRM Integration**: Notifikasi ke sistem eksternal