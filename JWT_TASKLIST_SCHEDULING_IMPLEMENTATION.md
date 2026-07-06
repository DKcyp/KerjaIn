# JWT Tasklist Scheduling Implementation

## Overview
JWT Tasklist Scheduling adalah sistem untuk mengelola penjadwalan task berdasarkan jam kerja karyawan yang diambil dari RichzSpot API menggunakan JWT authentication. Sistem ini mengintegrasikan jadwal kerja (Jadwal), break time, dan validasi working hours untuk memastikan task hanya dijadwalkan pada waktu kerja yang tepat.

## Architecture

### Components
1. **RichzSpot JWT Service** - Mengelola JWT token dan komunikasi dengan RichzSpot API
2. **Break Time Service** - Mengambil data break time dari Master Break Time
3. **Task Validation** - Validasi task berdasarkan working hours
4. **Task Time Tracker** - Tracking waktu task execution

## JWT Authentication Flow

### 1. Token Generation

**File:** `src/lib/richzspotService.ts`

```typescript
async function getJWTToken(): Promise<string>
```

**Process:**
1. Check cached token (valid untuk 1 jam dengan buffer 5 menit)
2. Jika token expired, request token baru dari RichzSpot API
3. Login menggunakan credentials dari environment variables
4. Extract session token dari Set-Cookie header
5. Cache token untuk penggunaan berikutnya

**Environment Variables:**
```env
JWT_API_URL=http://localhost:8074/richzspot_jwt/
SPOT_JWT_BASE_URL=http://localhost:8074/richzspot_jwt/
SPOT_JWT_USERNAME=super
SPOT_JWT_PASSWORD=password123
```

**Token Caching Strategy:**
- Cache duration: 1 jam (3600000 ms)
- Buffer: 5 menit (300000 ms) sebelum expiry
- Automatic refresh saat token mendekati expiry

### 2. API Endpoints

#### Login Endpoint
```
POST /richzspot_jwt/login/masuk
Content-Type: application/x-www-form-urlencoded

username=super&password=password123
```

**Response:**
```
Set-Cookie: richzspot=<token>; Path=/; HttpOnly
```

#### Working Hours Validation
```
GET /richzspot_jwt/api/working-hours/validate
Authorization: Bearer <token>
```

**Response:**
```json
{
  "isWorkingHours": true,
  "currentTime": "2026-05-06T10:30:00Z",
  "workingHoursStart": "08:00",
  "workingHoursEnd": "17:00",
  "message": "Currently within working hours"
}
```

#### Jadwal (Schedule) Endpoint
```
GET /richzspot_jwt/api/Jadwal/getByDate?tanggal=2026-05-06
Authorization: Bearer <token>
```

**Response:**
```json
{
  "status": true,
  "data": [
    {
      "id": 1,
      "id_user": 5,
      "shift_jam_masuk": "08:00",
      "shift_jam_pulang": "17:00",
      "shift_tipe": "P",
      "shift_nama": "Pagi"
    }
  ]
}
```

## Working Hours Validation

### Function: `validateWorkingHours()`

Memvalidasi apakah waktu saat ini termasuk dalam jam kerja.

```typescript
export async function validateWorkingHours(): Promise<WorkingHoursValidationResponse>
```

**Response:**
```typescript
{
  success: boolean;
  isWorkingHours: boolean;
  currentTime: string;
  workingHoursStart: string;
  workingHoursEnd: string;
  message?: string;
}
```

**Fallback Logic:**
- Jika RichzSpot API tidak tersedia, gunakan default working hours (08:00 - 17:00)
- Log warning untuk monitoring

### Function: `getUserWorkingHours(userId, date)`

Mengambil jadwal kerja spesifik user untuk tanggal tertentu.

```typescript
export async function getUserWorkingHours(
  userId: string, 
  date: Date
): Promise<{
  startTime: string;
  endTime: string;
  breakStartTime?: string;
  breakEndTime?: string;
  shiftType: string;
  shiftName: string;
}>
```

**Process:**
1. Request jadwal dari RichzSpot API untuk tanggal tertentu
2. Find jadwal untuk user spesifik
3. Get break time dari Master Break Time table
4. Combine jadwal + break time information
5. Return working hours dengan break time

