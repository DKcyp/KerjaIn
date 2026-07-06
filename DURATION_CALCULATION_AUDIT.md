# Duration Calculation System - Final Implementation

## 🎯 Konsep Perhitungan Durasi (v2 - Final)

### Task Lifecycle & Event Flow
```
ASSIGN → START → [STOP/PAUSE] → START → KIRIM → APPROVE
                                          ↓
                                        REJECT → START → KIRIM → APPROVE
```

### 📊 Logic Perhitungan Durasi

Sistem duration calculation menggunakan **event-based tracking** dari `tasklist_log` table. Setiap action yang dilakukan pada task dicatat sebagai event dengan timestamp, dan durasi dihitung berdasarkan urutan chronological events.

#### **1. Work Duration (Waktu Pengerjaan)**
- **Definisi**: Total waktu yang dihabiskan untuk mengerjakan task
- **Dihitung dari**: Semua periode **START → STOP/KIRIM**
- **Logic**:
  - Setiap kali ada event `START`, mulai hitung waktu kerja
  - Jika ada event `STOP` atau `PAUSE`, hitung durasi dari START ke STOP dan accumulate
  - Jika ada event `KIRIM` tanpa STOP sebelumnya, hitung durasi dari START ke KIRIM
  - Support multiple work sessions: jika ada STOP kemudian START lagi, hitung sebagai session terpisah
  - **Jika tidak ada KIRIM event** (langsung APPROVE), hitung **START → APPROVE** sebagai work duration

#### **2. Review Duration (Waktu Review)**
- **Definisi**: Total waktu yang dihabiskan reviewer untuk review task
- **Dihitung dari**: Semua periode **KIRIM → APPROVE/REJECT**
- **Logic**:
  - Setiap kali ada event `KIRIM`, mulai hitung waktu review
  - Jika ada event `APPROVE`, hitung durasi dari KIRIM ke APPROVE dan accumulate
  - Jika ada event `REJECT`, hitung durasi dari KIRIM ke REJECT dan accumulate
  - Support multiple review cycles: jika ada REJECT kemudian KIRIM lagi, hitung sebagai review cycle terpisah
  - Increment `rejectCount` setiap kali ada REJECT event

#### **3. Custom Duration**
- **Definisi**: Durasi manual yang di-set oleh user di UI
- **Stored in**: Field `customDurationHours` di tabel `tasklist`
- **Ditambahkan ke**: Total durasi akhir (opsional, untuk adjustment manual)

#### **4. Total Duration**
```
Total Duration = Work Duration + Review Duration + Custom Duration
```

### 🔍 Event Type Detection & Filtering

Sistem mengidentifikasi event type berdasarkan kombinasi `action`, `keterangan`, dan `status` fields:

| Event Type | Detection | Action |
|-----------|-----------|--------|
| **EDIT** | Contains: "durasi custom", "kompleksitas", "due date", "alasan edit" | ❌ SKIP (tidak dihitung) |
| **START** | Contains: "task started", "dimulai" | ✅ Set `lastStartTime` |
| **STOP** | Contains: "task stopped", "paused", "dihentikan" | ✅ Calculate START→STOP, accumulate work duration |
| **KIRIM** | Contains: "dikirim untuk review" | ✅ Calculate START→KIRIM (if no STOP), set `lastKirimTime` |
| **REJECT** | Contains: "direject", "rejected" | ✅ Calculate KIRIM→REJECT, accumulate review duration, increment rejectCount |
| **APPROVE** | Contains: "di-approve", "selesai", "completed" | ✅ Calculate KIRIM→APPROVE or START→APPROVE, set `isApproved=true` |

### 🔄 State Machine Logic

```
State: lastStartTime, lastKirimTime, totalWorkDuration, totalReviewDuration, rejectCount

START event:
  → lastStartTime = current_time

STOP event:
  → if lastStartTime exists:
      totalWorkDuration += (current_time - lastStartTime)
      lastStartTime = null

KIRIM event:
  → if lastStartTime exists:
      totalWorkDuration += (current_time - lastStartTime)
      lastStartTime = null
  → lastKirimTime = current_time

REJECT event:
  → if lastKirimTime exists:
      totalReviewDuration += (current_time - lastKirimTime)
      rejectCount++
      lastKirimTime = null

APPROVE event:
  → if lastKirimTime exists:
      totalReviewDuration += (current_time - lastKirimTime)
      isApproved = true
  → else if lastStartTime exists (no KIRIM):
      totalWorkDuration += (current_time - lastStartTime)
      isApproved = true
```

---

## 📋 Contoh Perhitungan Detail

