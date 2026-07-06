# Dokumentasi API Tasklist

## Overview
API Tasklist menyediakan endpoint untuk mengelola task/tugas dalam sistem logbook. API ini mendukung operasi CRUD lengkap dengan sistem approval, filtering berdasarkan user dan project, serta role-based access control.

## Base URL
```
http://192.168.1.10:3000/api/tasklist
```

## Authentication
Semua endpoint memerlukan autentikasi melalui session cookie. Pastikan untuk menyertakan cookie session yang valid dalam setiap request.

## Endpoints

### 1. Get Approval Queue (PM/Manager Only)
**Endpoint:** `GET /api/tasklist/approval-queue`

**Deskripsi:** Endpoint khusus untuk PM/Manager mendapatkan daftar task yang perlu di-approve (status MENUNGGU_REVIEW_PM).

**Query Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `projectId` | number | No | Filter berdasarkan ID project |
| `moduleId` | number | No | Filter berdasarkan ID module |
| `pegawaiId` | number | No | Filter berdasarkan ID assignee |
| `page` | number | No | Nomor halaman (default: 1) |
| `size` | number | No | Jumlah item per halaman (default: 10) |
| `sortKey` | string | No | Field untuk sorting (default: scheduleAt) |
| `sortDir` | string | No | Arah sorting (asc/desc, default: asc) |

**Role Access:**
- **PM:** Hanya task di project mereka atau task yang mereka buat
- **ADMIN/SUPER_ADMIN:** Semua task yang perlu approval

**Response:**
```json
{
  "items": [
    {
      "id": 123,
      "kode": "01.02 - 1",
      "projectId": 1,
      "moduleId": 2,
      "pegawaiId": 3,
      "createdBy": 5,
      "status": "MENUNGGU_REVIEW_PM",
      "statusCode": 3,
      "statusText": "Menunggu Review PM",
      "proyekNama": "Project Name",
      "moduleNama": "Module Name",
      "moduleKode": "01.02",
      "pegawaiNama": "Assignee Name",
      "creatorNama": "Creator Name",
      "scheduleAt": "2026-03-23T00:00:00.000Z",
      "createdAt": "2026-03-20T10:00:00.000Z",
      "updatedAt": "2026-03-22T15:30:00.000Z",
      "keterangan": "Task description",
      "taskComplexity": "MEDIUM",
      "estimatedHours": 8,
      "tasklistType": "DEVELOPMENT",
      "availableActions": ["approve", "reject"],
      "waitingDays": 1,
      "isOverdue": false
    }
  ],
  "total": 25,
  "page": 1,
  "size": 10,
  "summary": {
    "totalPending": 25,
    "overdueCount": 3,
    "avgWaitingDays": 2
  },
  "hasNextPage": true,
  "hasPrevPage": false
}
```

### 2. Get Approval Statistics
**Endpoint:** `GET /api/tasklist/approval-stats`

**Deskripsi:** Mendapatkan statistik approval untuk dashboard PM/Manager.

**Query Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `projectId` | number | No | Filter berdasarkan ID project |
| `period` | number | No | Periode dalam hari (default: 30, max: 365) |

**Response:**
```json
{
  "summary": {
    "pendingApprovals": 25,
    "overdueApprovals": 3,
    "approvedTasks": 45,
    "rejectedTasks": 5,
    "avgApprovalTimeHours": 4.5,
    "period": "30 days"
  },
  "statusBreakdown": [
    {
      "status": "MENUNGGU_REVIEW_PM",
      "count": 25,
      "percentage": 35
    },
    {
      "status": "SELESAI",
      "count": 45,
      "percentage": 65
    }
  ],
  "topAssignees": [
    {
      "pegawaiId": 3,
      "pegawaiNama": "John Doe",
      "pendingCount": 8
    }
  ],
  "dailyTrend": [
    {
      "date": "2026-03-17",
      "count": 5
    },
    {
      "date": "2026-03-18",
      "count": 3
    }
  ],
  "generatedAt": "2026-03-23T10:00:00.000Z",
  "userId": 5,
  "userRole": "PM"
}
```

### 3. Get All Tasklist
**Endpoint:** `GET /api/tasklist`

**Deskripsi:** Mengambil daftar tasklist dengan berbagai filter dan pagination.

**Query Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `projectId` | number | No | Filter berdasarkan ID project |
| `pegawaiId` | number | No | Filter berdasarkan ID user/pegawai (hanya untuk SUPER_ADMIN, PM, ADMIN) |
| `moduleId` | number | No | Filter berdasarkan ID module |
| `status` | string | No | Filter berdasarkan status (bisa multiple dengan comma-separated) |
| `tasklistType` | string | No | Filter berdasarkan tipe task (BLUEPRINT, DEVELOPMENT, MAINTENANCE) |
| `from` | string | No | Filter tanggal mulai (YYYY-MM-DD) |
| `to` | string | No | Filter tanggal akhir (YYYY-MM-DD) |
| `page` | number | No | Nomor halaman (default: 1) |
| `size` | number | No | Jumlah item per halaman (default: 10) |
| `sortKey` | string | No | Field untuk sorting |
| `sortDir` | string | No | Arah sorting (asc/desc) |
| `showAll` | boolean | No | Tampilkan semua task termasuk yang sudah selesai |

