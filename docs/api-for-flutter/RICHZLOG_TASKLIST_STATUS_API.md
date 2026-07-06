# RichzLog Tasklist Status API - Dokumentasi

## Overview
API ini menyediakan endpoint untuk mengambil daftar tasklist berdasarkan status dan summary statistik task untuk mobile app RichzSpot. API ini menggunakan API Key authentication dan mendukung 3 level akses: Personal (my-tasks), Manager (team tasks), dan Director (all tasks).

---

## Base URL
```
http://192.168.1.5:3000/api/richzlog
```

---

## Authentication
Semua endpoint memerlukan API Key yang dikirim melalui header:

```
x-api-key: 172dc4710ab54af8b1b405c89d6de9f0
```

---

## Status Mapping

### Status Database vs Mobile App

| Status Database | Status Mobile | Keterangan |
|----------------|---------------|------------|
| MENUNGGU_PROSES_USER | todo | Belum Dikerjakan |
| SEDANG_DIPROSES_USER | doing | Sedang Dikerjakan |
| MENUNGGU_REVIEW_PM | pending_approval | Menunggu Review |
| SELESAI | approved | Selesai |
| SEDANG_DIPROSES_USER_PAUSED | - | Dijeda |

### Status Filter yang Tersedia

- `todo` - Belum Dikerjakan
- `doing` - Sedang Dikerjakan  
- `done` - Selesai (MENUNGGU_REVIEW_PM + SELESAI)
- `approved` - Disetujui (SELESAI)
- `rejected` - Ditolak
- `pending_approval` - Menunggu Review
- `overdue` - Terlambat (calculatedDueDate < now dan status != SELESAI)

---

## 1. MY TASKS API (Personal)

### 1.1 Get My Tasks by Status

**Endpoint:**
```
GET /api/richzlog/my-tasks
```

**Description:**
Mengambil daftar task milik user yang sedang login, dengan filter berdasarkan status.

**Headers:**
```
x-api-key: 172dc4710ab54af8b1b405c89d6de9f0
```

**Query Parameters:**

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| userId | integer | Yes | - | ID user yang sedang login |
| status | string | No | - | Filter status: todo, doing, done, approved, rejected, pending_approval, overdue |
| page | integer | No | 1 | Halaman data |
| size | integer | No | 20 | Jumlah data per halaman (max 100) |

**Example Request:**
```bash
curl -X GET "http://192.168.1.5:3000/api/richzlog/my-tasks?userId=123&status=todo&page=1&size=20" \
  -H "x-api-key: 172dc4710ab54af8b1b405c89d6de9f0"
```

**Response Success (200):**
```json
{
  "success": true,
  "message": "Tasks retrieved successfully",
  "data": {
    "items": [
      {
        "id": 1,
        "kode": "TASK-001",
        "projectId": 10,
        "moduleId": 25,
        "moduleName": "User Management",
        "moduleCode": "UM-001",
        "pegawaiId": 123,
        "status": "MENUNGGU_PROSES_USER",
        "statusDisplay": "Belum Dikerjakan",
        "scheduleAt": "2026-04-05T08:00:00.000Z",
        "calculatedDueDate": "2026-04-10T17:00:00.000Z",
        "keterangan": "Implementasi fitur login",
        "programmerDescription": null,
        "taskComplexity": "MEDIUM",
        "tasklistType": "DEVELOPMENT",
        "startedAt": null,
        "totalDurationMinutes": 0,
        "isPaused": false,
        "isOverdue": false,
        "isPendingApproval": false,
        "createdAt": "2026-04-01T10:00:00.000Z",
        "updatedAt": "2026-04-01T10:00:00.000Z"
      }
    ],
    "pagination": {
      "page": 1,
      "size": 20,
      "total": 15,
      "totalPages": 1,
      "hasNextPage": false,
      "hasPrevPage": false
    }
  }
}
```

---

### 1.2 Get My Tasks Summary

**Endpoint:**
```
GET /api/richzlog/my-tasks/summary
```

**Description:**
Mengambil ringkasan statistik task milik user yang sedang login.