### Scenario 1: Simple Flow (No Reject)
```
Timeline:
- 10:00 START
- 10:30 KIRIM
- 11:00 APPROVE

Event Processing:
1. START (10:00)
   → lastStartTime = 10:00

2. KIRIM (10:30)
   → lastStartTime exists, calculate: 10:30 - 10:00 = 30 menit
   → totalWorkDuration = 30 menit
   → lastStartTime = null
   → lastKirimTime = 10:30

3. APPROVE (11:00)
   → lastKirimTime exists, calculate: 11:00 - 10:30 = 30 menit
   → totalReviewDuration = 30 menit
   → isApproved = true

Hasil:
- Work Duration: 30 menit
- Review Duration: 30 menit
- Custom Duration: 0 menit
- Total = 30 + 30 + 0 = 60 menit (1 jam)
```

### Scenario 2: Multiple Work Sessions (STOP/START)
```
Timeline:
- 10:00 START
- 10:30 STOP (pause)
- 14:00 START (resume)
- 15:00 KIRIM
- 16:00 APPROVE

Event Processing:
1. START (10:00)
   → lastStartTime = 10:00

2. STOP (10:30)
   → lastStartTime exists, calculate: 10:30 - 10:00 = 30 menit
   → totalWorkDuration = 30 menit
   → lastStartTime = null

3. START (14:00)
   → lastStartTime = 14:00

4. KIRIM (15:00)
   → lastStartTime exists, calculate: 15:00 - 14:00 = 60 menit
   → totalWorkDuration = 30 + 60 = 90 menit
   → lastStartTime = null
   → lastKirimTime = 15:00

5. APPROVE (16:00)
   → lastKirimTime exists, calculate: 16:00 - 15:00 = 60 menit
   → totalReviewDuration = 60 menit
   → isApproved = true

Hasil:
- Work Duration: 90 menit (30 + 60)
- Review Duration: 60 menit
- Custom Duration: 0 menit
- Total = 90 + 60 + 0 = 150 menit (2.5 jam)
```

### Scenario 3: With Reject Cycle
```
Timeline:
- 10:00 START
- 11:00 KIRIM
- 12:00 REJECT
- 13:00 START (new cycle)
- 14:00 KIRIM
- 15:00 APPROVE

Event Processing:
1. START (10:00)
   → lastStartTime = 10:00

2. KIRIM (11:00)
   → lastStartTime exists, calculate: 11:00 - 10:00 = 60 menit
   → totalWorkDuration = 60 menit
   → lastStartTime = null
   → lastKirimTime = 11:00

3. REJECT (12:00)
   → lastKirimTime exists, calculate: 12:00 - 11:00 = 60 menit
   → totalReviewDuration = 60 menit
   → rejectCount = 1
   → lastKirimTime = null

4. START (13:00)
   → lastStartTime = 13:00

5. KIRIM (14:00)
   → lastStartTime exists, calculate: 14:00 - 13:00 = 60 menit
   → totalWorkDuration = 60 + 60 = 120 menit
   → lastStartTime = null
   → lastKirimTime = 14:00

6. APPROVE (15:00)
   → lastKirimTime exists, calculate: 15:00 - 14:00 = 60 menit
   → totalReviewDuration = 60 + 60 = 120 menit
   → isApproved = true

Hasil:
- Work Duration: 120 menit (60 + 60)
- Review Duration: 120 menit (60 + 60)
- Reject Count: 1
- Custom Duration: 0 menit
- Total = 120 + 120 + 0 = 240 menit (4 jam)
```

### Scenario 4: With Custom Duration
```
Timeline:
- 10:00 START
- 10:30 KIRIM
- 11:00 APPROVE
- Custom Duration: 2 jam (set di UI)

Event Processing:
(sama seperti Scenario 1)
- Work Duration: 30 menit
- Review Duration: 30 menit

Custom Duration Addition:
- customDurationHours = 2 jam = 120 menit
- Total = 30 + 30 + 120 = 180 menit (3 jam)

Hasil:
- Work Duration: 30 menit
- Review Duration: 30 menit
- Custom Duration: 120 menit
- Total = 180 menit (3 jam)
```

### Scenario 5: Direct Approve (No KIRIM)
```
Timeline:
- 10:00 START
- 15:00 APPROVE (langsung approve tanpa KIRIM)

Event Processing:
1. START (10:00)
   → lastStartTime = 10:00

2. APPROVE (15:00)
   → lastKirimTime is null (tidak ada KIRIM)
   → lastStartTime exists, calculate: 15:00 - 10:00 = 300 menit
   → totalWorkDuration = 300 menit (dihitung sebagai work, bukan review)
   → isApproved = true

Hasil:
- Work Duration: 300 menit (5 jam)
- Review Duration: 0 menit
- Custom Duration: 0 menit
- Total = 300 + 0 + 0 = 300 menit (5 jam)
```

