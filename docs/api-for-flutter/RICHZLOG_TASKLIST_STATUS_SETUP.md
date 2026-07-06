# RichzLog Tasklist Status API - Setup & Testing Guide

## 📋 Overview

API ini menyediakan endpoint untuk mengambil daftar tasklist berdasarkan status dan summary statistik untuk mobile app RichzSpot. API mendukung 3 level akses:

1. **Personal (My Tasks)** - Task milik user sendiri
2. **Manager (Team Tasks)** - Task dari team yang dikelola
3. **Director (All Tasks)** - Semua task di sistem

---

## 🚀 Setup

### 1. File Structure

API sudah dibuat dengan struktur berikut:

```
logbook/src/app/api/richzlog/
├── my-tasks/
│   ├── route.ts              # GET my tasks by status
│   └── summary/
│       └── route.ts          # GET my tasks summary
├── manager/
│   └── tasks/
│       ├── route.ts          # GET team tasks by status
│       └── summary/
│           └── route.ts      # GET team tasks summary
└── director/
    └── tasks/
        ├── route.ts          # GET all tasks by status
        └── summary/
            └── route.ts      # GET all tasks summary
```

### 2. Dependencies

Pastikan dependencies berikut sudah terinstall:

```json
{
  "@prisma/client": "^5.x.x",
  "next": "^14.x.x"
}
```

### 3. Database

API menggunakan tabel berikut:
- `tasklist` - Data task
- `proyek_module` - Data module
- `pegawai` - Data user
- `team_hierarchy` - Hierarki team (untuk manager)

### 4. Environment Variables

Tidak ada environment variable khusus yang diperlukan. API Key sudah hardcoded untuk testing:

```
x-api-key: 172dc4710ab54af8b1b405c89d6de9f0
```

⚠️ **Note**: Untuk production, sebaiknya API Key disimpan di environment variable.

---

## 🔧 Running the API

### 1. Start Development Server

```bash
cd logbook
npm run dev
```

Server akan berjalan di `http://localhost:3000`

### 2. Verify API is Running

```bash
curl http://localhost:3000/api/richzlog/my-tasks/summary?userId=1 \
  -H "x-api-key: 172dc4710ab54af8b1b405c89d6de9f0"
```

---

## 🧪 Testing

### Method 1: Using Test Script

```bash
# Make script executable
chmod +x test-tasklist-status-api.sh

# Run test
bash test-tasklist-status-api.sh
```

Script akan menjalankan 12 test cases:
1. My Tasks Summary
2. My Tasks - Todo
3. My Tasks - Doing
4. My Tasks - Pending Approval
5. My Tasks - Overdue
6. Manager Tasks Summary
7. Manager Tasks - Pending Approval
8. Director Tasks Summary
9. Director Tasks - Overdue
10. Invalid API Key (401)
11. Missing User ID (400)
12. Invalid Status (400)

### Method 2: Using Postman

1. Import collection: `RichzLog_Tasklist_Status_API.postman_collection.json`
2. Import environment: `RichzLog_Tasklist_Status_Environment.json`
3. Update environment variables:
   - `baseUrl`: http://192.168.1.5:3000 (atau http://localhost:3000)
   - `userId`: ID user yang valid
   - `managerId`: ID manager yang valid
   - `directorId`: ID director yang valid
4. Run collection

### Method 3: Manual cURL Testing

#### Test My Tasks Summary
```bash
curl -X GET "http://192.168.1.5:3000/api/richzlog/my-tasks/summary?userId=123" \
  -H "x-api-key: 172dc4710ab54af8b1b405c89d6de9f0"
```

#### Test My Tasks by Status
```bash
# Todo (Belum Dikerjakan)
curl -X GET "http://192.168.1.5:3000/api/richzlog/my-tasks?userId=123&status=todo" \
  -H "x-api-key: 172dc4710ab54af8b1b405c89d6de9f0"

# Doing (Sedang Dikerjakan)
curl -X GET "http://192.168.1.5:3000/api/richzlog/my-tasks?userId=123&status=doing" \
  -H "x-api-key: 172dc4710ab54af8b1b405c89d6de9f0"

# Pending Approval (Menunggu Review)
curl -X GET "http://192.168.1.5:3000/api/richzlog/my-tasks?userId=123&status=pending_approval" \
  -H "x-api-key: 172dc4710ab54af8b1b405c89d6de9f0"

# Overdue (Terlambat)
curl -X GET "http://192.168.1.5:3000/api/richzlog/my-tasks?userId=123&status=overdue" \
  -H "x-api-key: 172dc4710ab54af8b1b405c89d6de9f0"
```