**Headers:**
```
x-api-key: 172dc4710ab54af8b1b405c89d6de9f0
```

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| userId | integer | Yes | ID user yang sedang login |

**Example Request:**
```bash
curl -X GET "http://192.168.1.5:3000/api/richzlog/my-tasks/summary?userId=123" \
  -H "x-api-key: 172dc4710ab54af8b1b405c89d6de9f0"
```

**Response Success (200):**
```json
{
  "success": true,
  "message": "Task summary retrieved successfully",
  "data": {
    "total": 25,
    "todo": 5,
    "doing": 3,
    "done": 15,
    "approved": 12,
    "rejected": 0,
    "overdue": 2,
    "pendingApproval": 3
  }
}
```

---

## 2. MANAGER TASKS API (Team)

### 2.1 Get Team Tasks by Status

**Endpoint:**
```
GET /api/richzlog/manager/tasks
```

**Description:**
Mengambil daftar task dari team yang dikelola oleh manager, termasuk task manager sendiri.

**Headers:**
```
x-api-key: 172dc4710ab54af8b1b405c89d6de9f0
```

**Query Parameters:**

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| managerId | integer | Yes | - | ID manager |
| status | string | No | - | Filter status: todo, doing, done, approved, rejected, pending_approval, overdue |
| page | integer | No | 1 | Halaman data |
| size | integer | No | 20 | Jumlah data per halaman (max 100) |

**Example Request:**
```bash
curl -X GET "http://192.168.1.5:3000/api/richzlog/manager/tasks?managerId=45&status=pending_approval&page=1&size=20" \
  -H "x-api-key: 172dc4710ab54af8b1b405c89d6de9f0"
```

**Response Success (200):**
```json
{
  "success": true,
  "message": "Team tasks retrieved successfully",
  "data": {
    "items": [
      {
        "id": 5,
        "kode": "TASK-005",
        "projectId": 10,
        "moduleId": 28,
        "moduleName": "Dashboard",
        "moduleCode": "DASH-001",
        "pegawaiId": 150,
        "assigneeName": "John Doe",
        "status": "MENUNGGU_REVIEW_PM",
        "statusDisplay": "Menunggu Review",
        "scheduleAt": "2026-04-02T08:00:00.000Z",
        "calculatedDueDate": "2026-04-08T17:00:00.000Z",
        "keterangan": "Implementasi dashboard analytics",
        "programmerDescription": "Dashboard sudah selesai, menunggu review",
        "taskComplexity": "HARD",
        "tasklistType": "DEVELOPMENT",
        "startedAt": "2026-04-02T09:00:00.000Z",
        "totalDurationMinutes": 480,
        "isPaused": false,
        "isOverdue": false,
        "isPendingApproval": true,
        "createdAt": "2026-04-01T10:00:00.000Z",
        "updatedAt": "2026-04-03T16:00:00.000Z"
      }
    ],
    "pagination": {
      "page": 1,
      "size": 20,
      "total": 8,
      "totalPages": 1,
      "hasNextPage": false,
      "hasPrevPage": false
    }
  }
}
```

---

### 2.2 Get Team Tasks Summary

**Endpoint:**
```
GET /api/richzlog/manager/tasks/summary
```

**Description:**
Mengambil ringkasan statistik task dari team yang dikelola oleh manager.

**Headers:**
```
x-api-key: 172dc4710ab54af8b1b405c89d6de9f0
```

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| managerId | integer | Yes | ID manager |

**Example Request:**
```bash
curl -X GET "http://192.168.1.5:3000/api/richzlog/manager/tasks/summary?managerId=45" \
  -H "x-api-key: 172dc4710ab54af8b1b405c89d6de9f0"
```

**Response Success (200):**
```json
{
  "success": true,
  "message": "Team task summary retrieved successfully",
  "data": {
    "total": 85,
    "todo": 20,
    "doing": 15,
    "done": 45,
    "approved": 38,
    "rejected": 0,
    "overdue": 5,
    "pendingApproval": 7
  }
}
```

---