### Scenario 6: Multiple Reject Cycles
```
Timeline:
- 10:00 START
- 11:00 KIRIM
- 12:00 REJECT (first rejection)
- 13:00 START
- 14:00 KIRIM
- 15:00 REJECT (second rejection)
- 16:00 START
- 17:00 KIRIM
- 18:00 APPROVE

Event Processing:
1. START (10:00) → lastStartTime = 10:00
2. KIRIM (11:00) → totalWorkDuration = 60, lastKirimTime = 11:00
3. REJECT (12:00) → totalReviewDuration = 60, rejectCount = 1
4. START (13:00) → lastStartTime = 13:00
5. KIRIM (14:00) → totalWorkDuration = 60 + 60 = 120, lastKirimTime = 14:00
6. REJECT (15:00) → totalReviewDuration = 60 + 60 = 120, rejectCount = 2
7. START (16:00) → lastStartTime = 16:00
8. KIRIM (17:00) → totalWorkDuration = 120 + 60 = 180, lastKirimTime = 17:00
9. APPROVE (18:00) → totalReviewDuration = 120 + 60 = 180, isApproved = true

Hasil:
- Work Duration: 180 menit (60 + 60 + 60)
- Review Duration: 180 menit (60 + 60 + 60)
- Reject Count: 2
- Custom Duration: 0 menit
- Total = 180 + 180 + 0 = 360 menit (6 jam)
```

---

## 🛠️ Implementation Details

### Database Schema

**tasklist table**
```sql
- id: INT PRIMARY KEY
- kode: VARCHAR (task code)
- totalDurationMinutes: INT (final calculated duration)
- customDurationHours: DECIMAL (custom duration set by user)
- startedAt: TIMESTAMP (when task was started)
- pausedAt: TIMESTAMP (when task was paused)
- isPaused: BOOLEAN (is task currently paused)
- status: ENUM (MENUNGGU_PROSES_USER, SEDANG_DIPROSES_USER, SEDANG_DIPROSES_USER_PAUSED, MENUNGGU_REVIEW_PM, SELESAI, etc.)
```

**tasklist_log table**
```sql
- id: INT PRIMARY KEY
- taskId: INT FOREIGN KEY
- waktu: TIMESTAMP (when event occurred)
- userId: INT (who performed the action)
- action: VARCHAR (START, STOP, KIRIM, REJECT, APPROVE, UPDATE, etc.)
- keterangan: TEXT (description of the action)
- status: VARCHAR (task status at that time)
- totalStartStopMinutes: INT (duration for this specific START-STOP cycle)
```

### API Endpoints

#### **GET /api/admin/recalculate-duration-v2**
Menghitung durasi untuk semua tasks dan menampilkan perbandingan old vs new duration.

**Query Parameters:**
- `monthsBack` (optional, default: 1) - Berapa bulan ke belakang untuk fetch tasks
- `limit` (optional, default: 100) - Berapa banyak tasks untuk diproses

**Response:**
```json
{
  "success": true,
  "dateRange": {
    "from": "2026-02-09T00:00:00.000Z",
    "to": "2026-03-09T00:00:00.000Z",
    "monthsBack": 1
  },
  "stats": {
    "totalTasks": 50,
    "tasksWithDifference": 12,
    "totalOldDuration": 5000,
    "totalNewDuration": 5200,
    "totalDifference": 200,
    "averageOldDuration": 100,
    "averageNewDuration": 104
  },
  "calculations": [
    {
      "taskId": 1,
      "taskCode": "TASK-001",
      "oldDuration": 60,
      "newDuration": 90,
      "difference": 30,
      "status": "INCREASED",
      "breakdown": {
        "startToKirimDuration": 50,
        "kirimToApproveDuration": 40,
        "rejectCount": 0,
        "isApproved": true
      }
    }
  ]
}
```

#### **POST /api/admin/recalculate-duration-v2**
Update `totalDurationMinutes` di tabel `tasklist` dengan nilai yang baru dihitung.

**Request Body:**
```json
{
  "taskIds": [1, 2, 3, 4, 5]
}
```

**Response:**
```json
{
  "success": true,
  "message": "Updated 5 tasks",
  "updated": [
    {
      "taskId": 1,
      "taskCode": "TASK-001",
      "newDuration": 90,
      "breakdown": {
        "startToKirimDuration": 50,
        "kirimToApproveDuration": 40,
        "rejectCount": 0,
        "isApproved": true
      }
    }
  ]
}
```

