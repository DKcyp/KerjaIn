# Programmer Action Working Hours Validation

## Overview
Implementasi validasi jam kerja untuk action execution programmer (start, submit, resume, pause, stop, complete, approve, reject, disposition). Programmer dan PM tidak boleh melakukan action execution di luar jam kerja mereka.

**PENTING**: Validasi jam kerja HANYA untuk action execution. Action administratif (edit, delete, dll) tetap bisa dilakukan anytime oleh PM/SUPER_ADMIN tanpa validasi.

## Fitur Utama

### 1. Validasi Jam Kerja Real-time
- Menggunakan RichzSpot API endpoint `/api/hours-meter-auto/user` (NO AUTH REQUIRED)
- Mengambil jadwal kerja berdasarkan username/user ID
- Mendeteksi hari libur (shift_jam_masuk dan shift_jam_pulang = NULL)
- Mempertimbangkan break time dari master_break_time table

### 2. Action yang Divalidasi

#### Programmer Actions - EXECUTION (Time Tracking) ✅ VALIDATED
- **start**: Memulai task
- **pause**: Pause task
- **resume**: Melanjutkan task
- **stop**: Menghentikan task
- **complete**: Menyelesaikan task

#### Programmer Actions - EXECUTION (Status Change) ✅ VALIDATED
- **submit**: Mengirim task untuk review (SEDANG_DIPROSES_USER → MENUNGGU_REVIEW_PM)

#### PM/Admin Actions - EXECUTION ✅ VALIDATED
- **approve**: Approve task (MENUNGGU_REVIEW_PM → SELESAI)
- **reject**: Reject task (MENUNGGU_REVIEW_PM → MENUNGGU_PROSES_USER)

#### PM/Admin Actions - ADMINISTRATIVE ❌ NOT VALIDATED (Anytime)
- **edit**: Edit task details (schedule, duration, assignee, dll)
- **delete**: Delete task
- **create**: Create new task
- **disposition**: Disposisi task ke programmer lain (action administratif)
- Semua action administratif lainnya

## Implementasi

### Helper Function: `validateProgrammerActionTime()`

**File**: `src/lib/taskValidation.ts`

```typescript
export async function validateProgrammerActionTime(
  userId: string,
  action: string
): Promise<{
  isAllowed: boolean;
  message: string;
  workingHours?: {
    start: string;
    end: string;
    current: string;
    breakStart?: string;
    breakEnd?: string;
  };
}>
```

**Fitur**:
- Mengambil jadwal kerja user dari RichzSpot API
- Mengecek apakah waktu sekarang dalam jam kerja
- Mempertimbangkan break time
- Mengembalikan pesan error yang user-friendly dalam Bahasa Indonesia
- Fallback ke default working hours (08:00-17:00) jika API gagal

**Contoh Response**:

```json
{
  "isAllowed": false,
  "message": "Tidak dapat memulai task di luar jam kerja. Jam kerja: 09:00 - 17:00 (istirahat: 12:00 - 13:00). Waktu sekarang: 18:30:45",
  "workingHours": {
    "start": "09:00",
    "end": "17:00",
    "current": "18:30:45",
    "breakStart": "12:00",
    "breakEnd": "13:00"
  }
}
```

### Endpoint Updates

#### 1. Time Tracking Actions
**File**: `src/app/api/tasklist/[id]/time-tracking/route.ts`

```typescript
case 'start':
  const workingHoursCheck = await validateCurrentUserWorkingHours(userId.toString());
  if (!workingHoursCheck.isWorkingHours) {
    return NextResponse.json({
      error: 'OUTSIDE_WORKING_HOURS',
      message: `Tidak dapat memulai task di luar jam kerja. ${workingHoursCheck.message}`,
      workingHours: { ... }
    }, { status: 400 });
  }
  // ... continue with start task

case 'pause':
  const pauseValidation = await validateProgrammerActionTime(userId.toString(), 'pause');
  if (!pauseValidation.isAllowed) {
    return NextResponse.json({
      error: 'OUTSIDE_WORKING_HOURS',
      message: pauseValidation.message,
      workingHours: pauseValidation.workingHours
    }, { status: 400 });
  }
  // ... continue with pause task
```

#### 2. Status Change Actions (Submit)
**File**: `src/app/api/tasklist/[id]/route.ts`

```typescript
// Submit (SEDANG_DIPROSES_USER → MENUNGGU_REVIEW_PM)
if (prev === 'SEDANG_DIPROSES_USER' && nextSt === 'MENUNGGU_REVIEW_PM') {
  const submitValidation = await validateProgrammerActionTime(session.id.toString(), 'submit');
  if (!submitValidation.isAllowed) {
    return NextResponse.json({
      error: 'OUTSIDE_WORKING_HOURS',
      message: submitValidation.message,
      workingHours: submitValidation.workingHours
    }, { status: 400 });
  }
}
```

#### 3. Approve/Reject Actions
**File**: `src/app/api/tasklist/[id]/approve/route.ts` dan `src/app/api/tasklist/[id]/reject/route.ts`

```typescript
const workingHoursValidation = await validateProgrammerActionTime(session.id.toString(), 'approve');
if (!workingHoursValidation.isAllowed) {
  return NextResponse.json({
    error: 'OUTSIDE_WORKING_HOURS',
    message: workingHoursValidation.message,
    workingHours: workingHoursValidation.workingHours
  }, { status: 400 });
}
```

#### 4. Disposition Action
**File**: `src/app/api/tasklist/[id]/disposition/route.ts`