## 3. DIRECTOR TASKS API (All Tasks)

### 3.1 Get All Tasks by Status

**Endpoint:**
```
GET /api/richzlog/director/tasks
```

**Description:**
Mengambil daftar semua task di sistem (untuk director/admin).

**Headers:**
```
x-api-key: 172dc4710ab54af8b1b405c89d6de9f0
```

**Query Parameters:**

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| directorId | integer | Yes | - | ID director |
| status | string | No | - | Filter status: todo, doing, done, approved, rejected, pending_approval, overdue |
| page | integer | No | 1 | Halaman data |
| size | integer | No | 20 | Jumlah data per halaman (max 100) |

**Example Request:**
```bash
curl -X GET "http://192.168.1.5:3000/api/richzlog/director/tasks?directorId=1&status=overdue&page=1&size=20" \
  -H "x-api-key: 172dc4710ab54af8b1b405c89d6de9f0"
```

**Response Success (200):**
```json
{
  "success": true,
  "message": "All tasks retrieved successfully",
  "data": {
    "items": [
      {
        "id": 12,
        "kode": "TASK-012",
        "projectId": 15,
        "moduleId": 45,
        "moduleName": "Payment Gateway",
        "moduleCode": "PAY-001",
        "pegawaiId": 200,
        "assigneeName": "Jane Smith",
        "status": "SEDANG_DIPROSES_USER",
        "statusDisplay": "Sedang Dikerjakan",
        "scheduleAt": "2026-03-25T08:00:00.000Z",
        "calculatedDueDate": "2026-03-30T17:00:00.000Z",
        "keterangan": "Integrasi payment gateway",
        "programmerDescription": "Sedang testing integrasi",
        "taskComplexity": "HARD",
        "tasklistType": "DEVELOPMENT",
        "startedAt": "2026-03-25T09:00:00.000Z",
        "totalDurationMinutes": 1200,
        "isPaused": false,
        "isOverdue": true,
        "isPendingApproval": false,
        "createdAt": "2026-03-20T10:00:00.000Z",
        "updatedAt": "2026-04-01T14:00:00.000Z"
      }
    ],
    "pagination": {
      "page": 1,
      "size": 20,
      "total": 12,
      "totalPages": 1,
      "hasNextPage": false,
      "hasPrevPage": false
    }
  }
}
```

---

### 3.2 Get All Tasks Summary

**Endpoint:**
```
GET /api/richzlog/director/tasks/summary
```

**Description:**
Mengambil ringkasan statistik semua task di sistem.

**Headers:**
```
x-api-key: 172dc4710ab54af8b1b405c89d6de9f0
```

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| directorId | integer | Yes | ID director |

**Example Request:**
```bash
curl -X GET "http://192.168.1.5:3000/api/richzlog/director/tasks/summary?directorId=1" \
  -H "x-api-key: 172dc4710ab54af8b1b405c89d6de9f0"
```

**Response Success (200):**
```json
{
  "success": true,
  "message": "All tasks summary retrieved successfully",
  "data": {
    "total": 350,
    "todo": 80,
    "doing": 65,
    "done": 180,
    "approved": 150,
    "rejected": 0,
    "overdue": 25,
    "pendingApproval": 30
  }
}
```

---

## 4. ERROR RESPONSES

### 4.1 Invalid API Key (401)
```json
{
  "success": false,
  "message": "Invalid or missing API key",
  "error": {
    "code": "INVALID_API_KEY"
  }
}
```

### 4.2 Missing User ID (400)
```json
{
  "success": false,
  "message": "User ID is required",
  "error": {
    "code": "MISSING_USER_ID"
  }
}
```

### 4.3 Invalid User ID (400)
```json
{
  "success": false,
  "message": "Invalid user ID",
  "error": {
    "code": "INVALID_USER_ID"
  }
}
```

### 4.4 Invalid Status (400)
```json
{
  "success": false,
  "message": "Invalid status parameter",
  "error": {
    "code": "INVALID_STATUS"
  }
}
```

