# KPI Programmer dengan RichzSpot Integration

## Overview
Implementasi perhitungan KPI programmer yang mengintegrasikan data jadwal kerja dari RichzSpot API. Sistem ini menghitung metrik performa berdasarkan:
- Total jam absen (JA) dari RichzSpot API (kurang 1 jam untuk break)
- Total jam jadwal tasklist (JT) - hanya 20% untuk PM
- Total jam jadwal tasklist selesai (JS) - hanya 20% untuk PM
- Total jam jadwal tasklist belum selesai (JB) - hanya 20% untuk PM
- Selisih jam (SJ) = JA - JS
- Jam tasklist log dalam JA (JP)
- Jam aktif selesai (JAS) = JA sampai menit sekarang

## Fitur Utama

### 1. Data Jadwal dari RichzSpot API
- Mengambil jadwal kerja setiap hari dari `/api/hours-meter-auto/user`
- Menghitung total jam kerja dalam periode (dengan exclude hari libur)
- Mempertimbangkan break time dari master_break_time
- **JA (Jam Absen)** = Total jam kerja - 1 jam (untuk break 12:00-13:00)
- Fallback ke default 8 jam/hari jika API gagal

### 2. Filter PM (20% dari Tim)
- Setiap task yang dibuat oleh PM hanya dihitung 20% untuk PM
- Programmer yang mengerjakan task mendapat 100%
- Memastikan PM tidak mendapat kredit penuh untuk pekerjaan tim

### 3. Metrik KPI yang Dihitung

#### JA (Jam Absen)
```
JA = Total Jam Kerja dari RichzSpot - 1 jam (break)
```
- Total jam yang tersedia untuk bekerja
- Sudah dikurangi jam istirahat (12:00-13:00)

#### JT (Jam Total)
```
JT = Sum(Estimasi Jam Tasklist)
```
- Total estimasi jam untuk semua task
- PM hanya mendapat 20% dari JT

#### JS (Jam Selesai)
```
JS = Sum(Jam Aktual Task Selesai)
```
- Total jam aktual untuk task yang sudah selesai
- PM hanya mendapat 20% dari JS

#### JB (Jam Belum)
```
JB = Sum(Estimasi Jam Task Belum Selesai)
```
- Total estimasi jam untuk task yang belum selesai
- PM hanya mendapat 20% dari JB

#### SJ (Selisih Jam)
```
SJ = JA - JS
```
- Perbedaan antara jam absen dan jam selesai
- Menunjukkan sisa jam yang belum digunakan

#### JP (Jam Proses)
```
JP = Sum(Jam Tasklist Log dalam JA)
```
- Total jam dari tasklist log yang tercatat dalam jam kerja
- Hanya tasklist log yang dalam periode JA

#### JAS (Jam Aktif Selesai)
```
JAS = JA sampai menit sekarang
```
- Jam aktif yang sudah terpakai sampai saat ini
- Digunakan untuk tracking real-time

#### Completion Rate (%)
```
Completion Rate = (Completed Tasks / Total Tasks) * 100
```

#### On-Time Rate (%)
```
On-Time Rate = (On-Time Tasks / Completed Tasks) * 100
```

#### Productivity (%)
```
Productivity = (Estimated Hours / Actual Hours) * 100
```

#### Utilization Rate (%)
```
Utilization Rate = (Actual Working Hours / Total Available Working Hours) * 100
```

## Fitur Utama

### 1. Data Jadwal dari RichzSpot API
- Mengambil jadwal kerja setiap hari dari `/api/hours-meter-auto/user`
- Menghitung total jam kerja dalam periode (dengan exclude hari libur)
- Mempertimbangkan break time dari master_break_time
- Fallback ke default 8 jam/hari jika API gagal

### 2. Metrik KPI yang Dihitung

#### Completion Rate (%)
```
Completion Rate = (Completed Tasks / Total Tasks) * 100
```
- Menunjukkan persentase task yang selesai
- Target: ≥ 80%

#### On-Time Rate (%)
```
On-Time Rate = (On-Time Tasks / Completed Tasks) * 100
```
- Menunjukkan persentase task yang selesai tepat waktu
- Target: ≥ 80%

