# Panduan API Approval Tasklist untuk PM/Manager

## Overview
Dokumentasi khusus untuk PM/Manager yang menjelaskan cara menggunakan API approval tasklist untuk mengelola task yang perlu di-approve.

## Endpoint Khusus PM/Manager

### 1. Approval Queue - Daftar Task yang Perlu Disetujui
**Endpoint:** `GET /api/tasklist/approval-queue`

**Fungsi:** Mendapatkan daftar task dengan status `MENUNGGU_REVIEW_PM` yang perlu di-approve oleh PM/Manager.

**Akses:**
- **PM:** Hanya task di project mereka atau task yang mereka buat
- **ADMIN/SUPER_ADMIN:** Semua task yang perlu approval

**Parameter:**
```
?projectId=1          # Filter by project
?moduleId=2           # Filter by module  
?pegawaiId=3          # Filter by assignee
?page=1&size=20       # Pagination
?sortKey=scheduleAt   # Sort by field
?sortDir=asc          # Sort direction
```

**Response Khusus:**
```json
{
  "items": [
    {
      "id": 123,
      "kode": "01.02 - 1",
      "pegawaiNama": "John Doe",
      "creatorNama": "Jane Smith", 
      "proyekNama": "Mobile App",
      "moduleNama": "User Authentication",
      "scheduleAt": "2026-03-23T00:00:00.000Z",
      "waitingDays": 2,           // Berapa hari menunggu approval
      "isOverdue": false,         // Apakah sudah terlambat
      "availableActions": ["approve", "reject"]
    }
  ],
  "summary": {
    "totalPending": 25,         // Total task pending
    "overdueCount": 3,          // Task yang terlambat
    "avgWaitingDays": 2         // Rata-rata hari menunggu
  }
}
```

### 2. Approval Statistics - Dashboard Statistik
**Endpoint:** `GET /api/tasklist/approval-stats`

**Fungsi:** Mendapatkan statistik approval untuk dashboard PM/Manager.

**Parameter:**
```
?projectId=1    # Filter by project
?period=30      # Periode dalam hari (default: 30, max: 365)
```

**Response:**
```json
{
  "summary": {
    "pendingApprovals": 25,        // Task yang menunggu approval
    "overdueApprovals": 3,         // Task overdue
    "approvedTasks": 45,           // Task yang di-approve (periode)
    "rejectedTasks": 5,            // Task yang di-reject (periode)
    "avgApprovalTimeHours": 4.5,   // Rata-rata waktu approval (jam)
    "period": "30 days"
  },
  "statusBreakdown": [             // Breakdown status task
    {
      "status": "MENUNGGU_REVIEW_PM",
      "count": 25,
      "percentage": 35
    }
  ],
  "topAssignees": [                // Assignee dengan task pending terbanyak
    {
      "pegawaiId": 3,
      "pegawaiNama": "John Doe",
      "pendingCount": 8
    }
  ],
  "dailyTrend": [                  // Trend approval harian (7 hari terakhir)
    {
      "date": "2026-03-17",
      "count": 5
    }
  ]
}
```

## Workflow Approval untuk PM

### 1. Cek Approval Queue
```bash
# Lihat semua task yang perlu di-approve
curl -X GET "http://192.168.1.10:3000/api/tasklist/approval-queue" \
  -H "Cookie: session=172dc4710ab54af8b1b405c89d6de9f0"

# Filter by project tertentu
curl -X GET "http://192.168.1.10:3000/api/tasklist/approval-queue?projectId=1" \
  -H "Cookie: session=172dc4710ab54af8b1b405c89d6de9f0"

# Urutkan berdasarkan yang paling lama menunggu
curl -X GET "http://192.168.1.10:3000/api/tasklist/approval-queue?sortKey=updatedAt&sortDir=asc" \
  -H "Cookie: session=172dc4710ab54af8b1b405c89d6de9f0"
```

### 2. Review Task Detail
```bash
# Lihat detail task sebelum approve/reject
curl -X GET "http://192.168.1.10:3000/api/tasklist/123" \
  -H "Cookie: session=172dc4710ab54af8b1b405c89d6de9f0"
```

### 3. Approve Task
```bash
curl -X PUT "http://192.168.1.10:3000/api/tasklist/123" \
  -H "Content-Type: application/json" \
  -H "Cookie: session=172dc4710ab54af8b1b405c89d6de9f0" \
  -d '{
    "status": "SELESAI",
    "keterangan": "Task approved - good work! Ready for deployment."
  }'
```

### 4. Reject Task
```bash
curl -X PUT "http://192.168.1.10:3000/api/tasklist/123" \
  -H "Content-Type: application/json" \
  -H "Cookie: session=172dc4710ab54af8b1b405c89d6de9f0" \
  -d '{
    "status": "MENUNGGU_PROSES_USER",
    "keterangan": "Please fix the following issues: 1. Add error handling for edge cases, 2. Update unit tests, 3. Fix code formatting issues"
  }'
```

### 5. Monitor Statistics
```bash
# Dashboard statistik bulanan
curl -X GET "http://192.168.1.10:3000/api/tasklist/approval-stats?period=30" \
  -H "Cookie: session=172dc4710ab54af8b1b405c89d6de9f0"

# Statistik project tertentu
curl -X GET "http://192.168.1.10:3000/api/tasklist/approval-stats?projectId=1&period=7" \
  -H "Cookie: session=172dc4710ab54af8b1b405c89d6de9f0"
```

## Skenario Penggunaan PM

