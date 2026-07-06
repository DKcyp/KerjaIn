# Referensi API

Dokumen ini menyediakan referensi lengkap untuk semua endpoint API dalam Sistem Manajemen Logbook.

## Base URL

```
Development: http://localhost:3000/api
Production: https://your-domain.com/api
```

## Autentikasi

Semua endpoint API memerlukan autentikasi melalui session cookies. Sistem menggunakan autentikasi custom dengan dukungan SSO opsional.

### Login
```http
POST /api/auth/signin
Content-Type: application/json

{
  "username": "admin",
  "password": "admin"
}
```

**Response:**
```json
{
  "success": true,
  "user": {
    "id": 1,
    "username": "admin",
    "namaLengkap": "Administrator",
    "role": "SUPER_ADMIN"
  }
}
```

### Logout
```http
POST /api/auth/sso-logout
```

## API Manajemen Task

### Ambil Daftar Task (Tasklist)

```http
GET /api/tasklist?page=1&limit=10&search=&proyekId=&pegawaiId=&status=&tipe=&startDate=&endDate=
```

**Query Parameters:**
- `page` (number): Nomor halaman untuk paginasi
- `limit` (number): Jumlah item per halaman
- `search` (string): Cari berdasarkan nama atau kode task
- `proyekId` (number): Filter berdasarkan ID proyek
- `pegawaiId` (number): Filter berdasarkan ID user
- `status` (string): Filter berdasarkan status (MENUNGGU_PROSES_USER, SEDANG_DIPROSES_USER, dll)
- `tipe` (string): Filter berdasarkan tipe
- `startDate` (string): Filter tanggal mulai (YYYY-MM-DD)
- `endDate` (string): Filter tanggal akhir (YYYY-MM-DD)

**Response:**
```json
{
  "tasks": [
    {
      "id": 1,
      "kodeTask": "01-1",
      "namaTask": "Develop Login Feature",
      "status": "SEDANG_DIPROSES_USER",
      "scheduleAt": "2025-01-15T00:00:00.000Z",
      "pegawai": {
        "id": 4,
        "namaLengkap": "John Doe"
      },
      "proyek": {
        "id": 1,
        "namaProyek": "Project Alpha"
      }
    }
  ],
  "totalCount": 50,
  "currentPage": 1,
  "totalPages": 5
}
```

### Ambil Detail Task

```http
GET /api/tasklist/{id}
```

**Response:**
```json
{
  "id": 1,
  "kodeTask": "01-1",
  "namaTask": "Develop Login Feature",
  "keterangan": "Implement user authentication",
  "status": "SEDANG_DIPROSES_USER",
  "scheduleAt": "2025-01-15T00:00:00.000Z",
  "assigneeStartTaskDeadline": "2025-01-16T00:00:00.000Z",
  "assigneeWorkDeadline": "2025-01-20T00:00:00.000Z",
  "programmerDescription": "Working on OAuth integration",
  "pmDescription": null,
  "pegawai": {
    "id": 4,
    "namaLengkap": "John Doe",
    "role": "PROGRAMMER"
  },
  "proyek": {
    "id": 1,
    "kodeProyek": "PRJ-001",
    "namaProyek": "Project Alpha"
  },
  "logs": [
    {
      "id": 1,
      "status": "SEDANG_DIPROSES_USER",
      "keterangan": "Task started",
      "createdAt": "2025-01-15T08:00:00.000Z",
      "pegawai": {
        "namaLengkap": "John Doe"
      }
    }
  ]
}
```

### Buat Task Baru

```http
POST /api/tasklist
Content-Type: application/json

{
  "kodeTask": "01-5",
  "namaTask": "New Feature",
  "keterangan": "Feature description",
  "proyekId": 1,
  "pegawaiId": 4,
  "scheduleAt": "2025-01-20",
  "assigneeStartTaskDeadline": "2025-01-21",
  "assigneeWorkDeadline": "2025-01-25",
  "tipe": "DEVELOPMENT"
}
```

**Response:**
```json
{
  "id": 5,
  "kodeTask": "01-5",
  "namaTask": "New Feature",
  "status": "MENUNGGU_PROSES_USER"
}
```

### Update Status Task

```http
PUT /api/tasklist/{id}
Content-Type: multipart/form-data

desired=MENUNGGU_REVIEW_PM
note=Completed the feature, ready for review
photo=[file]
```

**Form Data:**
- `desired` (string): Status tujuan
- `note` (string): Deskripsi/catatan
- `photo` (file): Lampiran gambar opsional

**Response:**
```json
{
  "success": true,
  "message": "Task updated successfully"
}
```

### Hapus Task

```http
DELETE /api/tasklist/{id}
```

## API Kalender

### Ambil Task Kalender

```http
GET /api/calendar?month=2025-01&pegawaiId=4&status=SEDANG_DIPROSES_USER
```

**Query Parameters:**
- `month` (string): Bulan dalam format YYYY-MM
- `pegawaiId` (number): Filter berdasarkan ID user
- `status` (string): Filter berdasarkan status

**Response:**
```json
{
  "tasks": [
    {
      "id": 1,
      "title": "Develop Login Feature",
      "start": "2025-01-15",
      "status": "SEDANG_DIPROSES_USER",
      "backgroundColor": "#3B82F6",
      "borderColor": "#2563EB"
    }
  ]
}
```

### Ambil Daftar User Kalender

```http
GET /api/calendar/pegawai
```

**Response:**
```json
{
  "users": [
    {
      "id": 1,
      "namaLengkap": "Administrator",
      "role": "SUPER_ADMIN"
    },
    {
      "id": 4,
      "namaLengkap": "John Doe",
      "role": "PROGRAMMER"
    }
  ]
}
```

