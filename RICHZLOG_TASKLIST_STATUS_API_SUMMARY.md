# 📱 RichzLog Tasklist Status API - Summary

## 🎯 Apa yang Sudah Dibuat?

API lengkap untuk menampilkan statistik dan daftar tasklist berdasarkan status, sesuai dengan kebutuhan mobile app RichzSpot.

---

## 📦 File yang Dibuat

### 1. API Endpoints (6 files)

#### Personal Tasks (My Tasks)
- `src/app/api/richzlog/my-tasks/route.ts` - Get my tasks by status
- `src/app/api/richzlog/my-tasks/summary/route.ts` - Get my tasks summary

#### Manager Tasks (Team)
- `src/app/api/richzlog/manager/tasks/route.ts` - Get team tasks by status
- `src/app/api/richzlog/manager/tasks/summary/route.ts` - Get team tasks summary

#### Director Tasks (All)
- `src/app/api/richzlog/director/tasks/route.ts` - Get all tasks by status
- `src/app/api/richzlog/director/tasks/summary/route.ts` - Get all tasks summary

### 2. Documentation (3 files)

- `docs/api-for-flutter/RICHZLOG_TASKLIST_STATUS_API.md` - Dokumentasi lengkap API
- `docs/api-for-flutter/RICHZLOG_TASKLIST_STATUS_QUICK_REFERENCE.md` - Quick reference guide
- `docs/api-for-flutter/RICHZLOG_TASKLIST_STATUS_SETUP.md` - Setup & testing guide

### 3. Testing Tools (3 files)

- `RichzLog_Tasklist_Status_API.postman_collection.json` - Postman collection (19 requests)
- `RichzLog_Tasklist_Status_Environment.json` - Postman environment
- `test-tasklist-status-api.sh` - Bash test script (12 test cases)

---

## 🚀 Quick Start

### Base URL
```
http://192.168.1.5:3000/api/richzlog
```

### API Key (Header)
```
x-api-key: 172dc4710ab54af8b1b405c89d6de9f0
```

### Endpoints

#### 1. Personal Tasks
```bash
# Get summary
GET /api/richzlog/my-tasks/summary?userId={userId}

# Get tasks by status
GET /api/richzlog/my-tasks?userId={userId}&status={status}
```

#### 2. Manager Tasks
```bash
# Get team summary
GET /api/richzlog/manager/tasks/summary?managerId={managerId}

# Get team tasks by status
GET /api/richzlog/manager/tasks?managerId={managerId}&status={status}
```

#### 3. Director Tasks
```bash
# Get all tasks summary
GET /api/richzlog/director/tasks/summary?directorId={directorId}

# Get all tasks by status
GET /api/richzlog/director/tasks?directorId={directorId}&status={status}
```

---

## 📊 Status Filter Options

Sesuai dengan UI mobile app:

| Status Parameter | Keterangan | Mapping Database |
|-----------------|------------|------------------|
| `todo` | Belum Dikerjakan | MENUNGGU_PROSES_USER |
| `doing` | Sedang Dikerjakan | SEDANG_DIPROSES_USER |
| `pending_approval` | Menunggu Review | MENUNGGU_REVIEW_PM |
| `approved` | Selesai | SELESAI |
| `overdue` | Terlambat | calculatedDueDate < now |

---

## 📋 Response Format

### Summary Response
```json
{
  "success": true,
  "message": "Task summary retrieved successfully",
  "data": {
    "total": 25,
    "todo": 5,              // Belum Dikerjakan
    "doing": 3,             // Sedang Dikerjakan
    "done": 15,             // Selesai (semua)
    "approved": 12,         // Selesai (approved)
    "rejected": 0,          // Ditolak
    "overdue": 2,           // Terlambat
    "pendingApproval": 3    // Menunggu Review
  }
}
```

### Task List Response
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

## 🧪 Testing

### Method 1: Bash Script
```bash
chmod +x test-tasklist-status-api.sh
bash test-tasklist-status-api.sh
```

### Method 2: Postman
1. Import `RichzLog_Tasklist_Status_API.postman_collection.json`
2. Import `RichzLog_Tasklist_Status_Environment.json`
3. Update variables (userId, managerId, directorId)
4. Run collection

### Method 3: cURL
```bash
# Test my tasks summary
curl -X GET "http://192.168.1.5:3000/api/richzlog/my-tasks/summary?userId=123" \
  -H "x-api-key: 172dc4710ab54af8b1b405c89d6de9f0"

# Test my tasks - todo
curl -X GET "http://192.168.1.5:3000/api/richzlog/my-tasks?userId=123&status=todo" \
  -H "x-api-key: 172dc4710ab54af8b1b405c89d6de9f0"
```

---

## 📱 Flutter Integration

### Service Class Example
```dart
class RichzLogTaskService {
  static const String baseUrl = 'http://192.168.1.5:3000';
  static const String apiKey = '172dc4710ab54af8b1b405c89d6de9f0';

  // Get my tasks summary
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

  // Get my tasks by status
  static Future<List<TaskModel>> getMyTasks(
    int userId, 
    String? status
  ) async {
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

### Usage Example
```dart
// Get summary untuk tampilan statistik
final summary = await RichzLogTaskService.getMyTaskSummary(userId: 123);