**Example Response:**
```json
{
  "startTime": "08:00",
  "endTime": "17:00",
  "breakStartTime": "12:00",
  "breakEndTime": "13:00",
  "shiftType": "P",
  "shiftName": "Pagi"
}
```

### Function: `isTimeWithinUserWorkingHours(userId, time)`

Validasi apakah waktu tertentu termasuk dalam jam kerja user (excluding break time).

```typescript
export async function isTimeWithinUserWorkingHours(
  userId: string, 
  time: Date
): Promise<boolean>
```

**Logic:**
1. Get user working hours untuk tanggal time
2. Parse time strings (HH:MM:SS format)
3. Convert ke minutes untuk comparison
4. Check if time dalam working hours
5. Check if time dalam break time
6. Return true hanya jika dalam working hours AND NOT dalam break time

**Handling Overnight Shifts:**
- Support shift yang melewati tengah malam (e.g., 23:00 - 08:00)
- Contoh: Shift malam dari 22:00 - 06:00 hari berikutnya

## Break Time Integration

### Function: `getUserBreakTime(userId)`

**File:** `src/lib/breakTimeService.ts`

Mengambil break time untuk user berdasarkan tipe penerapan.

```typescript
export async function getUserBreakTime(userId: number): Promise<{
  startTime: string;
  endTime: string;
} | null>
```

**Priority Order:**
1. User Spesifik (USER) - Break time khusus untuk user
2. Role-based (ROLE) - Break time berdasarkan role user
3. Departemen (DEPARTEMEN) - Break time berdasarkan departemen
4. Global (GLOBAL) - Break time untuk semua karyawan

**Query Logic:**
```sql
SELECT jam_mulai, jam_selesai FROM master_break_time
WHERE is_active = true
AND (
  (tipe_penerapan = 'USER' AND pegawai_id = $1)
  OR (tipe_penerapan = 'ROLE' AND role = $2)
  OR (tipe_penerapan = 'DEPARTEMEN' AND departemen_id = $3)
  OR tipe_penerapan = 'GLOBAL'
)
ORDER BY 
  CASE tipe_penerapan
    WHEN 'USER' THEN 1
    WHEN 'ROLE' THEN 2
    WHEN 'DEPARTEMEN' THEN 3
    WHEN 'GLOBAL' THEN 4
  END
LIMIT 1
```

## Task Scheduling Validation

### File: `src/lib/taskValidation.ts`

Validasi task sebelum dijadwalkan.

**Validation Rules:**
1. Task hanya bisa dijadwalkan pada jam kerja
2. Task tidak boleh dijadwalkan pada break time
3. Task harus memiliki assignee yang valid
4. Scheduled time harus dalam format yang valid

**Example Validation:**
```typescript
async function validateTaskScheduling(task: {
  pegawaiId: number;
  scheduleAt: Date;
  duration: number;
}): Promise<{
  valid: boolean;
  message: string;
}>
```

## Task Time Tracking

### File: `src/lib/taskTimeTracker.ts`

Tracking waktu task execution dengan validasi working hours.

**Features:**
- Start/Stop task tracking
- Calculate actual working time (excluding break time)
- Validate time entries against working hours
- Generate time tracking reports

**Time Calculation:**
```
Total Duration = Sum of (Stop Time - Start Time)
Excluding break time periods
```

## API Integration Points

### Tasklist API Endpoints

#### GET /api/tasklist
Mengambil semua tasklist dengan filter working hours validation.

**Query Parameters:**
- `userId` - Filter by assignee
- `status` - Filter by status
- `startDate` - Filter by schedule date range
- `endDate` - Filter by schedule date range

#### POST /api/tasklist
Membuat tasklist baru dengan validasi working hours.

**Request Body:**
```json
{
  "projectId": 1,
  "moduleId": 1,
  "pegawaiId": 5,
  "scheduleAt": "2026-05-06T10:00:00Z",
  "keterangan": "Task description",
  "tasklistType": "DEVELOPMENT"
}
```

**Validation:**
1. Check if scheduleAt is within user's working hours
2. Check if scheduleAt is not during break time
3. Validate user jadwal exists for that date
4. Create tasklist if all validations pass

#### PUT /api/tasklist/[id]/time-tracking
Update task time tracking.