## API Proyek

### Ambil Daftar Proyek

```http
GET /api/proyek
```

**Response:**
```json
{
  "projects": [
    {
      "id": 1,
      "kodeProyek": "PRJ-001",
      "namaProyek": "Project Alpha",
      "client": "Client A",
      "pic": "Jane Smith",
      "type": "DEVELOPMENT"
    }
  ]
}
```

### Buat Proyek Baru

```http
POST /api/proyek
Content-Type: application/json

{
  "kodeProyek": "PRJ-002",
  "namaProyek": "Project Beta",
  "client": "Client B",
  "pic": "John Manager",
  "type": "DEVELOPMENT"
}
```

## API User (Pegawai)

### Ambil Daftar User

```http
GET /api/pegawai?role=PROGRAMMER
```

**Query Parameters:**
- `role` (string): Filter berdasarkan peran (SUPER_ADMIN, ADMIN, PM, PROGRAMMER)

**Response:**
```json
{
  "users": [
    {
      "id": 4,
      "namaLengkap": "John Doe",
      "username": "john.doe",
      "role": "PROGRAMMER",
      "noHp": "08123456789"
    }
  ]
}
```

### Buat User Baru

```http
POST /api/pegawai
Content-Type: application/json

{
  "namaLengkap": "New User",
  "username": "new.user",
  "password": "password123",
  "role": "PROGRAMMER",
  "noHp": "08123456789"
}
```

### Update User

```http
PUT /api/pegawai/{id}
Content-Type: application/json

{
  "namaLengkap": "Updated Name",
  "role": "PM"
}
```

## API Laporan

### Ambil Laporan Task

```http
GET /api/laporan?startDate=2025-01-01&endDate=2025-01-31&proyekId=1&pegawaiId=4&status=SELESAI
```

**Query Parameters:**
- `startDate` (string): Tanggal mulai (YYYY-MM-DD)
- `endDate` (string): Tanggal akhir (YYYY-MM-DD)
- `proyekId` (number): Filter berdasarkan proyek
- `pegawaiId` (number): Filter berdasarkan user
- `status` (string): Filter berdasarkan status

**Response:**
```json
{
  "tasks": [...],
  "summary": {
    "total": 50,
    "completed": 30,
    "inProgress": 15,
    "waiting": 5
  }
}
```

### Export Laporan Excel

```http
GET /api/laporan/export?startDate=2025-01-01&endDate=2025-01-31
```

**Response:** Download file Excel

## Kode Status HTTP

| Kode | Deskripsi |
|------|-------------|
| 200 | Sukses |
| 201 | Dibuat |
| 400 | Bad Request |
| 401 | Tidak Terautentikasi |
| 403 | Forbidden |
| 404 | Tidak Ditemukan |
| 500 | Internal Server Error |

## Format Response Error

```json
{
  "error": "Deskripsi pesan error",
  "details": "Detail error tambahan (opsional)"
}
```

## Nilai Status Task

| Status | Deskripsi |
|--------|-------------|
| `MENUNGGU_PROSES_USER` | Menunggu programmer untuk memulai |
| `SEDANG_DIPROSES_USER` | Sedang dikerjakan oleh programmer |
| `SEDANG_DIPROSES_USER_PAUSED` | Dijeda oleh programmer |
| `MENUNGGU_REVIEW_PM` | Menunggu review PM |
| `SELESAI` | Selesai |

## Nilai Peran

| Peran | Deskripsi |
|------|-------------|
| `SUPER_ADMIN` | Akses penuh sistem |
| `ADMIN` | Akses administratif |
| `PM` | Project Manager |
| `PROGRAMMER` | Developer/Programmer |

## Rate Limiting

Saat ini, belum ada rate limiting yang diimplementasikan. Ini mungkin akan ditambahkan di versi mendatang.

## Webhooks

Dukungan webhook direncanakan untuk rilis mendatang untuk mengaktifkan notifikasi real-time.

## Contoh Penggunaan

### Alur Lengkap Task (JavaScript)

```javascript
// 1. Mulai task
const startResponse = await fetch('/api/tasklist/1', {
  method: 'PUT',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    desired: 'SEDANG_DIPROSES_USER',
    note: 'Mulai mengerjakan task ini'
  })
});

// 2. Kirim untuk review
const formData = new FormData();
formData.append('desired', 'MENUNGGU_REVIEW_PM');
formData.append('note', 'Selesai, siap untuk review');
formData.append('photo', fileInput.files[0]);

const reviewResponse = await fetch('/api/tasklist/1', {
  method: 'PUT',
  body: formData
});

// 3. PM approve
const approveResponse = await fetch('/api/tasklist/1', {
  method: 'PUT',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    desired: 'SELESAI',
    note: 'Disetujui, kerja bagus!'
  })
});
```

### Ambil Task dengan Filter (TypeScript)

```typescript
interface TaskFilters {
  page?: number;
  limit?: number;
  search?: string;
  proyekId?: number;
  pegawaiId?: number;
  status?: string;
}

async function fetchTasks(filters: TaskFilters) {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined) {
      params.append(key, String(value));
    }
  });

  const response = await fetch(`/api/tasklist?${params}`);
  return response.json();
}

// Penggunaan
const tasks = await fetchTasks({
  page: 1,
  limit: 20,
  status: 'SEDANG_DIPROSES_USER',
  proyekId: 1
});
```

---

Untuk informasi lebih lanjut, lihat [README.md](./README.md) atau cek source code di direktori `app/api/`.
