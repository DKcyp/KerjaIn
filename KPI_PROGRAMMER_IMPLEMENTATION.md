# KPI Programmer - Implementation Documentation

## Overview
Sistem monitoring KPI (Key Performance Indicator) untuk mengukur dan memantau performa programmer berdasarkan data tasklist yang ada.

## Features

### 1. Dashboard KPI Programmer - Modern UI
- **Path**: `/kpi-programmer`
- **Access**: Public (semua role dapat mengakses)
- **Auto-refresh**: Manual refresh dengan tombol animated
- **Design**: Glassmorphism dengan gradient backgrounds

### 2. Modern Design Elements
- ✨ **Glassmorphism Effect**: Backdrop blur dengan transparency
- 🎨 **Gradient Backgrounds**: Smooth color transitions
- 🎭 **Micro-interactions**: Hover effects dan animations
- 📱 **Responsive Design**: Mobile-first approach
- 🌓 **Dark Mode Support**: Seamless theme switching
- ⚡ **Smooth Transitions**: 300ms duration untuk semua animasi

### 2. Metrik KPI yang Diukur

#### A. Completion Rate (Tingkat Penyelesaian)
- **Formula**: `(Completed Tasks / Total Tasks) × 100%`
- **Kategori**:
  - 🌟 Excellent: ≥90%
  - ✅ Good: 80-89%
  - ⚠️ Average: 60-79%
  - ❌ Need Improvement: <60%

#### B. On-Time Rate (Tingkat Ketepatan Waktu)
- **Formula**: `(On-Time Tasks / Completed Tasks) × 100%`
- **Kriteria**: Task selesai sebelum atau pada target date

#### C. Productivity (Produktivitas)
- **Formula**: `(Estimated Hours / Actual Hours) × 100%`
- **Interpretasi**:
  - >100%: Lebih cepat dari estimasi (sangat produktif)
  - 80-100%: Sesuai estimasi (produktif)
  - <80%: Lebih lambat dari estimasi (perlu improvement)

#### D. Average Completion Time
- **Formula**: `Total Actual Minutes / Completed Tasks / 60`
- **Unit**: Hours
- **Sumber**: Field `totalStartStopMinutes` dari tasklist

### 3. Visualisasi Data

#### A. Overall Statistics Cards
- Total Tasks
- Average Completion Rate
- Average On-Time Rate
- Total Programmers

#### B. Task Status Overview
- Selesai (hijau)
- In Progress (biru)
- Overdue (merah)

#### C. Detailed Table
Menampilkan semua programmer dengan kolom:
- **No** (nomor urut berdasarkan sorting)
- Programmer (dengan avatar dan jumlah project) - **Sortable**
- Total Tasks (dengan info active tasks) - **Sortable**
- Selesai - **Sortable**
- Completion Rate (progress bar + badge) - **Sortable**
- On-Time Rate (progress bar + info) - **Sortable**
- Avg Time (hours) - **Sortable**
- Productivity (dengan color coding) - **Sortable**
- Projects (dengan info overdue) - **Sortable**

**Fitur Sorting:**
- Klik pada header kolom untuk sort
- Klik lagi untuk toggle ascending/descending
- Visual feedback dengan efek pressed button (shadow-inner + background color)
- Kolom aktif: background brand color + shadow inner
- Kolom tidak aktif: hover effect abu-abu
- Default sort: Completion Rate (descending)

### 4. Period Filter
User dapat memilih periode analisis:
- **Hari Ini**: Data hari ini saja
- **7 Hari Terakhir**: Data 1 minggu terakhir
- **30 Hari Terakhir**: Data 1 bulan terakhir (default)
- **1 Tahun Terakhir**: Data 1 tahun terakhir

### 5. Detail Modal
Klik pada row programmer untuk melihat detail lengkap:
- Total Tasks breakdown
- Performance Metrics (dengan progress bar)
- Time Analysis
- List Projects yang dikerjakan

## API Endpoint

### GET `/api/kpi-programmer`

#### Query Parameters
- `period`: string (optional) - "day" | "week" | "month" | "year"
  - Default: "month"
- `pegawaiId`: number (optional) - Filter by specific programmer