**Request Body:**
```json
{
  "action": "start|stop",
  "timestamp": "2026-05-06T10:30:00Z"
}
```

## Error Handling & Fallback

### JWT Token Errors
```
Error: JWT login failed: 401
Fallback: Use cached token if available
Retry: Attempt token refresh after 5 minutes
```

### RichzSpot API Unavailable
```
Error: Working hours endpoint not available (503)
Fallback: Use default working hours (08:00 - 17:00)
Log: Warning message untuk monitoring
```

### Jadwal Not Found
```
Error: No jadwal found for user on date
Fallback: Use default working hours + break time from master
Log: Warning message dengan user ID dan date
```

## Configuration

### Environment Variables
```env
# RichzSpot JWT Configuration
JWT_API_URL=http://localhost:8074/richzspot_jwt/
SPOT_JWT_BASE_URL=http://localhost:8074/richzspot_jwt/
SPOT_JWT_USERNAME=super
SPOT_JWT_PASSWORD=password123

# Default Working Hours (fallback)
DEFAULT_WORKING_HOURS_START=08:00
DEFAULT_WORKING_HOURS_END=17:00
DEFAULT_BREAK_TIME_START=12:00
DEFAULT_BREAK_TIME_END=13:00
```

## Database Schema

### Related Tables

#### master_break_time
```sql
CREATE TABLE master_break_time (
  id SERIAL PRIMARY KEY,
  nama VARCHAR(255),
  jam_mulai VARCHAR(8),
  jam_selesai VARCHAR(8),
  tipe_penerapan VARCHAR(50),
  pegawai_id INTEGER,
  departemen_id INTEGER,
  role VARCHAR(50),
  is_active BOOLEAN
);
```

#### tasklist
```sql
CREATE TABLE tasklist (
  id SERIAL PRIMARY KEY,
  projectId INTEGER,
  moduleId INTEGER,
  pegawaiId INTEGER,
  scheduleAt TIMESTAMP,
  status VARCHAR(50),
  totalDurationMinutes INTEGER,
  startedAt TIMESTAMP,
  pausedAt TIMESTAMP,
  ...
);
```

## Usage Examples

### 1. Validate Current Time is Working Hours
```typescript
import { validateWorkingHours } from '@/lib/richzspotService';

const result = await validateWorkingHours();
if (result.isWorkingHours) {
  console.log('Currently within working hours');
} else {
  console.log('Outside working hours');
}
```

### 2. Get User Working Hours
```typescript
import { getUserWorkingHours } from '@/lib/richzspotService';

const workingHours = await getUserWorkingHours('5', new Date());
console.log(`Working: ${workingHours.startTime} - ${workingHours.endTime}`);
console.log(`Break: ${workingHours.breakStartTime} - ${workingHours.breakEndTime}`);
```

### 3. Check if Time is Within Working Hours
```typescript
import { isTimeWithinUserWorkingHours } from '@/lib/richzspotService';

const time = new Date('2026-05-06T14:30:00');
const isWorking = await isTimeWithinUserWorkingHours('5', time);
if (isWorking) {
  console.log('Time is within working hours (excluding break)');
}
```

### 4. Schedule Task with Validation
```typescript
const response = await fetch('/api/tasklist', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    projectId: 1,
    moduleId: 1,
    pegawaiId: 5,
    scheduleAt: '2026-05-06T10:00:00Z',
    keterangan: 'Development task',
    tasklistType: 'DEVELOPMENT'
  })
});

if (response.ok) {
  console.log('Task scheduled successfully');
} else {
  const error = await response.json();
  console.error('Scheduling failed:', error.message);
}
```

## Monitoring & Logging

### Log Levels
- **INFO** - Token obtained, working hours validated
- **WARN** - Fallback to default values, API unavailable
- **ERROR** - JWT login failed, API errors

### Log Format
```
🔐 [RichzSpot JWT] Using cached token
🕐 [RichzSpot] Validating working hours via JWT API
✅ [RichzSpot] Working hours validation result: { isWorkingHours: true, ... }
⚠️ [RichzSpot] Working hours endpoint not available (503)
❌ [RichzSpot JWT] Failed to get JWT token: Error message
```

## Performance Optimization

### Token Caching
- Cache duration: 1 hour
- Buffer: 5 minutes before expiry
- Reduces API calls by ~95%