**Status Values:**
- `MENUNGGU_PROSES_USER` (0)
- `SEDANG_DIPROSES_USER` (1) 
- `MENUNGGU_REVIEW_PM` (2)
- `SELESAI` (3)
- `SEDANG_DIPROSES_USER_PAUSED` (4)

**Response:**
```json
{
  "items": [
    {
      "id": 1,
      "kode": "01.02 - 1",
      "projectId": 1,
      "moduleId": 2,
      "pegawaiId": 3,
      "status": "SEDANG_DIPROSES_USER",
      "statusCode": 1,
      "statusText": "Sedang Diproses",
      "proyekNama": "Project Name",
      "moduleNama": "Module Name",
      "pegawaiNama": "User Name",
      "scheduleAt": "2026-03-23T00:00:00.000Z",
      "keterangan": "Task description",
      "availableActions": ["pause", "complete", "edit"]
    }
  ],
  "total": 100,
  "page": 1,
  "size": 10
}
```

**Role-Based Access:**
- **PROGRAMMER:** Hanya dapat melihat task mereka sendiri
- **PM:** Dapat melihat task di project mereka atau task yang mereka buat
- **ADMIN/SUPER_ADMIN:** Dapat melihat semua task dan menggunakan filter pegawaiId

### 4. Get Tasklist by ID
**Endpoint:** `GET /api/tasklist/{id}`

**Deskripsi:** Mengambil detail tasklist berdasarkan ID.

**Path Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | number | Yes | ID tasklist |

**Response:**
```json
{
  "item": {
    "id": 1,
    "kode": "01.02 - 1",
    "projectId": 1,
    "moduleId": 2,
    "pegawaiId": 3,
    "status": "SEDANG_DIPROSES_USER",
    "statusCode": 1,
    "statusText": "Sedang Diproses",
    "proyekNama": "Project Name",
    "moduleNama": "Module Name",
    "pegawaiNama": "User Name",
    "scheduleAt": "2026-03-23T00:00:00.000Z",
    "keterangan": "Task description",
    "availableActions": ["pause", "complete", "edit", "delete"]
  }
}
```

### 5. Update Tasklist Status (Approval/Rejection)
**Endpoint:** `PUT /api/tasklist/{id}`

**Deskripsi:** Mengubah status tasklist termasuk untuk approval dan rejection.

**Path Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | number | Yes | ID tasklist |

**Request Body (JSON):**
```json
{
  "status": "SELESAI",
  "keterangan": "Task approved - good work!"
}
```

**Request Body (Multipart - dengan file):**
```
Content-Type: multipart/form-data

status=SELESAI
keterangan=Task approved with attachment
image=<file>
```

**Status Transitions yang Diizinkan:**
| From Status | To Status | Description | Required Role |
|-------------|-----------|-------------|---------------|
| `MENUNGGU_PROSES_USER` | `SEDANG_DIPROSES_USER` | Start task | Assignee |
| `SEDANG_DIPROSES_USER` | `MENUNGGU_REVIEW_PM` | Submit for review | Assignee |
| `MENUNGGU_REVIEW_PM` | `SELESAI` | Approve task | PM/Creator |
| `MENUNGGU_REVIEW_PM` | `MENUNGGU_PROSES_USER` | Reject task | PM/Creator |
| `SEDANG_DIPROSES_USER` | `SEDANG_DIPROSES_USER_PAUSED` | Pause task | Assignee |
| `SEDANG_DIPROSES_USER_PAUSED` | `SEDANG_DIPROSES_USER` | Resume task | Assignee |

**Response:**
```json
{
  "item": {
    "id": 1,
    "status": "SELESAI",
    "kode": "01.02 - 1",
    "projectId": 1,
    "moduleId": 2,
    "pegawaiId": 3,
    "availableActions": ["edit", "delete"]
  }
}
```

## Available Actions
API mengembalikan array `availableActions` yang menunjukkan aksi yang dapat dilakukan user:

| Action | Description | Required Role |
|--------|-------------|---------------|
| `start` | Mulai mengerjakan task | Assignee |
| `pause` | Pause task yang sedang dikerjakan | Assignee |
| `resume` | Resume task yang di-pause | Assignee |
| `complete` | Submit task untuk review | Assignee |
| `approve` | Approve task | PM/Creator |
| `reject` | Reject task | PM/Creator |
| `edit` | Edit task | Creator/PM/Admin |
| `delete` | Delete task | Creator/PM/Admin |

