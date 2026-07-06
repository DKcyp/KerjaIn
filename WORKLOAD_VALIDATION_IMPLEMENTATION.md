# Workload Validation Implementation

## Overview
Added workload capacity validation when creating tasklists to ensure users are not overloaded with tasks beyond their available working hours.

## Implementation Date
2026-05-29

## Changes Made

### 1. New Service: `src/lib/workloadValidation.ts`
Created a comprehensive workload validation service that:

- **Validates available capacity** before assigning new tasks
- **Uses RichzSpot API** for working hours with hardcoded fallback
- **Respects break times** from `master_break_time` table
- **Checks existing workload** by querying active tasks

#### Hardcoded Fallback Schedule
When RichzSpot API is unavailable, the system uses:
- **Monday-Friday**: 08:00 AM - 04:00 PM (8 hours)
- **Saturday**: 07:30 AM - 10:30 AM (3 hours)
- **Sunday**: Day off

#### Break Time Integration
- Fetches break time from `master_break_time` table via `getUserBreakTime()`
- Automatically subtracts break duration from available working hours
- Supports user-specific, department, role-based, and global break times

### 2. Updated: `src/app/api/tasklist/route.ts`
Integrated workload validation into the POST endpoint (lines 1122-1144):

```typescript
// Validate workload capacity before creating task
const workloadValidation = await validateWorkload(
  pegawaiId,
  scheduleAt,
  durationMinutes,
  100 // 100% capacity threshold
);

if (!workloadValidation.valid) {
  return NextResponse.json({
    error: 'WORKLOAD_EXCEEDED',
    message: workloadValidation.message,
    details: workloadValidation.details
  }, { status: 400 });
}
```

## How It Works

### Validation Flow
1. **Calculate available hours**: Get working schedule for date range (RichzSpot API → fallback)
2. **Get break time**: Fetch from `master_break_time` table
3. **Calculate net available hours**: Working hours - break time
4. **Query existing tasks**: Find active tasks in the same date range
5. **Calculate scheduled hours**: Sum duration of existing tasks
6. **Validate capacity**: Check if new task + existing tasks ≤ capacity threshold
7. **Return result**: Allow or reject task creation

### Example Scenario
**User assigned Friday 10:00 AM for 8-hour task:**

1. Friday 10:00 AM - 04:00 PM = 6 hours (minus 1-hour break = 5 hours)
2. Remaining 3 hours → Saturday 07:30 AM - 10:30 AM = 3 hours
3. **Final deadline**: Saturday 10:30 AM

### Capacity Threshold
- Default: **100%** (can be adjusted)
- Configurable per validation call
- Prevents overloading users beyond their working capacity

## API Response

### Success Response
```json
{
  "item": { /* created task */ },
  "uploadedFiles": [ /* files */ ]
}
```

### Validation Failure Response (400)
```json
{
  "error": "WORKLOAD_EXCEEDED",
  "message": "User sudah memiliki 16.0 jam task. Menambahkan 8.0 jam akan melebihi kapasitas 100% (20.0 jam). Kelebihan: 4.0 jam.",
  "details": {
    "existingTaskCodes": ["01.02 - 1", "01.03 - 2"],
    "totalScheduledHours": 16.0,
    "newTaskHours": 8.0,
    "availableHours": 20.0,
    "capacityThreshold": 20.0,
    "utilizationPercentage": 120.0
  }
}
```

## Benefits

1. **Prevents overload**: Users won't be assigned more work than they can handle
2. **Realistic scheduling**: Accounts for actual working hours and break times
3. **Transparent feedback**: Clear error messages show why task can't be assigned
4. **Graceful degradation**: Falls back to hardcoded schedule if API fails
5. **Non-blocking errors**: Validation errors don't crash the system

## Configuration

### Adjust Capacity Threshold
In `src/app/api/tasklist/route.ts` line 1128:
```typescript
const workloadValidation = await validateWorkload(
  pegawaiId,
  scheduleAt,
  durationMinutes,
  80 // Change to 80% for more conservative validation
);
```

### Modify Fallback Schedule
In `src/lib/workloadValidation.ts` function `getFallbackSchedule()`:
```typescript
function getFallbackSchedule(date: Date): { startTime: string; endTime: string } | null {
  const dayOfWeek = date.getDay();
  
  if (dayOfWeek === 0) {
    return null; // Sunday off
  } else if (dayOfWeek === 6) {
    return { startTime: '07:30', endTime: '10:30' }; // Saturday
  } else {
    return { startTime: '08:00', endTime: '16:00' }; // Monday-Friday
  }
}
```

## Testing Recommendations

1. **Test with RichzSpot API available**: Verify it uses real schedules
2. **Test with API unavailable**: Verify fallback schedule works
3. **Test break time integration**: Verify break time is subtracted correctly
4. **Test capacity threshold**: Try assigning tasks that exceed capacity
5. **Test edge cases**: 
   - Tasks spanning multiple days
   - Tasks starting on Friday ending on Monday
   - Tasks during holidays
   - Users with no existing tasks

## Future Enhancements

1. **Configurable capacity threshold per user/role**
2. **Visual workload calendar in UI**
3. **Workload rebalancing suggestions**
4. **Priority-based task scheduling**
5. **Team capacity planning dashboard**

## Related Files
- `src/lib/workloadValidation.ts` - Main validation service
- `src/lib/breakTimeService.ts` - Break time fetching
- `src/lib/smartScheduling.ts` - Smart scheduling with JWT
- `src/lib/richzspotService.ts` - RichzSpot API integration
- `src/app/api/tasklist/route.ts` - Task creation endpoint