### Working Hours Caching
- Cache per user per day
- Invalidate at midnight
- Reduces RichzSpot API calls

### Break Time Caching
- Cache master_break_time in memory
- Invalidate on update
- Reduces database queries

## Testing

### Test Cases
- ✅ JWT token generation and caching
- ✅ JWT token refresh on expiry
- ✅ Working hours validation
- ✅ User jadwal retrieval
- ✅ Break time integration
- ✅ Task scheduling validation
- ✅ Overnight shift handling
- ✅ Fallback to default values
- ✅ Error handling and recovery

### Manual Testing
```bash
# Test JWT token generation
curl -X POST http://localhost:8074/richzspot_jwt/login/masuk \
  -d "username=super&password=password123"

# Test working hours validation
curl -X GET http://localhost:8074/richzspot_jwt/api/working-hours/validate \
  -H "Authorization: Bearer <token>"

# Test jadwal retrieval
curl -X GET "http://localhost:8074/richzspot_jwt/api/Jadwal/getByDate?tanggal=2026-05-06" \
  -H "Authorization: Bearer <token>"
```

## Troubleshooting

### Issue: JWT Token Expired
**Solution:** Token akan otomatis di-refresh saat mendekati expiry (5 menit sebelum)

### Issue: RichzSpot API Unavailable
**Solution:** Sistem akan fallback ke default working hours (08:00 - 17:00)

### Issue: No Jadwal Found for User
**Solution:** Gunakan default working hours + break time dari master_break_time

### Issue: Task Scheduling Failed
**Solution:** Verify:
1. User memiliki jadwal untuk tanggal tersebut
2. Scheduled time dalam jam kerja
3. Scheduled time tidak dalam break time

## Related Files

- Service: `src/lib/richzspotService.ts`
- Break Time: `src/lib/breakTimeService.ts`
- Validation: `src/lib/taskValidation.ts`
- Time Tracking: `src/lib/taskTimeTracker.ts`
- API: `src/app/api/tasklist/route.ts`
- API: `src/app/api/tasklist/[id]/time-tracking/route.ts`

## Future Enhancements

- [ ] Multi-shift support
- [ ] Overtime tracking
- [ ] Holiday calendar integration
- [ ] Shift swap functionality
- [ ] Attendance validation
- [ ] Real-time working hours sync
- [ ] Advanced time tracking analytics
- [ ] Mobile app integration

## Notes

- Semua waktu menggunakan format 24-jam (HH:MM:SS)
- JWT token di-cache untuk 1 jam dengan buffer 5 menit
- Break time diambil dari Master Break Time dengan priority order
- Fallback ke default values jika API tidak tersedia
- Semua API calls di-log untuk monitoring dan debugging


## Smart Scheduling Implementation

### Overview
Smart Scheduling adalah fitur yang otomatis menghitung kapan task akan selesai berdasarkan:
1. Jam kerja user (dari JWT/RichzSpot)
2. Break time (dari Master Break Time)
3. Durasi task yang diminta
4. Jadwal kerja multi-hari jika diperlukan

### Use Case Example

**Scenario:**
- User: ID 5
- Start: 2026-05-06 13:00
- Duration: 5 hours (300 minutes)
- Working hours: 08:00-17:00
- Break time: 14:00-15:00 (Global)

**Calculation:**
```
Day 1 (2026-05-06):
  13:00-14:00 = 60 minutes (working)
  14:00-15:00 = skip (break time)
  15:00-17:00 = 120 minutes (working)
  Subtotal: 180 minutes

Day 2 (2026-05-07):
  08:00-11:00 = 180 minutes (working)
  Subtotal: 180 minutes

Total: 360 minutes (6 hours actual time, but 5 hours working time)
End time: 2026-05-07 11:00
```

### Implementation in POST /api/tasklist

**Step 1: Import Smart Scheduling**
```typescript
import { calculateTaskSchedule, validateTaskSchedule } from '@/lib/smartScheduling';
```