#### Productivity (%)
```
Productivity = (Estimated Hours / Actual Hours) * 100
```
- Score > 100 = lebih cepat dari estimasi (good)
- Score = 100 = sesuai estimasi (perfect)
- Score < 100 = lebih lambat dari estimasi (needs improvement)
- Target: ≥ 100%

#### Utilization Rate (%)
```
Utilization Rate = (Actual Working Hours / Total Available Working Hours) * 100
```
- Menunjukkan persentase penggunaan jam kerja yang tersedia
- Diambil dari RichzSpot API
- Target: 80-100%

#### Average Completion Time (hours)
```
Average = Total Actual Minutes / Completed Tasks / 60
```
- Rata-rata waktu pengerjaan per task
- Membantu estimasi task di masa depan

## Implementasi

### Helper Functions: `kpiCalculator.ts`

```typescript
// Get total working hours from RichzSpot API
export async function getUserTotalWorkingHours(
  userId: number,
  startDate: Date,
  endDate: Date
): Promise<UserScheduleInfo>

// Calculate utilization rate
export function calculateUtilizationRate(
  actualHours: number,
  totalWorkingHours: number
): number

// Calculate productivity score
export function calculateProductivity(
  estimatedHours: number,
  actualHours: number
): number

// Get performance level
export function getPerformanceLevel(metrics: KPIMetrics): {
  level: 'excellent' | 'good' | 'average' | 'poor';
  score: number;
  description: string;
}
```

### Mapping Kolom KPI ke Tasklist Fields

| Kolom KPI | Formula | Sumber Data | Keterangan |
|-----------|---------|-------------|-----------|
| **JA (Jam Absen)** | Total Jam Kerja - 1 jam | RichzSpot API | Total jam kerja dari jadwal RichzSpot dikurangi 1 jam untuk break |
| **JT (Jam Total)** | Sum(Estimasi Jam) | Database | Total estimasi jam tasklist (PM: 20% dari timnya) |
| **JS (Jam Selesai)** | Sum(Jam Aktual Selesai) | Database | Total jam aktual untuk task selesai (PM: 20% dari timnya) |
| **JB (Jam Belum)** | Sum(Estimasi Jam Belum) | Database | Total estimasi jam task belum selesai (PM: 20% dari timnya) |
| **SJ (Selisih Jam)** | JA - JS | Calculated | Sisa jam yang belum digunakan |
| **JP (Jam Proses)** | Sum(Tasklist Log dalam JA) | Database | Total jam dari tasklist log yang tercatat dalam jam kerja |
| **JAS (Jam Aktif Selesai)** | JA sampai menit sekarang | Calculated | Jam aktif yang sudah terpakai sampai saat ini |
| **Completion Rate** | (Selesai / Total) * 100 | Database | Persentase task selesai |
| **On-Time Rate** | (OnTime / Selesai) * 100 | Database | Persentase task selesai tepat waktu |
| **Productivity** | (Estimasi / Aktual) * 100 | Database | Persentase produktivitas |
| **Utilization Rate** | (Aktual / Total Kerja) * 100 | RichzSpot API | Persentase penggunaan jam kerja |

### Status Tasklist yang Digunakan

Hanya status yang valid di enum TaskStatus yang diproses:

| Status | Kategori | Keterangan |
|--------|----------|-----------|
| `SELESAI` | Completed | Task sudah selesai |
| `MENUNGGU_REVIEW_PM` | Review | Menunggu review dari PM |
| `SEDANG_DIPROSES_USER` | In Progress | Task sedang dikerjakan |
| `SEDANG_DIPROSES_USER_PAUSED` | In Progress | Task sedang dikerjakan tapi di-pause |
| `MENUNGGU_PROSES_USER` | Not Started | Task belum diproses |

### API Endpoint: `/api/kpi-programmer`