#### **POST /api/admin/populate-duration-v2**
Populate `totalStartStopMinutes` di semua `tasklist_log` entries dengan logic yang sama.

**Response:**
```json
{
  "success": true,
  "message": "Populated duration for X log entries"
}
```

### Time Tracking Functions (taskTimeTracker.ts)

**startTask(taskId, userId)**
- Mengubah status task ke `SEDANG_DIPROSES_USER`
- Set `startedAt` ke current time
- Validasi: hanya assigned user yang bisa start task
- Validasi: user tidak boleh punya active task lain
- Kirim notifikasi ke creator + PM

**pauseTask(taskId, userId)**
- Mengubah status task ke `SEDANG_DIPROSES_USER_PAUSED`
- Hitung durasi dari `startedAt` ke `pausedAt`
- Accumulate ke `totalDurationMinutes`
- Kirim notifikasi ke creator + PM

**resumeTask(taskId, userId)**
- Sama dengan `startTask` (resume = start ulang)

**stopTask(taskId, userId)**
- Mengubah status task ke `SEDANG_DIPROSES_USER_PAUSED`
- Hitung durasi dari `startedAt` ke current time
- Accumulate ke `totalDurationMinutes`
- Kirim notifikasi ke creator + PM

**completeTask(taskId, userId, programmerNote?, hasImage?)**
- Mengubah status task ke `MENUNGGU_REVIEW_PM`
- Hitung durasi dari `startedAt` ke current time
- Accumulate ke `totalDurationMinutes`
- Save `programmerDescription` jika ada
- Kirim notifikasi ke creator + PM

### Scripts

**scripts/populate-start-stop-duration.js**
- Manual script untuk populate `totalStartStopMinutes` di semua `tasklist_log` entries
- Menggunakan logic yang sama dengan API endpoint
- Bisa dijalankan untuk backfill data lama

### UI Features

**Halaman: /admin/duration-recalculation**
- Tabel dengan kolom:
  - Task Code
  - Old Duration (warna abu-abu)
  - New Duration (warna biru)
  - Work Duration (START → KIRIM) - warna biru
  - Review Duration (KIRIM → APPROVE) - warna ungu
  - Reject Count
  - Difference (warna hijau untuk increase, merah untuk decrease)
  - Status (SAME/INCREASED/DECREASED)
- Button "Populate Duration" untuk populate data dari logs
- Button "Select All" untuk select semua tasks
- Button "Convert" untuk update selected tasks ke database
- Filter by date range
- Pagination untuk handle banyak tasks

---

## ⚠️ Edge Cases Handled

### 1. No KIRIM Event (Direct Approve)
**Scenario**: Task di-approve langsung tanpa dikirim untuk review
```
START → APPROVE (no KIRIM)
```
**Handling**: Hitung START → APPROVE sebagai work duration (bukan review)
```
totalWorkDuration = APPROVE_time - START_time
totalReviewDuration = 0
```

### 2. Multiple START-STOP Cycles
**Scenario**: User pause dan resume task berkali-kali
```
START → STOP → START → STOP → START → KIRIM → APPROVE
```
**Handling**: Accumulate semua START-STOP durations
```
totalWorkDuration = (STOP1 - START1) + (STOP2 - START2) + (KIRIM - START3)
```

### 3. Multiple REJECT Cycles
**Scenario**: Task di-reject berkali-kali sebelum final approve
```
START → KIRIM → REJECT → START → KIRIM → REJECT → START → KIRIM → APPROVE
```
**Handling**: Accumulate semua review durations dan increment rejectCount
```
totalReviewDuration = (REJECT1 - KIRIM1) + (REJECT2 - KIRIM2) + (APPROVE - KIRIM3)
rejectCount = 2
```

### 3. EDIT Events
**Scenario**: User mengubah metadata task (custom duration, kompleksitas, due date)
```
START → EDIT (durasi custom) → KIRIM → APPROVE
```
**Handling**: Skip EDIT events, tidak mempengaruhi perhitungan durasi
```
totalWorkDuration = KIRIM - START (EDIT event di-skip)
```

### 4. Custom Duration
**Scenario**: User menambahkan custom duration di UI
```
Work Duration: 60 menit
Review Duration: 30 menit
Custom Duration: 2 jam (120 menit)
```
**Handling**: Tambahkan custom duration ke total
```
Total = 60 + 30 + 120 = 210 menit
```