### Skenario 1: Morning Review (Cek Task Harian)
```bash
# 1. Cek berapa task yang menunggu approval
curl -X GET "http://192.168.1.10:3000/api/tasklist/approval-queue?page=1&size=50" \
  -H "Cookie: session=172dc4710ab54af8b1b405c89d6de9f0"

# 2. Prioritaskan task yang overdue
curl -X GET "http://192.168.1.10:3000/api/tasklist/approval-queue?sortKey=scheduleAt&sortDir=asc" \
  -H "Cookie: session=172dc4710ab54af8b1b405c89d6de9f0"

# 3. Cek statistik untuk dashboard
curl -X GET "http://192.168.1.10:3000/api/tasklist/approval-stats?period=7" \
  -H "Cookie: session=172dc4710ab54af8b1b405c89d6de9f0"
```

### Skenario 2: Project-Specific Review
```bash
# 1. Focus pada project tertentu
curl -X GET "http://192.168.1.10:3000/api/tasklist/approval-queue?projectId=1" \
  -H "Cookie: session=172dc4710ab54af8b1b405c89d6de9f0"

# 2. Lihat statistik project tersebut
curl -X GET "http://192.168.1.10:3000/api/tasklist/approval-stats?projectId=1&period=30" \
  -H "Cookie: session=172dc4710ab54af8b1b405c89d6de9f0"
```

### Skenario 3: Assignee Performance Review
```bash
# 1. Lihat task dari assignee tertentu yang perlu approval
curl -X GET "http://192.168.1.10:3000/api/tasklist/approval-queue?pegawaiId=3" \
  -H "Cookie: session=172dc4710ab54af8b1b405c89d6de9f0"

# 2. Cek performa assignee dari statistik
curl -X GET "http://192.168.1.10:3000/api/tasklist/approval-stats" \
  -H "Cookie: session=172dc4710ab54af8b1b405c89d6de9f0"
# Lihat di topAssignees untuk melihat siapa yang paling banyak pending
```

## Best Practices untuk PM

### 1. Prioritas Approval
1. **Overdue tasks** - Task yang sudah melewati deadline
2. **Critical modules** - Module yang blocking development lain
3. **Long waiting** - Task yang sudah menunggu approval lama
4. **High complexity** - Task dengan complexity tinggi

### 2. Feedback Quality
```json
{
  "status": "MENUNGGU_PROSES_USER",
  "keterangan": "Good progress! Please address these points:\n\n1. ✅ Logic implementation is correct\n2. ❌ Missing error handling for API timeout\n3. ❌ Unit tests coverage below 80%\n4. ⚠️ Consider adding input validation\n\nPlease fix items 2-4 and resubmit. Great work overall!"
}
```

### 3. Approval dengan Attachment
```bash
# Approve dengan screenshot atau dokumen pendukung
curl -X PUT "http://192.168.1.10:3000/api/tasklist/123" \
  -H "Cookie: session=172dc4710ab54af8b1b405c89d6de9f0" \
  -F "status=SELESAI" \
  -F "keterangan=Approved with testing evidence attached" \
  -F "image=@approval_screenshot.png"
```

### 4. Monitoring KPI
Gunakan endpoint `/approval-stats` untuk monitor:
- **Approval Rate:** `approvedTasks / (approvedTasks + rejectedTasks)`
- **Average Approval Time:** `avgApprovalTimeHours`
- **Overdue Percentage:** `overdueApprovals / pendingApprovals`
- **Team Performance:** Lihat `topAssignees` untuk identifikasi bottleneck

## Error Handling

### 403 Forbidden
```json
{
  "error": "Forbidden - Only PM, ADMIN, and SUPER_ADMIN can access approval queue"
}
```
**Solusi:** Pastikan user memiliki role PM, ADMIN, atau SUPER_ADMIN.

### Empty Results
```json
{
  "items": [],
  "total": 0,
  "summary": {
    "totalPending": 0,
    "overdueCount": 0,
    "avgWaitingDays": 0
  }
}
```
**Artinya:** Tidak ada task yang perlu di-approve (good news!).

### 401 Unauthorized
**Solusi:** Session token expired, perlu login ulang.

## Integration dengan Frontend

### Dashboard Widget
```javascript
// Fetch approval queue untuk dashboard
const approvalQueue = await fetch('/api/tasklist/approval-queue?page=1&size=5')
  .then(res => res.json());

// Fetch statistics untuk charts
const stats = await fetch('/api/tasklist/approval-stats?period=30')
  .then(res => res.json());

// Display pending count
document.getElementById('pending-count').textContent = stats.summary.pendingApprovals;

// Display overdue alert
if (stats.summary.overdueApprovals > 0) {
  showAlert(`${stats.summary.overdueApprovals} tasks are overdue!`);
}
```

### Real-time Updates
```javascript
// Poll for updates setiap 5 menit
setInterval(async () => {
  const queue = await fetch('/api/tasklist/approval-queue?page=1&size=1')
    .then(res => res.json());
  
  updateBadgeCount(queue.total);
}, 5 * 60 * 1000);
```

## Tips untuk PM

1. **Daily Routine:** Cek approval queue setiap pagi
2. **Set Targets:** Target approval dalam 24 jam untuk task normal
3. **Communicate:** Berikan feedback yang konstruktif dan spesifik
4. **Monitor Trends:** Gunakan statistik untuk identifikasi pattern
5. **Delegate:** Untuk project besar, consider multiple PM/reviewer

Endpoint approval ini dirancang khusus untuk memudahkan PM/Manager dalam mengelola approval workflow dengan efisien! 🚀