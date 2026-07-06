# RichzLog Tasklist Status API - Quick Reference

## 🚀 Quick Start

### Base URL
```
http://192.168.1.5:3000/api/richzlog
```

### API Key
```
x-api-key: 172dc4710ab54af8b1b405c89d6de9f0
```

---

## 📋 Endpoint Summary

### Personal Tasks (My Tasks)
```
GET /api/richzlog/my-tasks?userId={userId}&status={status}
GET /api/richzlog/my-tasks/summary?userId={userId}
```

### Team Tasks (Manager)
```
GET /api/richzlog/manager/tasks?managerId={managerId}&status={status}
GET /api/richzlog/manager/tasks/summary?managerId={managerId}
```

### All Tasks (Director)
```
GET /api/richzlog/director/tasks?directorId={directorId}&status={status}
GET /api/richzlog/director/tasks/summary?directorId={directorId}
```

---

## 🎯 Status Filter Options

| Status | Keterangan | Database Status |
|--------|------------|-----------------|
| `todo` | Belum Dikerjakan | MENUNGGU_PROSES_USER |
| `doing` | Sedang Dikerjakan | SEDANG_DIPROSES_USER |
| `pending_approval` | Menunggu Review | MENUNGGU_REVIEW_PM |
| `approved` | Selesai | SELESAI |
| `done` | Selesai (semua) | MENUNGGU_REVIEW_PM + SELESAI |
| `overdue` | Terlambat | calculatedDueDate < now |
| `rejected` | Ditolak | - |

---

## 📊 Summary Response Format

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

## 📝 Task List Response Format

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
        "assigneeName": "John Doe",
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

## 🔥 Common Use Cases

### 1. Tampilkan Task Statistics (seperti gambar UI)
```bash
# Get summary untuk user
curl -X GET "http://192.168.1.5:3000/api/richzlog/my-tasks/summary?userId=123" \
  -H "x-api-key: 172dc4710ab54af8b1b405c89d6de9f0"
```

Response akan memberikan:
- `todo` → Belum Dikerjakan (0)
- `doing` → Sedang Dikerjakan (0)
- `pendingApproval` → Menunggu Review (0)
- `approved` → Selesai Tepat Waktu (0)
- `overdue` → Selesai Terlambat (0)

### 2. Tampilkan List Task Belum Dikerjakan
```bash
curl -X GET "http://192.168.1.5:3000/api/richzlog/my-tasks?userId=123&status=todo" \
  -H "x-api-key: 172dc4710ab54af8b1b405c89d6de9f0"
```

### 3. Tampilkan List Task Sedang Dikerjakan
```bash
curl -X GET "http://192.168.1.5:3000/api/richzlog/my-tasks?userId=123&status=doing" \
  -H "x-api-key: 172dc4710ab54af8b1b405c89d6de9f0"
```

### 4. Tampilkan List Task Menunggu Review
```bash
curl -X GET "http://192.168.1.5:3000/api/richzlog/my-tasks?userId=123&status=pending_approval" \
  -H "x-api-key: 172dc4710ab54af8b1b405c89d6de9f0"
```

### 5. Tampilkan List Task Terlambat
```bash
curl -X GET "http://192.168.1.5:3000/api/richzlog/my-tasks?userId=123&status=overdue" \
  -H "x-api-key: 172dc4710ab54af8b1b405c89d6de9f0"
```

### 6. Manager - Lihat Task Team
```bash
curl -X GET "http://192.168.1.5:3000/api/richzlog/manager/tasks?managerId=45&status=pending_approval" \
  -H "x-api-key: 172dc4710ab54af8b1b405c89d6de9f0"
```

### 7. Director - Lihat Semua Task
```bash
curl -X GET "http://192.168.1.5:3000/api/richzlog/director/tasks?directorId=1&status=overdue" \
  -H "x-api-key: 172dc4710ab54af8b1b405c89d6de9f0"
```

---

## 🎨 Flutter Integration Example

