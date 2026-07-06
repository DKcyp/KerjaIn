# Bacara Log API Documentation

API untuk mengakses dan menganalisis log aktivitas Bacara/Blueprint.

## Base URL
```
http://localhost:3000/api/bacara-log
```

---

## Endpoints

### 1. Get All Bacara Logs (with Filtering & Pagination)

Mengambil daftar log bacara dengan filter dan pagination.

**Endpoint:** `GET /api/bacara-log`

#### Query Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `projectId` | integer | **Yes*** | - | Filter berdasarkan project ID |
| `baId` | integer | **Yes*** | - | Filter berdasarkan BA ID |
| `statusBa` | string | No | - | Filter berdasarkan status BA (optional) |
| `page` | integer | No | 1 | Halaman yang ingin diambil |
| `limit` | integer | No | 50 | Jumlah data per halaman (max 100) |
| `moduleId` | integer | No | - | Filter berdasarkan module ID |
| `taskId` | integer | No | - | Filter berdasarkan task ID |
| `userId` | integer | No | - | Filter berdasarkan user ID |
| `actionType` | string | No | - | Filter berdasarkan tipe aksi (CREATE_BA, UPDATE_BA, dll) |
| `isError` | boolean | No | - | Filter error (true/false) |
| `httpMethod` | string | No | - | Filter berdasarkan HTTP method (GET, POST, PUT, DELETE) |
| `startDate` | string | No | - | Filter tanggal mulai (ISO 8601 format) |
| `endDate` | string | No | - | Filter tanggal akhir (ISO 8601 format) |
| `search` | string | No | - | Pencarian di endpoint, actionDescription, errorMessage |

**Note:** *Minimal salah satu dari `projectId` atau `baId` harus diisi.

#### Example Request

```bash
# Get logs by project ID (required)
GET /api/bacara-log?projectId=5

# Get logs by BA ID (required)
GET /api/bacara-log?baId=123

# Get logs by project with pagination
GET /api/bacara-log?projectId=5&page=1&limit=20

# Get logs by BA with specific status (optional)
GET /api/bacara-log?baId=123&statusBa=PENGAJUAN

# Get logs by project and status
GET /api/bacara-log?projectId=5&statusBa=DEVELOPMENT

# Get error logs for specific BA
GET /api/bacara-log?baId=123&isError=true

# Get logs by project with action type filter
GET /api/bacara-log?projectId=5&actionType=UPDATE_BA

# Get logs with date range
GET /api/bacara-log?projectId=5&startDate=2024-01-01&endDate=2024-12-31

# Get logs with search
GET /api/bacara-log?baId=123&search=blueprint

# Combined filters - project, status, and date range
GET /api/bacara-log?projectId=5&statusBa=PENGAJUAN&startDate=2024-01-01&page=1&limit=25

# Combined filters - BA, status, and action type
GET /api/bacara-log?baId=123&statusBa=DEVELOPMENT&actionType=APPROVE_BA&isError=false
```

#### Response Success (200)

```json
{
  "success": true,
  "data": {
    "logs": [
      {
        "id": 1,
        "endpoint": "/api/blueprint-baru/5/ba",
        "httpMethod": "POST",
        "requestUrl": "http://localhost:3000/api/blueprint-baru/5/ba",
        "requestHeaders": {
          "content-type": "application/json",
          "user-agent": "Mozilla/5.0..."
        },
        "requestParams": {
          "nama": "BA Testing",
          "version": "1.0.0"
        },
        "responseStatusCode": 200,
        "responseHeaders": null,
        "responseTimeMs": 245,
        "isError": false,
        "errorMessage": null,
        "errorCode": null,
        "projectId": 5,
        "baId": 123,
        "moduleId": null,
        "taskId": null,
        "userId": 1,
        "userName": "John Doe",
        "userIp": "192.168.1.100",
        "userAgent": "Mozilla/5.0...",
        "sessionId": null,
        "requestId": "req_1234567890_abc123",
        "actionType": "CREATE_BA",
        "actionDescription": "Created new BA: BA Testing v1.0.0",
        "statusBa": "DRAFT",
        "oldStatusBa": null,
        "newStatusBa": "DRAFT",
        "createdAt": "2024-01-15T10:30:00.000Z",
        "bacara": {
          "id": 123,
          "nama": "BA Testing",
          "version": "1.0.0",
          "type": "BERITA_ACARA",
          "status": "DRAFT",
          "project": {
            "id": 5,
            "namaProyek": "Project Alpha",
            "kodeProyek": "PROJ-001"
          }
        }
      }
    ],
    "pagination": {
      "currentPage": 1,
      "totalPages": 10,
      "totalCount": 250,
      "limit": 25,
      "hasNextPage": true,
      "hasPrevPage": false
    }
  }
}
```