**Query Parameters:**
- `period`: day, week, month, year (default: month)
- `pegawaiId`: (optional) Filter by specific programmer

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "pegawaiId": 1,
      "pegawaiName": "John Doe",
      "tim": "Manage Service",
      "totalTasks": 15,
      "selesai": 12,
      "reviewPM": 2,
      "proses": 1,
      "belumDiproses": 0,
      "jamAbsen": 160,
      "jamTotal": 120,
      "jamSelesai": 114,
      "jamBelum": 6,
      "selisihJam": 0,
      "revisi": 0,
      "jamProses": 5,
      "jamAktifSelesai": 114,
      "completedTasks": 12,
      "inProgressTasks": 1,
      "onTimeTasks": 9,
      "overdueTasks": 3,
      "completionRate": 80,
      "onTimeRate": 75,
      "avgCompletionTime": 9.5,
      "productivity": 105,
      "totalEstimatedHours": 120,
      "totalActualHours": 114,
      "totalWorkingHours": 160,
      "utilizationRate": 71,
      "projectCount": 5,
      "projects": ["Project A", "Project B"]
    }
  ],
  "overall": {
    "totalProgrammers": 10,
    "totalTasks": 150,
    "totalCompleted": 120,
    "totalInProgress": 20,
    "totalOnTime": 90,
    "totalOverdue": 30,
    "totalWorkingHours": 1600,
    "totalActualHours": 1140,
    "avgCompletionRate": 80,
    "avgOnTimeRate": 75,
    "avgProductivity": 105,
    "avgUtilizationRate": 71
  },
  "period": "month",
  "dateRange": {
    "start": "2026-04-12T00:00:00.000Z",
    "end": "2026-05-12T00:00:00.000Z"
  }
}
```

**Penjelasan Kolom Response:**
- `jamAbsen` (JA): Total jam kerja dari RichzSpot API (dinamis)
- `jamTotal` (JT): Total estimasi jam kerja
- `jamSelesai` (JS): Total jam aktual untuk task selesai
- `jamBelum` (JB): Sisa jam yang belum dikerjakan
- `jamProses` (JP): Jam untuk task yang sedang diproses
- `jamAktifSelesai` (JAS): Jam aktual untuk task selesai
- `completionRate`: Persentase task selesai
- `onTimeRate`: Persentase task selesai tepat waktu
- `productivity`: Persentase produktivitas (estimasi vs aktual)
- `utilizationRate`: Persentase penggunaan jam kerja yang tersedia

## Workflow

### 1. Data Collection
```
Tasklist Data (DB) + RichzSpot Schedule (API) → KPI Calculation
```

### 2. Calculation Process
```
For each programmer:
  1. Get all tasks in period
  2. Group by status (completed, in-progress, etc)
  3. Get total working hours from RichzSpot API
  4. Calculate metrics:
     - Completion Rate
     - On-Time Rate
     - Productivity
     - Utilization Rate
     - Average Completion Time
  5. Determine performance level
```

### 3. Performance Scoring
```
Total Score = (Completion * 0.3) + (OnTime * 0.3) + (Productivity * 0.2) + (Utilization * 0.2)

Score ≥ 90 → Excellent
Score ≥ 75 → Good
Score ≥ 60 → Average
Score < 60 → Poor
```

## Data Flow

```
┌─────────────────────────────────────────────────────────────┐
│                    KPI Programmer Page                      │
│                  (kpi-programmer/page.tsx)                  │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                   API Endpoint                              │
│              (/api/kpi-programmer)                          │
└────────────────────────┬────────────────────────────────────┘
                         │
        ┌────────────────┼────────────────┐
        ▼                ▼                ▼
┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│  Tasklist    │  │ RichzSpot    │  │ Break Time   │
│  Database    │  │ API          │  │ Master       │
└──────────────┘  └──────────────┘  └──────────────┘
        │                ▼                │
        │         ┌──────────────┐        │
        │         │ getUserTotal │        │
        │         │ WorkingHours │        │
        │         └──────────────┘        │
        │                │                │
        └────────────────┼────────────────┘
                         ▼
        ┌────────────────────────────────┐
        │   KPI Calculator Functions     │
        │  (kpiCalculator.ts)            │
        │                                │
        │ - calculateUtilizationRate()   │
        │ - calculateProductivity()      │
        │ - calculateCompletionRate()    │
        │ - getPerformanceLevel()        │
        └────────────────────────────────┘
                         │
                         ▼
        ┌────────────────────────────────┐
        │   KPI Metrics Result           │
        │                                │
        │ - Completion Rate              │
        │ - On-Time Rate                 │
        │ - Productivity                 │
        │ - Utilization Rate             │
        │ - Performance Level            │
        └────────────────────────────────┘