### Service Class
```dart
class RichzLogTaskService {
  static const String baseUrl = 'http://192.168.1.5:3000';
  static const String apiKey = '172dc4710ab54af8b1b405c89d6de9f0';

  static Future<TaskSummaryModel> getMyTaskSummary(int userId) async {
    final uri = Uri.parse('$baseUrl/api/richzlog/my-tasks/summary')
        .replace(queryParameters: {'userId': userId.toString()});

    final response = await http.get(
      uri,
      headers: {'x-api-key': apiKey},
    );

    if (response.statusCode == 200) {
      final data = jsonDecode(response.body);
      return TaskSummaryModel.fromJson(data['data']);
    } else {
      throw Exception('Failed to load task summary');
    }
  }

  static Future<List<TaskModel>> getMyTasks(int userId, String? status) async {
    final queryParams = {
      'userId': userId.toString(),
      if (status != null) 'status': status,
    };

    final uri = Uri.parse('$baseUrl/api/richzlog/my-tasks')
        .replace(queryParameters: queryParams);

    final response = await http.get(
      uri,
      headers: {'x-api-key': apiKey},
    );

    if (response.statusCode == 200) {
      final data = jsonDecode(response.body);
      final items = data['data']['items'] as List;
      return items.map((item) => TaskModel.fromJson(item)).toList();
    } else {
      throw Exception('Failed to load tasks');
    }
  }
}
```

### Usage in Widget
```dart
class TaskStatisticsWidget extends StatelessWidget {
  final int userId;

  const TaskStatisticsWidget({required this.userId});

  @override
  Widget build(BuildContext context) {
    return FutureBuilder<TaskSummaryModel>(
      future: RichzLogTaskService.getMyTaskSummary(userId),
      builder: (context, snapshot) {
        if (snapshot.hasData) {
          final summary = snapshot.data!;
          return Column(
            children: [
              TaskStatCard(
                title: 'Belum Dikerjakan',
                count: summary.todo,
                color: Colors.purple,
                onTap: () => _navigateToTaskList('todo'),
              ),
              TaskStatCard(
                title: 'Sedang Dikerjakan',
                count: summary.doing,
                color: Colors.blue,
                onTap: () => _navigateToTaskList('doing'),
              ),
              TaskStatCard(
                title: 'Menunggu Review',
                count: summary.pendingApproval,
                color: Colors.orange,
                onTap: () => _navigateToTaskList('pending_approval'),
              ),
              TaskStatCard(
                title: 'Selesai Tepat Waktu',
                count: summary.approved - summary.overdue,
                color: Colors.green,
                onTap: () => _navigateToTaskList('approved'),
              ),
              TaskStatCard(
                title: 'Selesai Terlambat',
                count: summary.overdue,
                color: Colors.red,
                onTap: () => _navigateToTaskList('overdue'),
              ),
            ],
          );
        }
        return CircularProgressIndicator();
      },
    );
  }

  void _navigateToTaskList(String status) {
    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (context) => TaskListPage(
          userId: userId,
          status: status,
        ),
      ),
    );
  }
}
```

---

## ⚠️ Error Handling

### Invalid API Key (401)
```json
{
  "success": false,
  "message": "Invalid or missing API key",
  "error": { "code": "INVALID_API_KEY" }
}
```

### Missing User ID (400)
```json
{
  "success": false,
  "message": "User ID is required",
  "error": { "code": "MISSING_USER_ID" }
}
```

### Invalid Status (400)
```json
{
  "success": false,
  "message": "Invalid status parameter",
  "error": { "code": "INVALID_STATUS" }
}
```

---

## 📦 Postman Collection

Import file berikut ke Postman:
- `RichzLog_Tasklist_Status_API.postman_collection.json`
- `RichzLog_Tasklist_Status_Environment.json`

Atau gunakan curl commands di atas untuk testing manual.

---

## 🔍 Tips & Best Practices

1. **Pagination**: Gunakan `page` dan `size` untuk menghindari load data yang terlalu besar
2. **Caching**: Cache summary data di mobile untuk mengurangi API calls
3. **Error Handling**: Selalu handle error response dengan baik
4. **API Key**: Jangan hardcode API key di production, gunakan environment variables
5. **Refresh**: Implement pull-to-refresh untuk update data terbaru

---

## 📞 Support

Untuk pertanyaan atau issue, hubungi tim development RichzLog.

**Last Updated**: 2026-04-01