#### Test Manager Tasks
```bash
# Team Summary
curl -X GET "http://192.168.1.5:3000/api/richzlog/manager/tasks/summary?managerId=45" \
  -H "x-api-key: 172dc4710ab54af8b1b405c89d6de9f0"

# Team Tasks by Status
curl -X GET "http://192.168.1.5:3000/api/richzlog/manager/tasks?managerId=45&status=pending_approval" \
  -H "x-api-key: 172dc4710ab54af8b1b405c89d6de9f0"
```

#### Test Director Tasks
```bash
# All Tasks Summary
curl -X GET "http://192.168.1.5:3000/api/richzlog/director/tasks/summary?directorId=1" \
  -H "x-api-key: 172dc4710ab54af8b1b405c89d6de9f0"

# All Tasks by Status
curl -X GET "http://192.168.1.5:3000/api/richzlog/director/tasks?directorId=1&status=overdue" \
  -H "x-api-key: 172dc4710ab54af8b1b405c89d6de9f0"
```

---

## 📊 Expected Responses

### Success Response - Summary
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

### Success Response - Task List
```json
{
  "success": true,
  "message": "Tasks retrieved successfully",
  "data": {
    "items": [
      {
        "id": 1,
        "kode": "TASK-001",
        "status": "MENUNGGU_PROSES_USER",
        "statusDisplay": "Belum Dikerjakan",
        "isOverdue": false,
        "isPendingApproval": false,
        ...
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

### Error Response - Invalid API Key
```json
{
  "success": false,
  "message": "Invalid or missing API key",
  "error": {
    "code": "INVALID_API_KEY"
  }
}
```

---

## 🔍 Troubleshooting

### Issue: API returns 401 Unauthorized

**Solution**: Pastikan header `x-api-key` dikirim dengan benar:
```bash
-H "x-api-key: 172dc4710ab54af8b1b405c89d6de9f0"
```

### Issue: API returns 400 Bad Request - Missing User ID

**Solution**: Pastikan parameter `userId` dikirim:
```bash
?userId=123
```

### Issue: API returns empty items array

**Possible causes**:
1. User tidak memiliki task
2. User ID tidak valid
3. Status filter terlalu spesifik

**Solution**: 
- Cek database apakah user memiliki task
- Coba tanpa filter status terlebih dahulu
- Gunakan user ID yang valid

### Issue: Manager/Director tidak bisa melihat task team

**Solution**: 
- Pastikan data `team_hierarchy` sudah diisi dengan benar
- Cek apakah `isActive = true` di tabel `team_hierarchy`
- Untuk director, seharusnya bisa melihat semua task tanpa filter

### Issue: Overdue count tidak sesuai

**Solution**:
- Pastikan field `calculatedDueDate` sudah terisi di database
- Overdue dihitung berdasarkan `calculatedDueDate < current_time` dan `status != SELESAI`

---

## 📱 Flutter Integration

### 1. Add HTTP Package

```yaml
dependencies:
  http: ^1.1.0
```

### 2. Create Service Class

Lihat contoh lengkap di file:
- `RICHZLOG_TASKLIST_STATUS_API.md` (Section 5.2)
- `RICHZLOG_TASKLIST_STATUS_QUICK_REFERENCE.md` (Section Flutter Integration)

### 3. Usage Example

```dart
// Get summary
final summary = await RichzLogTaskService.getMyTaskSummary(userId: 123);
print('Total tasks: ${summary.total}');
print('Todo: ${summary.todo}');

// Get tasks by status
final todoTasks = await RichzLogTaskService.getMyTasks(
  userId: 123,
  status: 'todo',
);
print('Todo tasks count: ${todoTasks.length}');
```

---

## 📚 Documentation Files

1. **RICHZLOG_TASKLIST_STATUS_API.md** - Dokumentasi lengkap API
2. **RICHZLOG_TASKLIST_STATUS_QUICK_REFERENCE.md** - Quick reference guide
3. **RICHZLOG_TASKLIST_STATUS_SETUP.md** - Setup & testing guide (file ini)
4. **RichzLog_Tasklist_Status_API.postman_collection.json** - Postman collection
5. **RichzLog_Tasklist_Status_Environment.json** - Postman environment
6. **test-tasklist-status-api.sh** - Test script

---

## 🎯 Next Steps

1. ✅ API sudah dibuat dan siap digunakan
2. ⏳ Test API menggunakan Postman atau test script
3. ⏳ Integrate dengan Flutter mobile app
4. ⏳ Test end-to-end dari mobile app
5. ⏳ Deploy ke production server

---

## 📞 Support

Untuk pertanyaan atau issue:
1. Cek dokumentasi lengkap di `RICHZLOG_TASKLIST_STATUS_API.md`
2. Cek quick reference di `RICHZLOG_TASKLIST_STATUS_QUICK_REFERENCE.md`
3. Hubungi tim development RichzLog

---

**Last Updated**: 2026-04-01  
**Version**: 1.0  
**Status**: Ready for Testing