#### Response Error (400)

```json
{
  "success": false,
  "error": "Either projectId or baId is required",
  "message": "Please provide at least one filter: projectId or baId"
}
```

#### Response Error (500)

```json
{
  "success": false,
  "error": "Failed to fetch bacara logs",
  "details": "Database connection error"
}
```

---

### 2. Get Single Bacara Log by ID

Mengambil detail log bacara berdasarkan ID dengan informasi lengkap.

**Endpoint:** `GET /api/bacara-log/:id`

#### Path Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | integer | Yes | Log ID |

#### Example Request

```bash
GET /api/bacara-log/123
```

#### Response Success (200)

```json
{
  "success": true,
  "data": {
    "id": 123,
    "endpoint": "/api/blueprint-baru/5/ba/status",
    "httpMethod": "PUT",
    "requestUrl": "http://localhost:3000/api/blueprint-baru/5/ba/status",
    "requestHeaders": {
      "content-type": "application/json"
    },
    "requestParams": {
      "status": "PENGAJUAN"
    },
    "responseStatusCode": 200,
    "responseHeaders": null,
    "responseTimeMs": 180,
    "isError": false,
    "errorMessage": null,
    "errorCode": null,
    "projectId": 5,
    "baId": 45,
    "moduleId": null,
    "taskId": null,
    "userId": 1,
    "userName": "John Doe",
    "userIp": "192.168.1.100",
    "userAgent": "Mozilla/5.0...",
    "sessionId": null,
    "requestId": "req_1234567890_xyz789",
    "actionType": "UPDATE_BA_STATUS",
    "actionDescription": "Updated BA status from DRAFT to PENGAJUAN",
    "statusBa": "PENGAJUAN",
    "oldStatusBa": "DRAFT",
    "newStatusBa": "PENGAJUAN",
    "createdAt": "2024-01-15T11:00:00.000Z",
    "bacara": {
      "id": 45,
      "nama": "BA Module Payment",
      "version": "1.0.0",
      "type": "BERITA_ACARA",
      "status": "PENGAJUAN",
      "deskripsi": "Payment module implementation",
      "createdAt": "2024-01-10T08:00:00.000Z",
      "updatedAt": "2024-01-15T11:00:00.000Z",
      "project": {
        "id": 5,
        "namaProyek": "Project Alpha",
        "kodeProyek": "PROJ-001",
        "client": "PT. Example Corp",
        "pic": "Jane Smith"
      },
      "baModules": [
        {
          "id": 1,
          "nama": "Payment Gateway",
          "level": 1
        },
        {
          "id": 2,
          "nama": "Payment History",
          "level": 2
        }
      ]
    }
  }
}
```

#### Response Error (404)

```json
{
  "success": false,
  "error": "Log not found"
}
```

#### Response Error (400)

```json
{
  "success": false,
  "error": "Invalid log ID"
}
```

---

### 3. Get Bacara Log Statistics

Mengambil statistik dan analisis log bacara.

**Endpoint:** `GET /api/bacara-log/stats`

#### Query Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `projectId` | integer | No | Filter berdasarkan project ID |
| `baId` | integer | No | Filter berdasarkan BA ID |
| `startDate` | string | No | Filter tanggal mulai (ISO 8601) |
| `endDate` | string | No | Filter tanggal akhir (ISO 8601) |