#### Response Structure
```json
{
  "success": true,
  "data": [
    {
      "pegawaiId": 1,
      "pegawaiName": "John Doe",
      "totalTasks": 50,
      "completedTasks": 45,
      "inProgressTasks": 5,
      "onTimeTasks": 40,
      "overdueTasks": 5,
      "completionRate": 90,
      "onTimeRate": 89,
      "avgCompletionTime": 4.5,
      "productivity": 105,
      "totalEstimatedHours": 200,
      "totalActualHours": 190,
      "projectCount": 3,
      "projects": ["Project A", "Project B", "Project C"]
    }
  ],
  "overall": {
    "totalProgrammers": 10,
    "totalTasks": 500,
    "totalCompleted": 450,
    "totalInProgress": 50,
    "totalOnTime": 400,
    "totalOverdue": 50,
    "avgCompletionRate": 85,
    "avgOnTimeRate": 80,
    "avgProductivity": 95
  },
  "period": "month",
  "dateRange": {
    "start": "2026-04-08T00:00:00.000Z",
    "end": "2026-05-08T10:30:00.000Z"
  },
  "timestamp": "2026-05-08T10:30:00.000Z"
}
```

## Database Schema
Menggunakan data dari tabel yang sudah ada:
- `tasklist`: Data task dengan status, estimasi, dan waktu aktual
- `pegawai`: Data programmer
- `proyek`: Data project

### Fields yang Digunakan
```prisma
model Tasklist {
  id                    Int
  status                String        // SELESAI, IN_PROGRESS, dll
  estimatedManHour      Float?        // Estimasi jam kerja
  totalStartStopMinutes Int?          // Total waktu aktual (menit)
  targetDate            DateTime?     // Target deadline
  completionTime        DateTime?     // Waktu selesai
  createdAt             DateTime
  pegawaiId             Int?
  pegawai               Pegawai?
  project               Proyek?
}
```

## Color Coding

### Completion Rate
- 🟢 Green (≥80%): Excellent/Good performance
- 🟡 Yellow (60-79%): Average performance
- 🔴 Red (<60%): Need improvement

### On-Time Rate
- 🔵 Blue (≥80%): Excellent punctuality
- 🟡 Yellow (60-79%): Average punctuality
- 🔴 Red (<60%): Poor punctuality

### Productivity
- 🟢 Green (≥100%): Faster than estimated
- 🟡 Yellow (80-99%): Close to estimated
- 🔴 Red (<80%): Slower than estimated

## Testing

### Manual Test via Browser
1. Start development server: `npm run dev`
2. Login ke aplikasi
3. Navigate ke menu "KPI Programmer"
4. Test filter period
5. Click pada row untuk melihat detail

### API Test via Script
```bash
node test-kpi-programmer-api.js
```

Output akan menampilkan:
- Overall statistics
- Top 10 programmers
- Performance distribution
- Date range

## Performance Considerations

### Optimizations
1. **Query Optimization**: Single query dengan select minimal fields
2. **In-Memory Grouping**: Grouping dilakukan di aplikasi, bukan database
3. **Caching**: Bisa ditambahkan Redis cache untuk data yang sering diakses
4. **Pagination**: Untuk data programmer yang banyak (>100)

### Scalability
- Current: Cocok untuk 10-100 programmers
- Future: Tambahkan pagination dan server-side filtering untuk >100 programmers

## Future Enhancements

### Phase 2
1. **Export to Excel/PDF**: Download laporan KPI
2. **Trend Analysis**: Grafik performa dari waktu ke waktu
3. **Team Comparison**: Bandingkan performa antar team
4. **Target Setting**: Set target KPI per programmer
5. **Notification**: Alert jika KPI di bawah target
6. **Ranking System**: Leaderboard programmer terbaik

### Phase 3
1. **Predictive Analytics**: Prediksi performa berdasarkan historical data
2. **Skill-based KPI**: KPI berdasarkan skill/teknologi
3. **Project Complexity Factor**: Adjust KPI berdasarkan kompleksitas project
4. **Automated Reports**: Email laporan KPI mingguan/bulanan

## Integration Points

### Current
- ✅ Tasklist data
- ✅ Pegawai data
- ✅ Project data
- ✅ Time tracking data

### Future
- ⏳ GitHub commits/PR data
- ⏳ Code review metrics
- ⏳ Bug/issue resolution time
- ⏳ Code quality metrics

## Notes
- Data KPI dihitung real-time dari database
- Tidak ada tabel KPI terpisah (calculated on-the-fly)
- Semua metrik berbasis data tasklist yang sudah ada
- UI menggunakan Tailwind CSS tanpa library chart tambahan
- Responsive design untuk mobile dan desktop