```typescript
const dispositionValidation = await validateProgrammerActionTime(disposedBy.toString(), 'disposition');
if (!dispositionValidation.isAllowed) {
  return NextResponse.json({
    success: false,
    error: 'OUTSIDE_WORKING_HOURS',
    message: dispositionValidation.message,
    workingHours: dispositionValidation.workingHours
  }, { status: 400 });
}
```

## Error Response Format

Semua endpoint mengembalikan error dengan format yang konsisten:

```json
{
  "error": "OUTSIDE_WORKING_HOURS",
  "message": "Tidak dapat [action] di luar jam kerja. Jam kerja: HH:MM - HH:MM (istirahat: HH:MM - HH:MM). Waktu sekarang: HH:MM:SS",
  "workingHours": {
    "start": "HH:MM",
    "end": "HH:MM",
    "current": "HH:MM:SS",
    "breakStart": "HH:MM",
    "breakEnd": "HH:MM"
  }
}
```

Status Code: **400 Bad Request**

## Frontend Integration

### Handling Error Response

```typescript
try {
  const response = await fetch('/api/tasklist/123/time-tracking', {
    method: 'POST',
    body: JSON.stringify({ action: 'start' })
  });

  if (!response.ok) {
    const error = await response.json();
    
    if (error.error === 'OUTSIDE_WORKING_HOURS') {
      // Show user-friendly error message
      showError(error.message);
      
      // Optionally show working hours info
      console.log('Working hours:', error.workingHours);
    }
  }
} catch (err) {
  console.error('Error:', err);
}
```

### UI Feedback

Tampilkan pesan error yang jelas kepada user:

```
❌ Tidak dapat memulai task di luar jam kerja. 
Jam kerja: 09:00 - 17:00 (istirahat: 12:00 - 13:00). 
Waktu sekarang: 18:30:45
```

## Fallback Behavior

Jika RichzSpot API tidak tersedia:
- Menggunakan default working hours: **08:00 - 17:00**
- Break time default: **12:00 - 13:00**
- Validasi tetap berjalan dengan fallback values

## Logging

Setiap validasi dicatat di console dengan format:

```
✅ [Working Hours] Task start allowed - within working hours
⏰ [Working Hours] Task start blocked - outside working hours
   Current time: 2026-05-12T18:30:45.000Z
   Working hours: 09:00 - 17:00
```

## Testing

### Test Cases

1. **Action di dalam jam kerja** → Allowed ✅
2. **Action di luar jam kerja** → Blocked ❌
3. **Action saat break time** → Blocked ❌
4. **Action di hari libur** → Blocked ❌
5. **API gagal** → Fallback ke default working hours

### Manual Testing

```bash
# Test start task (should fail if outside working hours)
curl -X POST http://localhost:3002/api/tasklist/123/time-tracking \
  -H "Content-Type: application/json" \
  -d '{"action":"start"}'

# Response jika di luar jam kerja:
{
  "error": "OUTSIDE_WORKING_HOURS",
  "message": "Tidak dapat memulai task di luar jam kerja...",
  "workingHours": {...}
}
```

## Configuration

### Environment Variables

```env
# RichzSpot API Configuration
RICHZSPOT_BE_URL=http://localhost:8074
```

### Database

Tidak ada perubahan database yang diperlukan. Validasi menggunakan:
- `pegawai.username` - untuk query RichzSpot API
- `master_break_time` - untuk break time info

## Performance Considerations

1. **Caching**: RichzSpot API response di-cache di `richzspotService.ts`
2. **Timeout**: API call memiliki timeout default
3. **Fallback**: Jika API lambat, fallback ke default working hours

## Troubleshooting

### Issue: "Tidak dapat memulai task di luar jam kerja" padahal masih jam kerja

**Solusi**:
1. Cek timezone server vs client
2. Cek jadwal di RichzSpot API: `GET /api/hours-meter-auto/user?username=xxx&tanggal=YYYY-MM-DD`
3. Cek master_break_time configuration
4. Cek logs untuk error dari RichzSpot API

### Issue: Validasi tidak berjalan

**Solusi**:
1. Cek apakah `validateProgrammerActionTime` di-import dengan benar
2. Cek apakah endpoint memanggil validasi sebelum action
3. Cek logs untuk error dari RichzSpot API

## Future Enhancements

1. **Flexible Working Hours**: Support untuk shift yang berbeda per user
2. **Overtime Handling**: Allow action di luar jam kerja dengan approval
3. **Holiday Calendar**: Integration dengan holiday calendar
4. **Timezone Support**: Support untuk multiple timezones
5. **Audit Trail**: Detailed logging untuk semua action attempts

## Related Files

- `src/lib/taskValidation.ts` - Helper functions
- `src/lib/richzspotService.ts` - RichzSpot API integration
- `src/lib/breakTimeService.ts` - Break time management
- `src/app/api/tasklist/[id]/time-tracking/route.ts` - Time tracking actions
- `src/app/api/tasklist/[id]/route.ts` - Status change actions
- `src/app/api/tasklist/[id]/approve/route.ts` - Approve action
- `src/app/api/tasklist/[id]/reject/route.ts` - Reject action
- `src/app/api/tasklist/[id]/disposition/route.ts` - Disposition action

## Version History

- **v1.0.0** (2026-05-12): Initial implementation
  - Added working hours validation for all programmer actions
  - Added working hours validation for PM approve/reject
  - Added working hours validation for disposition
  - Integrated with RichzSpot API for real-time schedule checking