// Tampilkan di UI
TaskStatCard(
  title: 'Belum Dikerjakan',
  count: summary.todo,
  color: Colors.purple,
  onTap: () => navigateToTaskList('todo'),
);

// Get tasks by status
final todoTasks = await RichzLogTaskService.getMyTasks(123, 'todo');
```

---

## 🎨 Mapping ke UI Mobile

Berdasarkan gambar UI yang diberikan:

| UI Label | API Field | Status Parameter |
|----------|-----------|------------------|
| Belum Dikerjakan | `summary.todo` | `status=todo` |
| Sedang Dikerjakan | `summary.doing` | `status=doing` |
| Menunggu Review | `summary.pendingApproval` | `status=pending_approval` |
| Selesai Tepat Waktu | `summary.approved - summary.overdue` | `status=approved` |
| Selesai Terlambat | `summary.overdue` | `status=overdue` |

---

## ✅ Features

### ✅ Sudah Diimplementasikan

1. **API Key Authentication** - Semua endpoint dilindungi dengan API key
2. **3 Level Access** - Personal, Manager, Director
3. **Status Filtering** - Filter by todo, doing, pending_approval, approved, overdue
4. **Pagination** - Support page & size parameters
5. **Summary Statistics** - Total, todo, doing, done, approved, rejected, overdue, pendingApproval
6. **Overdue Detection** - Real-time calculation berdasarkan calculatedDueDate
7. **Team Hierarchy** - Manager bisa lihat task team members
8. **Error Handling** - Proper error responses dengan error codes
9. **Status Display** - Bahasa Indonesia untuk UI (statusDisplay field)
10. **Complete Documentation** - 3 dokumentasi lengkap + Postman collection

### 📝 Notes

- **Rejected Status**: Saat ini placeholder (return 0), bisa disesuaikan dengan business logic
- **Team Hierarchy**: Menggunakan tabel `team_hierarchy` untuk menentukan member di bawah manager
- **Director Access**: Bisa melihat semua task tanpa filter team
- **Pagination**: Default 20 items per page, max 100

---

## 📚 Documentation Files

| File | Deskripsi |
|------|-----------|
| `RICHZLOG_TASKLIST_STATUS_API.md` | Dokumentasi lengkap API dengan semua endpoint, parameters, responses |
| `RICHZLOG_TASKLIST_STATUS_QUICK_REFERENCE.md` | Quick reference untuk developer, contoh Flutter code |
| `RICHZLOG_TASKLIST_STATUS_SETUP.md` | Setup guide dan troubleshooting |
| `RICHZLOG_TASKLIST_STATUS_API_SUMMARY.md` | File ini - overview lengkap |

---

## 🔥 Common Use Cases

### 1. Tampilkan Task Statistics (seperti gambar UI)
```bash
GET /api/richzlog/my-tasks/summary?userId=123
```

Response memberikan semua data untuk card statistics:
- Belum Dikerjakan: `data.todo`
- Sedang Dikerjakan: `data.doing`
- Menunggu Review: `data.pendingApproval`
- Selesai Tepat Waktu: `data.approved - data.overdue`
- Selesai Terlambat: `data.overdue`

### 2. Tampilkan List Task Belum Dikerjakan
```bash
GET /api/richzlog/my-tasks?userId=123&status=todo
```

### 3. Manager Review Task Team
```bash
GET /api/richzlog/manager/tasks?managerId=45&status=pending_approval
```

### 4. Director Monitor Overdue Tasks
```bash
GET /api/richzlog/director/tasks?directorId=1&status=overdue
```

---

## 🎯 Next Steps

1. ✅ **API Development** - DONE
2. ✅ **Documentation** - DONE
3. ✅ **Testing Tools** - DONE
4. ⏳ **Testing** - Test API menggunakan Postman atau bash script
5. ⏳ **Flutter Integration** - Integrate dengan mobile app
6. ⏳ **End-to-End Testing** - Test dari mobile app
7. ⏳ **Production Deployment** - Deploy ke production server

---

## 📞 Support & Resources

### Documentation
- Dokumentasi lengkap: `docs/api-for-flutter/RICHZLOG_TASKLIST_STATUS_API.md`
- Quick reference: `docs/api-for-flutter/RICHZLOG_TASKLIST_STATUS_QUICK_REFERENCE.md`
- Setup guide: `docs/api-for-flutter/RICHZLOG_TASKLIST_STATUS_SETUP.md`

### Testing
- Postman collection: `RichzLog_Tasklist_Status_API.postman_collection.json`
- Postman environment: `RichzLog_Tasklist_Status_Environment.json`
- Test script: `test-tasklist-status-api.sh`

### Contact
Untuk pertanyaan atau issue, hubungi tim development RichzLog.

---

**Created**: 2026-04-01  
**Version**: 1.0  
**Status**: ✅ Ready for Testing & Integration  
**API Key**: `172dc4710ab54af8b1b405c89d6de9f0`