### 4.5 Server Error (500)
```json
{
  "success": false,
  "message": "Internal server error",
  "error": {
    "code": "SERVER_ERROR",
    "details": "Error message details"
  }
}
```

---

## 5. FLUTTER INTEGRATION

### 5.1 Mapping Status untuk UI

Berdasarkan gambar UI yang diberikan:

```dart
// Status mapping untuk UI
enum TaskStatusUI {
  belumDikerjakan,    // MENUNGGU_PROSES_USER
  sedangDikerjakan,   // SEDANG_DIPROSES_USER
  menungguReview,     // MENUNGGU_REVIEW_PM
  selesaiTepatWaktu,  // SELESAI && !isOverdue
  selesaiTerlambat    // SELESAI && isOverdue (completed after due date)
}

// API status parameter
enum TaskStatusFilter {
  todo,              // Belum Dikerjakan
  doing,             // Sedang Dikerjakan
  pendingApproval,   // Menunggu Review
  approved,          // Selesai (semua)
  overdue            // Terlambat
}
```

### 5.2 Example Flutter Code

```dart
class RichzLogTaskService {
  static const String baseUrl = 'http://192.168.1.5:3000';
  static const String apiKey = '172dc4710ab54af8b1b405c89d6de9f0';

  // Get my tasks by status
  static Future<TaskListResponse> getMyTasks({
    required int userId,
    String? status,
    int page = 1,
    int size = 20,
  }) async {
    final queryParams = {
      'userId': userId.toString(),
      if (status != null) 'status': status,
      'page': page.toString(),
      'size': size.toString(),
    };

    final uri = Uri.parse('$baseUrl/api/richzlog/my-tasks')
        .replace(queryParameters: queryParams);

    final response = await http.get(
      uri,
      headers: {
        'x-api-key': apiKey,
        'Content-Type': 'application/json',
      },
    );

    if (response.statusCode == 200) {
      return TaskListResponse.fromJson(jsonDecode(response.body));
    } else {
      throw Exception('Failed to load tasks: ${response.body}');
    }
  }

  // Get my tasks summary
  static Future<TaskSummaryModel> getMyTaskSummary({
    required int userId,
  }) async {
    final uri = Uri.parse('$baseUrl/api/richzlog/my-tasks/summary')
        .replace(queryParameters: {'userId': userId.toString()});

    final response = await http.get(
      uri,
      headers: {
        'x-api-key': apiKey,
        'Content-Type': 'application/json',
      },
    );

    if (response.statusCode == 200) {
      final data = jsonDecode(response.body);
      return TaskSummaryModel.fromJson(data['data']);
    } else {
      throw Exception('Failed to load task summary: ${response.body}');
    }
  }

  // Get team tasks (for manager)
  static Future<TaskListResponse> getTeamTasks({
    required int managerId,
    String? status,
    int page = 1,
    int size = 20,
  }) async {
    final queryParams = {
      'managerId': managerId.toString(),
      if (status != null) 'status': status,
      'page': page.toString(),
      'size': size.toString(),
    };

    final uri = Uri.parse('$baseUrl/api/richzlog/manager/tasks')
        .replace(queryParameters: queryParams);

    final response = await http.get(
      uri,
      headers: {
        'x-api-key': apiKey,
        'Content-Type': 'application/json',
      },
    );

    if (response.statusCode == 200) {
      return TaskListResponse.fromJson(jsonDecode(response.body));
    } else {
      throw Exception('Failed to load team tasks: ${response.body}');
    }
  }

  // Get team tasks summary (for manager)
  static Future<TaskSummaryModel> getTeamTaskSummary({
    required int managerId,
  }) async {
    final uri = Uri.parse('$baseUrl/api/richzlog/manager/tasks/summary')
        .replace(queryParameters: {'managerId': managerId.toString()});

    final response = await http.get(
      uri,
      headers: {
        'x-api-key': apiKey,
        'Content-Type': 'application/json',
      },
    );

    if (response.statusCode == 200) {
      final data = jsonDecode(response.body);
      return TaskSummaryModel.fromJson(data['data']);
    } else {
      throw Exception('Failed to load team task summary: ${response.body}');
    }
  }

  // Get all tasks (for director)
  static Future<TaskListResponse> getAllTasks({
    required int directorId,
    String? status,
    int page = 1,
    int size = 20,
  }) async {
    final queryParams = {
      'directorId': directorId.toString(),
      if (status != null) 'status': status,
      'page': page.toString(),
      'size': size.toString(),
    };

    final uri = Uri.parse('$baseUrl/api/richzlog/director/tasks')
        .replace(queryParameters: queryParams);

    final response = await http.get(
      uri,
      headers: {
        'x-api-key': apiKey,
        'Content-Type': 'application/json',
      },
    );

    if (response.statusCode == 200) {
      return TaskListResponse.fromJson(jsonDecode(response.body));
    } else {
      throw Exception('Failed to load all tasks: ${response.body}');
    }
  }

  // Get all tasks summary (for director)
  static Future<TaskSummaryModel> getAllTaskSummary({
    required int directorId,
  }) async {
    final uri = Uri.parse('$baseUrl/api/richzlog/director/tasks/summary')
        .replace(queryParameters: {'directorId': directorId.toString()});

    final response = await http.get(
      uri,
      headers: {
        'x-api-key': apiKey,
        'Content-Type': 'application/json',
      },
    );

    if (response.statusCode == 200) {
      final data = jsonDecode(response.body);
      return TaskSummaryModel.fromJson(data['data']);
    } else {
      throw Exception('Failed to load all task summary: ${response.body}');
    }
  }
}
```