#### Example Request

```bash
# Get all statistics
GET /api/bacara-log/stats

# Get statistics for specific project
GET /api/bacara-log/stats?projectId=5

# Get statistics for date range
GET /api/bacara-log/stats?startDate=2024-01-01&endDate=2024-01-31

# Get statistics for specific BA
GET /api/bacara-log/stats?baId=123
```

#### Response Success (200)

```json
{
  "success": true,
  "data": {
    "overview": {
      "totalLogs": 1250,
      "totalErrors": 45,
      "totalSuccess": 1205,
      "errorRate": "3.60%"
    },
    "performance": {
      "avgResponseTimeMs": 234,
      "maxResponseTimeMs": 1500,
      "minResponseTimeMs": 50
    },
    "actionTypes": [
      {
        "actionType": "CREATE_BA",
        "count": 350
      },
      {
        "actionType": "UPDATE_BA",
        "count": 280
      },
      {
        "actionType": "UPDATE_BA_STATUS",
        "count": 220
      },
      {
        "actionType": "APPROVE_BA",
        "count": 150
      },
      {
        "actionType": "UPLOAD_FILE",
        "count": 120
      }
    ],
    "httpMethods": [
      {
        "method": "POST",
        "count": 650
      },
      {
        "method": "PUT",
        "count": 450
      },
      {
        "method": "DELETE",
        "count": 100
      },
      {
        "method": "GET",
        "count": 50
      }
    ],
    "statusDistribution": [
      {
        "status": "DRAFT",
        "count": 400
      },
      {
        "status": "PENGAJUAN",
        "count": 300
      },
      {
        "status": "REVIEW",
        "count": 200
      },
      {
        "status": "DEVELOPMENT",
        "count": 150
      }
    ],
    "recentErrors": [
      {
        "id": 1245,
        "endpoint": "/api/blueprint-baru/5/ba",
        "errorMessage": "Validation failed: nama is required",
        "errorCode": "VALIDATION_ERROR",
        "createdAt": "2024-01-15T14:30:00.000Z",
        "actionType": "CREATE_BA"
      },
      {
        "id": 1240,
        "endpoint": "/api/blueprint-baru/5/upload-file",
        "errorMessage": "File size exceeds limit",
        "errorCode": "FILE_TOO_LARGE",
        "createdAt": "2024-01-15T13:15:00.000Z",
        "actionType": "UPLOAD_FILE"
      }
    ],
    "topUsers": [
      {
        "userId": 1,
        "userName": "John Doe",
        "activityCount": 450
      },
      {
        "userId": 2,
        "userName": "Jane Smith",
        "activityCount": 320
      },
      {
        "userId": 3,
        "userName": "Bob Johnson",
        "activityCount": 280
      }
    ]
  }
}
```

---

## Action Types

Berikut adalah daftar `actionType` yang tersedia:

| Action Type | Description |
|-------------|-------------|
| `CREATE_BA` | Membuat BA baru |
| `UPDATE_BA` | Mengupdate BA |
| `DELETE_BA` | Menghapus BA |
| `UPDATE_BA_STATUS` | Mengubah status BA |
| `UPLOAD_FILE` | Upload file (RFC/CED/OK) |
| `CREATE_COMPLETE_BA` | Membuat BA lengkap dengan modules |
| `UPDATE_COMPLETE_BA` | Update BA lengkap |
| `APPROVE_BA` | Approve BA ke DEVELOPMENT |
| `APPROVE_MODULE` | Approve module ke proyek |

## BA Status Values

| Status | Description |
|--------|-------------|
| `DRAFT` | Draft awal |
| `PENGAJUAN` | Menunggu review |
| `REVIEW` | Sedang direview |
| `RFC` | Request for Change |
| `CED` | Change Estimation Document |
| `KIRIM_OK` | Siap untuk approval |
| `DEVELOPMENT` | Dalam development |
| `UAT_INTERNAL` | UAT Internal |
| `UAT_INTERNAL_SELESAI` | UAT Internal selesai |
| `UAT_EXTERNAL` | UAT External |
| `UAT_EXTERNAL_SELESAI` | UAT External selesai |
| `SELESAI` | Selesai |

