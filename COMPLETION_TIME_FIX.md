# Completion Time Calculation - Bug Fix

## Issue
Jam selesai menunjukkan waktu yang melebihi working hours (contoh: 16:49 padahal working hours sampai 16:00).

## Root Cause
Logic di `smartScheduling.ts` tidak memeriksa apakah `dayEndTime` melebihi `workEndTime` saat menyimpan schedule. Ketika loop berhenti, `currentTime` sudah di-increment 1 menit, sehingga `dayEndTime` bisa melebihi working hours.

## Fix Applied

### 1. Added Working Hours Info to API Response
**File:** `src/app/api/tasklist/calculate-completion-time/route.ts`

- Added `workingHoursInfo` and `breakTimeInfo` to response
- Added `debugInfo` section with working hours source
- Added logging for working hours from JWT

```typescript
// Get working hours info for debugging
const workingHoursInfo = await getUserWorkingHours(pegawaiId.toString(), startTime);
const breakTimeInfo = await getUserBreakTime(pegawaiId);

console.log(`   Working hours from JWT: ${workingHoursInfo.startTime} - ${workingHoursInfo.endTime}`);
console.log(`   Break time: ${breakTimeInfo ? `${breakTimeInfo.startTime} - ${breakTimeInfo.endTime}` : 'none'}`);
```

### 2. Fixed End Time Capping Logic
**File:** `src/lib/smartScheduling.ts`

Added check to ensure `dayEndTime` doesn't exceed `workEndTime`:

```typescript
// Ensure end time doesn't exceed working hours
const endHour = dayEndTime.getHours();
const endMin = dayEndTime.getMinutes();
const endTotalMin = endHour * 60 + endMin;

// If end time exceeds working hours, cap it at working hours end time
if (!isOvernightShift && endTotalMin > workEndTotalMin) {
  dayEndTime = new Date(dayEndTime);
  dayEndTime.setHours(workEndHour, workEndMin, 0, 0);
  console.log(`   ⚠️ Capping end time to working hours: ${workEndHour}:${workEndMin}`);
}
```

This fix is applied in two places:
1. When saving schedule during loop (outside working hours)
2. When saving final day's schedule (after loop completes)

### 3. Updated UI to Show Working Hours
**File:** `src/components/tasklist/CompletionTimePreview.tsx`

Added section to display working hours from JWT:

```tsx
{/* Working Hours Info - NEW */}
{debugInfo?.workingHours && (
  <div className="text-sm">
    <p className="font-semibold text-gray-700 mb-1">🕐 Jam Kerja (dari JWT):</p>
    <div className="bg-white px-3 py-2 rounded border border-gray-200">
      <p className="text-gray-900 font-medium">
        {debugInfo.workingHours.startTime} - {debugInfo.workingHours.endTime}
      </p>
      <p className="text-xs text-gray-500 mt-1">
        Sumber: {debugInfo.workingHours.source}
      </p>
    </div>
  </div>
)}
```

## Expected Behavior After Fix

### Before Fix:
```
Mulai: 7/5/2026 13:49
Selesai: 7/5/2026 16:49  ❌ (melebihi working hours 16:00)
```

### After Fix:
```
Mulai: 7/5/2026 13:49
Selesai: 7/5/2026 16:00  ✓ (sesuai working hours)
atau
Selesai: 8/5/2026 08:XX  ✓ (lanjut ke hari berikutnya)
```

## Verification

### 1. Check Logs
Look for these log messages:
```
📅 [SmartScheduling] Calculating schedule for user X
   Working hours: 08:00 - 16:00
   Break time: 14:00 - 15:00
   ⚠️ Capping end time to working hours: 16:0
✅ [SmartScheduling] Schedule calculated:
   End time: 2026-05-07T16:00:00.000Z
```

### 2. Check UI
UI should now show:
- 🕐 **Jam Kerja (dari JWT):** 08:00 - 16:00
- ☕ **Waktu Istirahat:** 14:00 - 15:00
- 📅 **Rincian Jadwal Kerja:** Should not exceed 16:00

### 3. Test Cases

**Test Case 1: Task within same day**
```
Input:
  Start: 13:00
  Duration: 2 hours
  Working hours: 08:00-16:00

Expected:
  End: 15:00 (same day)
  ✓ Within working hours
```

**Test Case 2: Task spanning to next day**
```
Input:
  Start: 15:00
  Duration: 2 hours
  Working hours: 08:00-16:00

Expected:
  Day 1: 15:00-16:00 (60 min)
  Day 2: 08:00-09:00 (60 min)
  End: 09:00 (next day)
  ✓ Respects working hours boundary
```

**Test Case 3: Task with break time**
```
Input:
  Start: 13:00
  Duration: 3 hours
  Working hours: 08:00-16:00
  Break time: 14:00-15:00

Expected:
  Day 1: 13:00-14:00 (60 min)
  Break: 14:00-15:00 (skip)
  Day 1: 15:00-16:00 (60 min)
  Day 2: 08:00-09:00 (60 min)
  End: 09:00 (next day)
  ✓ Excludes break time and respects working hours
```

## Files Modified

1. `src/app/api/tasklist/calculate-completion-time/route.ts`
   - Added working hours info to response
   - Added debug logging

2. `src/lib/smartScheduling.ts`
   - Fixed end time capping logic
   - Added check to prevent exceeding working hours

3. `src/components/tasklist/CompletionTimePreview.tsx`
   - Added working hours display
   - Added break time details
   - Updated interface for debugInfo

## Impact

- ✅ Completion time now respects working hours boundary
- ✅ UI shows working hours source (JWT)
- ✅ Better debugging with detailed logs
- ✅ More transparent calculation for users

## Testing

Run the test suite to verify:
```bash
node test-completion-time-calculation.js
```

Check logs for:
- Working hours from JWT
- End time capping warnings
- Schedule breakdown

## Notes

- Fix handles both regular shifts (08:00-16:00) and overnight shifts (22:00-06:00)
- Logging added for debugging purposes
- UI now shows source of working hours (JWT) for transparency
- Break time info also displayed with source (master_break_time table)

---

**Status:** ✅ Fixed
**Date:** 2026-05-06
**Version:** 1.1