## Error Responses

### 400 Bad Request
```json
{
  "error": "Invalid status transition",
  "message": "Cannot change status from SELESAI to SEDANG_DIPROSES_USER"
}
```

### 401 Unauthorized
```json
{
  "error": "Unauthorized",
  "message": "Please login to access this resource"
}
```

### 403 Forbidden
```json
{
  "error": "Forbidden",
  "message": "You don't have permission to perform this action"
}
```

### 404 Not Found
```json
{
  "error": "Not Found",
  "message": "Tasklist not found"
}
```

## Contoh Penggunaan

### 1. Get Approval Queue for PM
```bash
curl -X GET "http://192.168.1.10:3000/api/tasklist/approval-queue" \
  -H "Cookie: session=172dc4710ab54af8b1b405c89d6de9f0"
```

### 2. Get Approval Queue with Filters
```bash
curl -X GET "http://192.168.1.10:3000/api/tasklist/approval-queue?projectId=1&page=1&size=20" \
  -H "Cookie: session=172dc4710ab54af8b1b405c89d6de9f0"
```

### 3. Get Approval Statistics
```bash
curl -X GET "http://192.168.1.10:3000/api/tasklist/approval-stats?period=30" \
  -H "Cookie: session=172dc4710ab54af8b1b405c89d6de9f0"
```

### 4. Get Approval Stats for Specific Project
```bash
curl -X GET "http://192.168.1.10:3000/api/tasklist/approval-stats?projectId=1&period=7" \
  -H "Cookie: session=172dc4710ab54af8b1b405c89d6de9f0"
```

### 5. Get Tasks by User ID
```bash
curl -X GET "http://192.168.1.10:3000/api/tasklist?pegawaiId=3" \
  -H "Cookie: session=172dc4710ab54af8b1b405c89d6de9f0"
```

### 6. Get Tasks by Project ID
```bash
curl -X GET "http://192.168.1.10:3000/api/tasklist?projectId=1" \
  -H "Cookie: session=172dc4710ab54af8b1b405c89d6de9f0"
```

### 7. Get Tasks by User and Project
```bash
curl -X GET "http://192.168.1.10:3000/api/tasklist?pegawaiId=3&projectId=1" \
  -H "Cookie: session=172dc4710ab54af8b1b405c89d6de9f0"
```

### 8. Get Tasks with Pagination
```bash
curl -X GET "http://192.168.1.10:3000/api/tasklist?pegawaiId=3&page=1&size=20" \
  -H "Cookie: session=172dc4710ab54af8b1b405c89d6de9f0"
```

### 9. Get Tasks by Status
```bash
curl -X GET "http://192.168.1.10:3000/api/tasklist?status=SEDANG_DIPROSES_USER" \
  -H "Cookie: session=172dc4710ab54af8b1b405c89d6de9f0"
```

### 10. Get Tasks by Multiple Statuses
```bash
curl -X GET "http://192.168.1.10:3000/api/tasklist?status=SEDANG_DIPROSES_USER,MENUNGGU_REVIEW_PM" \
  -H "Cookie: session=172dc4710ab54af8b1b405c89d6de9f0"
```

### 11. Approve Task
```bash
curl -X PUT "http://192.168.1.10:3000/api/tasklist/123" \
  -H "Content-Type: application/json" \
  -H "Cookie: session=172dc4710ab54af8b1b405c89d6de9f0" \
  -d '{"status": "SELESAI", "keterangan": "Task approved!"}'
```

### 12. Reject Task
```bash
curl -X PUT "http://192.168.1.10:3000/api/tasklist/123" \
  -H "Content-Type: application/json" \
  -H "Cookie: session=172dc4710ab54af8b1b405c89d6de9f0" \
  -d '{"status": "MENUNGGU_PROSES_USER", "keterangan": "Please fix the issues mentioned"}'
```

## Fitur Tambahan

### 1. Notification System
- Otomatis mengirim notifikasi WhatsApp saat status berubah
- Notifikasi real-time melalui Pusher
- Notifikasi ke sistem CRM eksternal

### 2. Activity Logging
- Semua perubahan status dicatat dalam log
- Tracking siapa yang melakukan perubahan dan kapan

### 3. UAT Auto-creation
- Otomatis membuat UAT test saat task selesai
- Terintegrasi dengan sistem testing

### 4. Permission Validation
- Validasi berdasarkan role user
- Validasi berdasarkan jabatan di ProyekTeam
- Validasi ownership task

## Notes
- Semua timestamp menggunakan format ISO 8601
- Pagination dimulai dari page 1
- Default page size adalah 10 items
- Maximum page size adalah 100 items
- Filter date menggunakan format YYYY-MM-DD
- Status dapat dikombinasikan dengan comma-separated values