---

## 6. TESTING

### 6.1 Test My Tasks API
```bash
# Get my tasks - todo
curl -X GET "http://192.168.1.5:3000/api/richzlog/my-tasks?userId=123&status=todo" \
  -H "x-api-key: 172dc4710ab54af8b1b405c89d6de9f0"

# Get my tasks summary
curl -X GET "http://192.168.1.5:3000/api/richzlog/my-tasks/summary?userId=123" \
  -H "x-api-key: 172dc4710ab54af8b1b405c89d6de9f0"
```

### 6.2 Test Manager Tasks API
```bash
# Get team tasks - pending approval
curl -X GET "http://192.168.1.5:3000/api/richzlog/manager/tasks?managerId=45&status=pending_approval" \
  -H "x-api-key: 172dc4710ab54af8b1b405c89d6de9f0"

# Get team tasks summary
curl -X GET "http://192.168.1.5:3000/api/richzlog/manager/tasks/summary?managerId=45" \
  -H "x-api-key: 172dc4710ab54af8b1b405c89d6de9f0"
```

### 6.3 Test Director Tasks API
```bash
# Get all tasks - overdue
curl -X GET "http://192.168.1.5:3000/api/richzlog/director/tasks?directorId=1&status=overdue" \
  -H "x-api-key: 172dc4710ab54af8b1b405c89d6de9f0"

# Get all tasks summary
curl -X GET "http://192.168.1.5:3000/api/richzlog/director/tasks/summary?directorId=1" \
  -H "x-api-key: 172dc4710ab54af8b1b405c89d6de9f0"
```

---

## 7. NOTES

### 7.1 Team Hierarchy
- Manager tasks menggunakan tabel `team_hierarchy` untuk menentukan member yang berada di bawah manager
- Manager juga bisa melihat task miliknya sendiri
- Director bisa melihat semua task tanpa filter

### 7.2 Overdue Calculation
- Task dianggap overdue jika `calculatedDueDate < current_time` dan `status != SELESAI`
- Field `isOverdue` dihitung secara real-time di response

### 7.3 Pagination
- Default page size: 20
- Maximum page size: 100
- Page dimulai dari 1

### 7.4 Status Display
- API mengembalikan 2 field status:
  - `status`: Status asli dari database (MENUNGGU_PROSES_USER, dll)
  - `statusDisplay`: Status dalam bahasa Indonesia untuk UI

---

**Document Version**: 1.0  
**Last Updated**: 2026-04-01  
**Status**: Ready for Implementation