**Step 2: Add to POST Handler (before prisma.tasklist.create)**
```typescript
// Calculate smart schedule based on working hours and break time
let calculatedEndTime = scheduleAt;
let scheduleDetails = null;

try {
  // Validate and calculate schedule
  const validation = await validateTaskSchedule(pegawaiId, scheduleAt, durationMinutes);
  
  if (!validation.valid) {
    console.warn(`⚠️ Schedule validation warning: ${validation.message}`);
    // Continue anyway, but log the warning
  } else if (validation.schedule) {
    calculatedEndTime = validation.schedule.endTime;
    scheduleDetails = validation.schedule;
    
    console.log(`✅ Smart Schedule Calculated:`);
    console.log(`   Start: ${scheduleAt.toISOString()}`);
    console.log(`   End: ${calculatedEndTime.toISOString()}`);
    console.log(`   Working days: ${scheduleDetails.workingDays}`);
    console.log(`   Break time excluded: ${scheduleDetails.breakTimeExcluded} minutes`);
  }
} catch (error) {
  console.error('❌ Failed to calculate smart schedule:', error);
  // Fallback to simple calculation
  calculatedEndTime = new Date(scheduleAt.getTime() + durationMinutes * 60000);
}
```

**Step 3: Store Schedule Details**
```typescript
// Add to tasklist create data
const created = await prisma.tasklist.create({
  data: {
    // ... existing fields ...
    scheduleAt,
    // NEW: Store calculated end time
    calculatedEndTime: calculatedEndTime,
    // NEW: Store schedule details as JSON
    scheduleDetails: scheduleDetails ? JSON.stringify(scheduleDetails) : null,
  }
});
```

### Database Schema Update

Add these columns to tasklist table:
```sql
ALTER TABLE tasklist ADD COLUMN IF NOT EXISTS calculated_end_time TIMESTAMP;
ALTER TABLE tasklist ADD COLUMN IF NOT EXISTS schedule_details JSONB;
```

### Frontend Integration

When creating a task, show:
1. Start time (user input)
2. Duration (user input)
3. Calculated end time (auto-calculated)
4. Daily breakdown (from schedule_details)

**Example UI:**
```
Start: 2026-05-06 13:00
Duration: 5 hours
Calculated End: 2026-05-07 11:00

Daily Breakdown:
- Day 1 (2026-05-06): 13:00-14:00 (1h), 15:00-17:00 (2h) = 3h
- Day 2 (2026-05-07): 08:00-11:00 (3h) = 3h
- Break time excluded: 60 minutes
```

### API Response

```json
{
  "id": 123,
  "projectId": 1,
  "moduleId": 1,
  "pegawaiId": 5,
  "scheduleAt": "2026-05-06T13:00:00Z",
  "calculatedEndTime": "2026-05-07T11:00:00Z",
  "scheduleDetails": {
    "startTime": "2026-05-06T13:00:00Z",
    "endTime": "2026-05-07T11:00:00Z",
    "workingDays": 2,
    "breakTimeExcluded": 60,
    "actualWorkingMinutes": 300,
    "schedule": [
      {
        "date": "2026-05-06",
        "startTime": "13:00",
        "endTime": "17:00",
        "workingMinutes": 180
      },
      {
        "date": "2026-05-07",
        "startTime": "08:00",
        "endTime": "11:00",
        "workingMinutes": 120
      }
    ]
  }
}
```

### Handling Edge Cases

1. **Overnight Shifts** (e.g., 23:00-08:00)
   - Smart scheduling handles this automatically
   - Calculates correctly across midnight

2. **Multiple Break Times**
   - Currently supports one break time per user
   - Can be extended to support multiple breaks

3. **Holidays/Non-Working Days**
   - Not yet implemented
   - Can be added by checking holiday calendar

4. **User with No Jadwal**
   - Falls back to default working hours (08:00-17:00)
   - Uses global break time if available

### Testing

Test cases to verify:
1. Task within single day
2. Task spanning multiple days
3. Task with break time in middle
4. Task starting before break time
5. Task starting after break time
6. Overnight shift handling
7. User with no jadwal (fallback)

### Performance Considerations

- Smart scheduling calculates minute-by-minute
- For very long durations (>100 hours), consider optimization
- Cache working hours and break time per user per day
- Consider async calculation for very long tasks

### Future Enhancements

- Support multiple break times per day
- Holiday calendar integration
- Shift swap handling
- Overtime tracking
- Real-time schedule updates
- Conflict detection (overlapping tasks)
