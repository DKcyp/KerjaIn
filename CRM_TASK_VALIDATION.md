# CRM Task Validation - Dokumentasi

## Pengenalan

Sistem validasi task CRM memastikan bahwa setiap task yang berasal dari CRM memiliki jadwal dan durasi pengerjaan yang jelas sebelum dapat dimulai. Task dari CRM masuk dengan jadwal default (00:00) dan tanpa durasi, sehingga PM harus memvalidasi terlebih dahulu.

## Alur Kerja

### 1. Task dari CRM Masuk

Ketika CRM mengirim task baru via API:

```bash
POST /api/tasklistcrm
{
  "id_project": "CRM-123",
  "id_crm": "TASK-456",
  "tanggal": "2026-03-05",
  "keterangan": "Installasi VPN"
}
```

Task akan dibuat dengan:
- `scheduleAt`: 2026-03-05 00:00 (default)
- `customDurationHours`: null (belum diset)
- `idCrm`: "TASK-456" (penanda task dari CRM)

### 2. PM Melihat Task di List

Task akan muncul di tasklist dengan badge "CRM" untuk menandakan task dari CRM.

### 3. PM Klik "Mulai"

Saat PM klik tombol "Mulai" pada task CRM:

```
PM klik "Mulai"
    ↓
Backend check: scheduleAt = 00:00? customDurationHours = null?
    ↓
YES → Return error VALIDATION_REQUIRED
    ↓
Frontend tampilkan warning modal
```

### 4. Warning Modal Muncul

Modal "Ubah Status Task?" akan menampilkan warning:

```
┌─────────────────────────────────────────────────┐
│ ⏰ Ubah Status Task?                            │
│ 07 - 1 akan diubah dari Menunggu Proses        │
│ menjadi Sedang Diproses.                        │
│                                                 │
│ ⚠️ Task CRM Belum Divalidasi                    │
│ Task ini dari CRM dan perlu divalidasi:         │
│ • Jadwal masih default (00:00) - perlu diubah  │
│ • Durasi pengerjaan belum diset                 │
│                                                 │
│ [Edit Task] [Tutup]                             │
│                                                 │
│ (tombol Batal dan OK di-hide)                   │
└─────────────────────────────────────────────────┘
```

### 5. PM Edit Task

PM klik "Edit Task" → Modal Edit Task terbuka:

```
Modal Edit Task
├─ Jadwal Mulai: [datetime-local input]
├─ Durasi Pengerjaan: [number input] jam
└─ [Simpan] [Batal]
```

PM mengisi:
- Jadwal: 2026-03-06 09:00
- Durasi: 8 jam

Kemudian klik "Simpan".

### 6. Task Tervalidasi

Setelah PM save:
- `scheduleAt`: 2026-03-06 09:00 ✅
- `customDurationHours`: 8 ✅

### 7. PM Klik "Mulai" Lagi

Saat PM klik "Mulai" lagi:

```
Backend check: scheduleAt = 00:00? customDurationHours = null?
    ↓
NO → Validasi passed ✅
    ↓
Modal "Ubah Status Task?" muncul TANPA warning
    ↓
Tombol "Batal" dan "OK" muncul
    ↓
PM klik "OK" → Task started ✅
```

## Implementasi Teknis

### Backend Validation

**File**: `src/app/api/tasklist/[id]/time-tracking/route.ts`

```typescript
if (action === 'start' && task.idCrm) {
  const isDefaultSchedule = task.scheduleAt.getHours() === 0 && 
                            task.scheduleAt.getMinutes() === 0;
  const durationValue = task.customDurationHours ? Number(task.customDurationHours) : 0;
  const hasNoDuration = durationValue <= 0;
  
  if (isDefaultSchedule || hasNoDuration) {
    return NextResponse.json({
      error: 'VALIDATION_REQUIRED',
      message: 'Task dari CRM belum divalidasi. Set jadwal dan durasi pengerjaan terlebih dahulu.',
      needsValidation: true,
      currentSchedule: task.scheduleAt,
      currentDuration: durationValue,
      missingFields: {
        scheduleAt: isDefaultSchedule,
        customDurationHours: hasNoDuration
      }
    }, { status: 400 });
  }
}
```

### Frontend Modal

**File**: `src/app/(admin)/tasklist/page.tsx`

Warning box muncul saat:
1. Status change dari "MENUNGGU_PROSES_USER" ke "SEDANG_DIPROSES_USER"
2. Task memiliki `idCrm` (task dari CRM)
3. `scheduleAt` masih 00:00 ATAU `customDurationHours` kosong/0

Tombol "Edit Task" akan:
1. Close status modal
2. Open edit modal dengan task data
3. PM bisa edit jadwal & durasi
4. Save → task tervalidasi

### Helper Functions

**File**: `src/lib/taskValidation.ts`