```

## Example Usage

### Get KPI for Last Month
```bash
GET /api/kpi-programmer?period=month
```

### Get KPI for Specific Programmer
```bash
GET /api/kpi-programmer?period=month&pegawaiId=1
```

### Get KPI for Last 7 Days
```bash
GET /api/kpi-programmer?period=week
```

## Performance Interpretation

### Excellent (Score ≥ 90)
- Completion Rate: ≥ 90%
- On-Time Rate: ≥ 90%
- Productivity: ≥ 100%
- Utilization Rate: ≥ 80%
- **Action**: Maintain performance, consider for promotion

### Good (Score ≥ 75)
- Completion Rate: ≥ 80%
- On-Time Rate: ≥ 80%
- Productivity: ≥ 90%
- Utilization Rate: ≥ 70%
- **Action**: Good performance, minor improvements needed

### Average (Score ≥ 60)
- Completion Rate: ≥ 60%
- On-Time Rate: ≥ 60%
- Productivity: ≥ 80%
- Utilization Rate: ≥ 60%
- **Action**: Performance needs improvement, provide coaching

### Poor (Score < 60)
- Completion Rate: < 60%
- On-Time Rate: < 60%
- Productivity: < 80%
- Utilization Rate: < 60%
- **Action**: Immediate intervention required

## Troubleshooting

### Issue: RichzSpot API Not Responding
**Solution**: 
- System fallback ke default 8 jam/hari
- Check RichzSpot API status
- Verify RICHZSPOT_BE_URL in .env.local

### Issue: Utilization Rate Too Low
**Possible Causes**:
- Programmer tidak mencatat waktu dengan benar
- Task duration tidak sesuai dengan actual time
- Banyak task yang belum selesai

**Solution**:
- Review task estimation accuracy
- Ensure time tracking is accurate
- Adjust task complexity if needed

### Issue: Productivity Score > 150%
**Meaning**: Programmer bekerja jauh lebih cepat dari estimasi
**Action**: 
- Review task complexity estimation
- Consider programmer untuk task yang lebih kompleks
- Update complexity master data

## Future Enhancements

1. **Historical Tracking**: Simpan KPI history untuk trend analysis
2. **Predictive Analytics**: Prediksi performa berdasarkan historical data
3. **Team Comparison**: Bandingkan performa antar tim
4. **Custom Metrics**: Allow custom KPI metrics per project
5. **Alerts**: Notifikasi jika performa di bawah threshold
6. **Export**: Export KPI data ke Excel/PDF

## Related Files

- `src/lib/kpiCalculator.ts` - KPI calculation functions
- `src/app/api/kpi-programmer/route.ts` - API endpoint
- `src/app/(admin)/kpi-programmer/page.tsx` - UI page
- `src/lib/richzspotService.ts` - RichzSpot API integration
- `src/lib/breakTimeService.ts` - Break time management

## Version History

- **v1.2.0** (2026-05-13): Corrected KPI Logic
  - Fixed JA calculation: Total jam kerja - 1 jam (untuk break 12:00-13:00)
  - Fixed SJ formula: SJ = JA - JS (bukan JT - JS - JP)
  - Added PM filtering: PM hanya mendapat 20% dari JT, JS, JB
  - Added JP calculation: Jam tasklist log yang dalam JA
  - Added JAS calculation: JA sampai menit sekarang
  - Implemented createdBy tracking untuk PM filtering
  - Added tasklistLog query untuk JP calculation
  - Updated documentation dengan formula yang benar

- **v1.1.0** (2026-05-13): Fixed Field Mapping
  - Fixed field mapping: `customDurationHours` instead of `estimatedManHour`
  - Fixed field mapping: `totalDurationMinutes` instead of `totalStartStopMinutes`
  - Fixed field mapping: `assigneeWorkDeadline` instead of `targetDate`
  - Fixed field mapping: `updatedAt` instead of `completionTime`
  - Added support for `backlog.estimatedManHour` as fallback for estimated hours
  - Fixed status filtering to only use valid TaskStatus enum values
  - Updated response structure with all KPI columns (JA, JT, JS, JB, SJ, JP, JAS)
  - Added `totalWorkingHours` and `utilizationRate` to response

- **v1.0.0** (2026-05-12): Initial implementation
  - Added RichzSpot API integration for working hours
  - Implemented KPI metrics calculation
  - Added utilization rate metric
  - Created KPI calculator helper functions