## HTTP Methods

- `GET` - Read operations
- `POST` - Create operations
- `PUT` - Update operations
- `DELETE` - Delete operations

## Error Codes

| Error Code | Description |
|------------|-------------|
| `VALIDATION_ERROR` | Validation gagal |
| `NOT_FOUND` | Resource tidak ditemukan |
| `UNAUTHORIZED` | Tidak terautentikasi |
| `FORBIDDEN` | Tidak memiliki akses |
| `INTERNAL_ERROR` | Error internal server |
| `FILE_TOO_LARGE` | File terlalu besar |
| `INVALID_FILE_TYPE` | Tipe file tidak valid |

## Use Cases

### 1. Monitoring Activity
```bash
# Monitor aktivitas project hari ini
GET /api/bacara-log?projectId=5&startDate=2024-01-15T00:00:00Z&endDate=2024-01-15T23:59:59Z

# Monitor error pada BA tertentu hari ini
GET /api/bacara-log?baId=123&isError=true&startDate=2024-01-15T00:00:00Z

# Monitor aktivitas dengan status tertentu
GET /api/bacara-log?projectId=5&statusBa=PENGAJUAN
```

### 2. Audit Trail
```bash
# Lihat semua perubahan pada BA tertentu
GET /api/bacara-log?baId=123

# Lihat semua perubahan BA dengan status DEVELOPMENT
GET /api/bacara-log?baId=123&statusBa=DEVELOPMENT

# Lihat semua aktivitas user pada project tertentu
GET /api/bacara-log?projectId=5&userId=1
```

### 3. Performance Analysis
```bash
# Lihat statistik performa project
GET /api/bacara-log/stats?projectId=5

# Lihat statistik performa BA tertentu
GET /api/bacara-log/stats?baId=123
```

### 4. Debugging
```bash
# Cari error pada BA tertentu
GET /api/bacara-log?baId=123&isError=true&search=validation

# Lihat detail error
GET /api/bacara-log/123
```

### 5. Reporting
```bash
# Report aktivitas project bulanan
GET /api/bacara-log?projectId=5&startDate=2024-01-01&endDate=2024-01-31

# Report aktivitas BA dengan filter status
GET /api/bacara-log?baId=123&statusBa=PENGAJUAN&startDate=2024-01-01&endDate=2024-01-31

# Report statistik bulanan
GET /api/bacara-log/stats?projectId=5&startDate=2024-01-01&endDate=2024-01-31
```

## Notes

1. **Required Filters**: Minimal salah satu dari `projectId` atau `baId` harus diisi
2. **Optional Status Filter**: Parameter `statusBa` bersifat optional untuk filter tambahan
3. **Pagination**: Default limit adalah 50, maksimal 100 per request
4. **Date Format**: Gunakan ISO 8601 format (YYYY-MM-DDTHH:mm:ss.sssZ)
5. **Search**: Case-insensitive search pada endpoint, actionDescription, dan errorMessage
6. **Performance**: Response time dalam milliseconds
7. **Relations**: Log otomatis include data BA dan Project terkait
8. **Soft Delete**: Log tidak pernah dihapus, hanya BA yang bisa dihapus (onDelete: SetNull)

## Rate Limiting

Saat ini belum ada rate limiting, namun disarankan untuk:
- Tidak melakukan request lebih dari 100 request/menit
- Gunakan pagination untuk data besar
- Cache hasil statistics jika memungkinkan

## Future Enhancements

- [ ] Export logs ke CSV/Excel
- [ ] Real-time log streaming via WebSocket
- [ ] Advanced analytics dashboard
- [ ] Log retention policy
- [ ] Automated alerting untuk error patterns
