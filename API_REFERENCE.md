# API Reference
# CI - notif group test
This document provides a comprehensive reference for all API endpoints in the Logbook Management System.

## Base URL
# test

```
Development: http://localhost:3000/api
Production: https://your-domain.com/api
```

## Authentication

All API endpoints require authentication via session cookies. The system uses custom authentication with optional SSO support.

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

## Task Management APIs

### Get Tasks (Tasklist)

```http
GET /api/tasklist?page=1&limit=10&search=&proyekId=&pegawaiId=&status=&tipe=&startDate=&endDate=
```

**Query Parameters:**
- `page` (number): Page number for pagination
- `limit` (number): Items per page
- `search` (string): Search by task name or code
- `proyekId` (number): Filter by project ID
- `pegawaiId` (number): Filter by user ID
- `status` (string): Filter by status (MENUNGGU_PROSES_USER, SEDANG_DIPROSES_USER, etc.)
- `tipe` (string): Filter by type
- `startDate` (string): Start date filter (YYYY-MM-DD)
- `endDate` (string): End date filter (YYYY-MM-DD)

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

### Get Single Task

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

### Create Task

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

### Update Task Status

```http
PUT /api/tasklist/{id}
Content-Type: multipart/form-data

desired=MENUNGGU_REVIEW_PM
note=Completed the feature, ready for review
photo=[file]
```

**Form Data:**
- `desired` (string): Target status
- `note` (string): Description/notes
- `photo` (file): Optional image attachment

**Response:**
```json
{
  "success": true,
  "message": "Task updated successfully"
}
```

### Delete Task

```http
DELETE /api/tasklist/{id}
```

## Calendar APIs

### Get Calendar Tasks

```http
GET /api/calendar?month=2025-01&pegawaiId=4&status=SEDANG_DIPROSES_USER
```

**Query Parameters:**
- `month` (string): Month in YYYY-MM format
- `pegawaiId` (number): Filter by user ID
- `status` (string): Filter by status

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

### Get Calendar Users

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

## Project APIs

### Get Projects

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

### Create Project

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

## User APIs

### Get Users (Pegawai)

```http
GET /api/pegawai?role=PROGRAMMER
```

**Query Parameters:**
- `role` (string): Filter by role (SUPER_ADMIN, ADMIN, PM, PROGRAMMER)

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

### Create User

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

## Report APIs

### Get Task Reports

```http
GET /api/laporan?startDate=2025-01-01&endDate=2025-01-31&proyekId=1&pegawaiId=4&status=SELESAI
```

**Query Parameters:**
- `startDate` (string): Start date (YYYY-MM-DD)
- `endDate` (string): End date (YYYY-MM-DD)
- `proyekId` (number): Filter by project
- `pegawaiId` (number): Filter by user
- `status` (string): Filter by status

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

### Export Excel Report

```http
GET /api/laporan/export?startDate=2025-01-01&endDate=2025-01-31
```

**Response:** Excel file download

## Status Codes

| Code | Description |
|------|-------------|
| 200 | Success |
| 201 | Created |
| 400 | Bad Request |
| 401 | Unauthorized |
| 403 | Forbidden |
| 404 | Not Found |
| 500 | Internal Server Error |

## Error Response Format

```json
{
  "error": "Error message description",
  "details": "Additional error details (optional)"
}
```

## Task Status Values

| Status | Description |
|--------|-------------|
| `MENUNGGU_PROSES_USER` | Waiting for programmer to start |
| `SEDANG_DIPROSES_USER` | In progress by programmer |
| `SEDANG_DIPROSES_USER_PAUSED` | Paused by programmer |
| `MENUNGGU_REVIEW_PM` | Waiting for PM review |
| `SELESAI` | Completed |

## Role Values

| Role | Description |
|------|-------------|
| `SUPER_ADMIN` | Full system access |
| `ADMIN` | Administrative access |
| `PM` | Project Manager |
| `PROGRAMMER` | Developer/Programmer |

## Rate Limiting

Currently, there is no rate limiting implemented. This may be added in future versions.

## Webhooks

Webhook support is planned for future releases to enable real-time notifications.

## Examples

### Complete Task Workflow (JavaScript)

```javascript
// 1. Start task
const startResponse = await fetch('/api/tasklist/1', {
  method: 'PUT',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    desired: 'SEDANG_DIPROSES_USER',
    note: 'Starting work on this task'
  })
});

// 2. Submit for review
const formData = new FormData();
formData.append('desired', 'MENUNGGU_REVIEW_PM');
formData.append('note', 'Completed, ready for review');
formData.append('photo', fileInput.files[0]);

const reviewResponse = await fetch('/api/tasklist/1', {
  method: 'PUT',
  body: formData
});

// 3. PM approves
const approveResponse = await fetch('/api/tasklist/1', {
  method: 'PUT',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    desired: 'SELESAI',
    note: 'Approved, good work!'
  })
});
```

### Fetch Tasks with Filters (TypeScript)

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

// Usage
const tasks = await fetchTasks({
  page: 1,
  limit: 20,
  status: 'SEDANG_DIPROSES_USER',
  proyekId: 1
});
```

---

For more information, see the [README.md](./README.md) or check the source code in the `app/api/` directory.