### 5. Task Belum Approve
**Scenario**: Task masih dalam review, belum ada APPROVE event
```
START → KIRIM → (waiting for approval)
```
**Handling**: Hitung review duration dari KIRIM ke NOW (current time)
```
totalReviewDuration = NOW - KIRIM_time
isApproved = false
```

### 6. Incomplete Event Sequence
**Scenario**: Event sequence tidak lengkap atau tidak urut
```
KIRIM → START (out of order)
```
**Handling**: Process events secara chronological berdasarkan `waktu` field
```
Events di-sort by waktu ASC sebelum processing
```

### 7. Negative Duration
**Scenario**: Clock skew atau data corruption menyebabkan negative duration
```
START: 10:00
KIRIM: 09:30 (earlier than START)
```
**Handling**: Ignore negative durations, set ke 0
```
if (duration < 0) duration = 0
```

### 8. No Events
**Scenario**: Task tidak punya event log sama sekali
```
Task created tapi tidak ada action
```
**Handling**: Return 0 untuk semua durations
```
totalWorkDuration = 0
totalReviewDuration = 0
total = 0
```

---

## 🔄 Migration Path

### Step 1: Verify Current Data
```bash
# Check existing duration data
GET /api/admin/recalculate-duration-v2?monthsBack=1&limit=10
```
- Review perbandingan old vs new duration
- Identifikasi tasks dengan perbedaan signifikan
- Verify breakdown (work vs review duration)

### Step 2: Populate Duration Logs
```bash
# Populate totalStartStopMinutes di tasklist_log
POST /api/admin/populate-duration-v2
```
- Ini akan backfill data untuk semua existing logs
- Tidak mengubah `totalDurationMinutes` di tasklist table

### Step 3: Review & Validate
- Buka halaman `/admin/duration-recalculation`
- Review tabel dengan perbandingan old vs new duration
- Filter by status (INCREASED, DECREASED, SAME)
- Verify bahwa perubahan masuk akal

### Step 4: Selective Update
```bash
# Update selected tasks
POST /api/admin/recalculate-duration-v2
{
  "taskIds": [1, 2, 3, 4, 5]
}
```
- Update tasks yang sudah di-verify
- Monitor untuk memastikan tidak ada issue

### Step 5: Batch Update (Optional)
```bash
# Update semua tasks sekaligus
POST /api/admin/recalculate-duration-v2
{
  "taskIds": [all task IDs]
}
```
- Atau gunakan "Select All" + "Convert" di UI
- Data lama di `totalDurationMinutes` akan di-replace

### Step 6: Verify Final Results
- Check bahwa semua tasks sudah ter-update
- Verify bahwa duration calculations masuk akal
- Monitor untuk edge cases atau anomalies

---

## 📊 Monitoring & Debugging

### Check Duration Calculation for Specific Task
```bash
GET /api/admin/recalculate-duration-v2?monthsBack=12&limit=1000
# Filter hasil untuk task yang ingin di-check
```

### View Task Event Log
```bash
SELECT * FROM tasklist_log 
WHERE taskId = ? 
ORDER BY waktu ASC
```
- Review semua events untuk task
- Verify event sequence dan timestamps
- Identify anomalies atau missing events

### Check for Negative Durations
```bash
SELECT * FROM tasklist_log 
WHERE "totalStartStopMinutes" < 0
```
- Identify tasks dengan negative duration
- Investigate root cause (clock skew, data corruption, etc.)

### Statistics
```bash
SELECT 
  COUNT(*) as total_tasks,
  AVG("totalDurationMinutes") as avg_duration,
  MAX("totalDurationMinutes") as max_duration,
  MIN("totalDurationMinutes") as min_duration
FROM tasklist
WHERE "totalDurationMinutes" > 0
```

---

## 🎓 Key Takeaways

1. **Event-Based Tracking**: Durasi dihitung dari event sequence di `tasklist_log`, bukan dari field `startedAt`/`pausedAt`
2. **Chronological Processing**: Events di-process dalam urutan waktu (sorted by `waktu` ASC)
3. **State Machine**: Logic menggunakan state machine dengan `lastStartTime` dan `lastKirimTime`
4. **Accumulation**: Durasi di-accumulate untuk support multiple cycles (STOP/START, REJECT/KIRIM)
5. **Event Filtering**: EDIT events di-skip, hanya action events yang dihitung
6. **Breakdown Tracking**: Setiap calculation return breakdown (work, review, reject count, approved status)
7. **Custom Duration**: Optional custom duration bisa ditambahkan untuk adjustment manual
8. **Backward Compatible**: Sistem support tasks dengan incomplete event sequences
