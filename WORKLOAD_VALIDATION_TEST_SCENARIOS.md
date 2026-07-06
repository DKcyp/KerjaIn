# Workload Validation Test Scenarios

## Test Date: 2026-05-29 (Thursday)

## Scenario 1: Task Assigned Thursday 10:00 AM for 8 Hours

### Expected Behavior (With Fallback Schedule)

**Hardcoded Schedule:**
- Monday-Friday: 08:00 AM - 04:00 PM (8 hours)
- Saturday: 07:30 AM - 10:30 AM (3 hours)
- Sunday: Day off

**Break Time:** Assume 12:00 PM - 01:00 PM (1 hour)

**Calculation:**

**Day 1 - Thursday 29/5/2026:**
- Start: 10:00 AM
- End of shift: 04:00 PM (16:00)
- Available: 10:00 AM - 12:00 PM = 2 hours
- Break: 12:00 PM - 01:00 PM (skipped)
- Available: 01:00 PM - 04:00 PM = 3 hours
- **Total Day 1: 5 hours worked**
- **Remaining: 3 hours**

**Day 2 - Friday 30/5/2026:**
- Start: 08:00 AM
- Available: 08:00 AM - 12:00 PM = 4 hours (but only need 3 hours)
- **Total Day 2: 3 hours worked**
- **End time: 11:00 AM Friday**

### Expected Result
```
Mulai: 29/5/2026 10:00
Selesai: 30/5/2026 11:00
⏱️ 8.0 jam
• 2 hari kerja
```

## Scenario 2: Task Assigned Friday 10:00 AM for 8 Hours

**Day 1 - Friday 30/5/2026:**
- Start: 10:00 AM
- Available: 10:00 AM - 12:00 PM = 2 hours
- Break: 12:00 PM - 01:00 PM (skipped)
- Available: 01:00 PM - 04:00 PM = 3 hours
- **Total Day 1: 5 hours worked**
- **Remaining: 3 hours**

**Day 2 - Saturday 31/5/2026:**
- Start: 07:30 AM
- End: 10:30 AM
- Available: 3 hours (no break on Saturday)
- **Total Day 2: 3 hours worked**
- **End time: 10:30 AM Saturday**

### Expected Result
```
Mulai: 30/5/2026 10:00
Selesai: 31/5/2026 10:30
⏱️ 8.0 jam
• 2 hari kerja
```

## Scenario 3: Task Assigned Friday 02:00 PM for 4 Hours

**Day 1 - Friday:**
- Start: 02:00 PM (14:00)
- Available: 02:00 PM - 04:00 PM = 2 hours
- **Total Day 1: 2 hours worked**
- **Remaining: 2 hours**

**Day 2 - Saturday:**
- Start: 07:30 AM
- Available: 07:30 AM - 09:30 AM = 2 hours
- **Total Day 2: 2 hours worked**
- **End time: 09:30 AM Saturday**

### Expected Result
```
Mulai: 30/5/2026 14:00
Selesai: 31/5/2026 09:30
⏱️ 4.0 jam
• 2 hari kerja
```

## Scenario 4: Task Assigned Saturday 08:00 AM for 8 Hours

**Day 1 - Saturday:**
- Start: 08:00 AM
- End: 10:30 AM
- Available: 2.5 hours
- **Total Day 1: 2.5 hours worked**
- **Remaining: 5.5 hours**

**Day 2 - Sunday:**
- Day off - skipped

**Day 3 - Monday:**
- Start: 08:00 AM
- Available: 08:00 AM - 12:00 PM = 4 hours
- Break: 12:00 PM - 01:00 PM (skipped)
- Available: 01:00 PM - 02:30 PM = 1.5 hours
- **Total Day 3: 5.5 hours worked**
- **End time: 02:30 PM Monday**

### Expected Result
```
Mulai: 31/5/2026 08:00
Selesai: 2/6/2026 14:30
⏱️ 8.0 jam
• 3 hari kerja (Saturday, skip Sunday, Monday)
```

## Current Issue

You reported seeing:
```
Mulai: 29/5/2026 10:00
Selesai: 29/5/2026 19:00  ❌ WRONG - Goes beyond 16:00 (4 PM)
⏱️ 8.0 jam
• 2 hari kerja
```

This suggests the calculation was:
- Not using the fallback schedule (08:00-16:00)
- Not accounting for break time
- Calculating as if working continuously until 19:00 (7 PM)

## Fix Applied

Updated `src/lib/smartScheduling.ts` to:
1. Use hardcoded fallback schedule when RichzSpot API fails
2. Properly account for break time from `master_break_time`
3. Stop at end of working hours (16:00 for weekdays)
4. Continue to next working day if needed

## How to Test

1. **Clear any cached schedules** (if applicable)
2. **Create a new task:**
   - Assign to a user
   - Start time: Today 10:00 AM
   - Duration: 8 hours
3. **Check the calculated deadline:**
   - Should be tomorrow ~11:00 AM (depending on break time)
   - Should NOT be today at 19:00 (7 PM)

## Debugging

If the issue persists, check the logs for:
```
📅 [SmartScheduling] Calculating schedule for user X
   Using fallback schedule for 2026-05-29: 08:00 - 16:00
   Break time: 12:00 - 13:00 (60 min)
   📅 Day 1 - 2026-05-29: shift 08:00-16:00, start 10:00, effective 10:00
      ✅ 10:00-12:00 (120m) | break | 13:00-16:00 (180m) | 180m left
   📅 Day 2 - 2026-05-30: shift 08:00-16:00, effective start 08:00
      ✅ 08:00-11:00 = 180m (0m break, 0m left)
✅ [SmartScheduling] Schedule calculated:
   End time: 2026-05-30T11:00:00.000Z
```

## Expected Workload Validation

When creating the task, you should also see:
```
🔍 Validating workload capacity...
   Available minutes in range: 960 (16.0 hours over 2 working days)
   Already scheduled: 0 minutes (0.0 hours)
   New total: 480 minutes (8.0 hours)
   Utilization: 50.0%
✅ Workload validation passed
```