```typescript
// Check apakah task CRM sudah divalidasi
isTaskCrmValidated(task): boolean

// Get detail status validasi
getTaskValidationStatus(task): {
  isValidated: boolean;
  needsSchedule: boolean;
  needsDuration: boolean;
  message?: string;
}
```

## Response API

### Saat Validasi Diperlukan

```json
{
  "error": "VALIDATION_REQUIRED",
  "message": "Task dari CRM belum divalidasi. Set jadwal dan durasi pengerjaan terlebih dahulu.",
  "needsValidation": true,
  "currentSchedule": "2026-03-05T00:00:00.000Z",
  "currentDuration": 0,
  "missingFields": {
    "scheduleAt": true,
    "customDurationHours": true
  }
}
```

### Saat Validasi Passed

```json
{
  "success": true,
  "taskId": 728,
  "status": "SEDANG_DIPROSES_USER",
  "startedAt": "2026-03-06T09:00:00.000Z"
}
```

## Testing

### Test Case 1: Task CRM Belum Divalidasi

```bash
# 1. Buat task dari CRM
POST /api/tasklistcrm
{
  "id_project": "CRM-123",
  "id_crm": "TASK-456",
  "tanggal": "2026-03-05",
  "keterangan": "Test task"
}

# Response: Task dibuat dengan scheduleAt = 00:00, customDurationHours = null

# 2. Coba start task
POST /api/tasklist/728/time-tracking
{
  "action": "start"
}

# Response: 400 VALIDATION_REQUIRED
```

### Test Case 2: Task CRM Sudah Divalidasi

```bash
# 1. Edit task untuk set jadwal & durasi
PATCH /api/tasklist/728
{
  "scheduleAt": "2026-03-06T09:00:00Z",
  "customDurationHours": 8
}

# Response: Task updated

# 2. Coba start task lagi
POST /api/tasklist/728/time-tracking
{
  "action": "start"
}

# Response: 200 OK - Task started
```

## UI/UX Flow

### Skenario 1: Task CRM Belum Divalidasi

```
1. PM buka tasklist
   ├─ Lihat task dengan badge "CRM"
   └─ Status: Menunggu Proses

2. PM klik "Mulai"
   ├─ Modal "Ubah Status Task?" muncul
   ├─ Warning box muncul
   ├─ Tombol "Edit Task" dan "Tutup" visible
   └─ Tombol "Batal" dan "OK" hidden

3. PM klik "Edit Task"
   ├─ Modal Edit Task terbuka
   ├─ PM isi jadwal: 2026-03-06 09:00
   ├─ PM isi durasi: 8 jam
   └─ PM klik "Simpan"

4. Modal Edit Task tutup
   └─ Task tervalidasi ✅

5. PM klik "Mulai" lagi
   ├─ Modal "Ubah Status Task?" muncul
   ├─ Warning box TIDAK muncul
   ├─ Tombol "Batal" dan "OK" visible
   └─ PM klik "OK" → Task started ✅
```

### Skenario 2: Task CRM Sudah Divalidasi

```
1. PM buka tasklist
   ├─ Lihat task dengan badge "CRM"
   └─ Status: Menunggu Proses

2. PM klik "Mulai"
   ├─ Modal "Ubah Status Task?" muncul
   ├─ Warning box TIDAK muncul
   ├─ Tombol "Batal" dan "OK" visible
   └─ PM klik "OK" → Task started ✅
```

## Catatan Penting

1. **Validasi hanya untuk task CRM**: Task normal (tanpa `idCrm`) tidak perlu validasi
2. **Validasi hanya saat start**: Validasi hanya dilakukan saat PM klik "Mulai"
3. **Edit task bisa kapan saja**: PM bisa edit jadwal & durasi kapan saja, tidak harus saat start
4. **Fallback ke modal edit**: Jika PM tidak ingin edit via warning box, bisa close modal dan edit task dari tabel

## Troubleshooting

### Error: "Task dari CRM belum divalidasi"

**Penyebab**: Task CRM belum diisi jadwal atau durasi

**Solusi**:
1. Klik "Edit Task" di warning box
2. Isi jadwal dan durasi
3. Klik "Simpan"
4. Coba start task lagi

### Error: "Task tidak ditemukan"

**Penyebab**: Task ID tidak valid

**Solusi**:
1. Refresh halaman
2. Cek apakah task masih ada di database

### Modal Edit tidak terbuka

**Penyebab**: Fungsi `openEdit()` tidak terdefinisi

**Solusi**:
1. Pastikan file `src/app/(admin)/tasklist/page.tsx` sudah ter-update
2. Restart development server

## Referensi

- **Requirements**: `.kiro/specs/crm-task-validation/requirements.md`
- **Design**: `.kiro/specs/crm-task-validation/design.md`
- **Backend**: `src/app/api/tasklist/[id]/time-tracking/route.ts`
- **Frontend**: `src/app/(admin)/tasklist/page.tsx`
- **Helper**: `src/lib/taskValidation.ts`
