# Working Hours System Documentation

## Overview

The Working Hours System calculates task due dates based on actual business working hours instead of simple calendar time. This ensures that task deadlines are realistic and respect business hours, weekends, and lunch breaks.

## Working Hours Configuration

### Business Hours
- **Monday-Friday**: 8:00 AM - 4:00 PM (8 hours total)
  - **Lunch Break**: 12:00 PM - 1:00 PM (1 hour)
  - **Effective Working Hours**: 7 hours per day
- **Saturday**: 8:00 AM - 12:00 PM (4 working hours)
- **Sunday**: Holiday (0 working hours)

### Key Features
- ✅ Respects business hours and lunch breaks
- ✅ Handles weekend transitions automatically
- ✅ Accounts for Saturday half-day work
- ✅ Sunday is treated as holiday
- ✅ Lunch break (12-1 PM) is excluded from working time

## Implementation

### Core Files
- `src/lib/workingHoursCalculator.ts` - Main working hours calculation logic
- `src/lib/taskDueDateCalculator.ts` - Task due date calculation using working hours
- `src/app/api/tasklist/route.ts` - Task creation with working hours due dates

### Key Functions

#### `addWorkingHours(startDate, hoursToAdd)`
Adds working hours to a start date, respecting business hours.

```typescript
const startDate = new Date('2024-10-11T15:00:00'); // Friday 3 PM
const dueDate = addWorkingHours(startDate, 2); // Add 2 working hours
// Result: Monday 9:00 AM
```

#### `isWithinWorkingHours(date)`
Checks if a specific time is within working hours.

```typescript
isWithinWorkingHours(new Date('2024-10-14T09:00:00')); // Monday 9 AM → true
isWithinWorkingHours(new Date('2024-10-14T12:30:00')); // Monday 12:30 PM → false (lunch)
isWithinWorkingHours(new Date('2024-10-13T10:00:00')); // Sunday 10 AM → false (holiday)
```

#### `getNextWorkingHourStart(date)`
Gets the next working hour start time from a given date.

```typescript
const sunday = new Date('2024-10-13T10:00:00'); // Sunday 10 AM
const nextWorking = getNextWorkingHourStart(sunday);
// Result: Monday 8:00 AM
```

## Example Scenarios

### Scenario 1: Easy Task (2 hours) - Friday 3 PM
- **Start**: Friday 3:00 PM
- **Calculation**: 
  - Friday 3-4 PM = 1 hour remaining
  - Saturday 8-9 AM = 1 hour needed
- **Result**: Saturday 9:00 AM ✅

### Scenario 2: Easy Task (2 hours) - Friday 11 AM
- **Start**: Friday 11:00 AM
- **Calculation**:
  - Friday 11 AM-12 PM = 1 hour
  - Friday 12-1 PM = Lunch break (skip)
  - Friday 1-2 PM = 1 hour
- **Result**: Friday 2:00 PM ✅

### Scenario 3: Easy Task (2 hours) - Saturday 10 AM
- **Start**: Saturday 10:00 AM
- **Calculation**:
  - Saturday 10 AM-12 PM = 2 hours
- **Result**: Saturday 12:00 PM ✅

### Scenario 4: Easy Task (2 hours) - Saturday 11 AM
- **Start**: Saturday 11:00 AM
- **Calculation**:
  - Saturday 11 AM-12 PM = 1 hour
  - Saturday work ends, move to Monday
  - Monday 8-9 AM = 1 hour needed
- **Result**: Monday 9:00 AM ✅

### Scenario 5: Easy Task (2 hours) - Sunday 10 AM
- **Start**: Sunday 10:00 AM (Holiday)
- **Calculation**:
  - Sunday is holiday, move to Monday 8 AM
  - Monday 8-10 AM = 2 hours
- **Result**: Monday 10:00 AM ✅

## Task Complexity Integration

The system integrates with the Task Complexity system to automatically calculate due dates:

### Default Task Complexities
- **EASY**: 2 hours → Due within same/next working day
- **MEDIUM**: 8 hours → Due within 1-2 working days
- **HARD**: 24 hours → Due within 3-4 working days

### Automatic Due Date Calculation
When creating a task, the system:
1. Gets task complexity hours from database
2. Applies working hours calculation to scheduled date
3. Sets `calculatedDueDate` field automatically
4. Displays realistic due dates in task lists

## API Integration

### Task Creation
```typescript
// POST /api/tasklist
{
  "scheduleAt": "2024-10-11T15:00:00", // Friday 3 PM
  "taskComplexity": "EASY" // 2 hours
}

// Automatically calculates:
// calculatedDueDate: "2024-10-14T09:00:00" // Monday 9 AM
```

### Bulk Update Existing Tasks
```javascript
// Update all tasks without calculated due dates
const updatedCount = await updateAllTaskDueDates();
```

## User Experience Benefits

### Before (Simple Calendar Time)
- Task scheduled Friday 3 PM + 2 hours = Friday 5 PM ❌
- Unrealistic deadline (after work hours)
- No consideration of weekends or lunch breaks

### After (Working Hours)
- Task scheduled Friday 3 PM + 2 hours = Monday 9 AM ✅
- Realistic deadline within business hours
- Respects weekends, lunch breaks, and business hours

## Testing

Run the test script to verify calculations:
```bash
node test-working-hours.js
```

The test validates all scenarios including:
- Weekend transitions
- Lunch break handling
- Saturday half-day work
- Sunday holiday handling
- Multi-day task calculations

## Configuration

The working hours can be customized in `workingHoursCalculator.ts`:

```typescript
const DEFAULT_CONFIG = {
  weekdayStart: 8,      // 8 AM
  weekdayEnd: 16,       // 4 PM
  weekdayLunchStart: 12, // 12 PM
  weekdayLunchEnd: 13,   // 1 PM
  saturdayStart: 8,     // 8 AM
  saturdayEnd: 12,      // 12 PM
  sundayIsHoliday: true
};
```

## Database Impact

### New Fields
- `calculatedDueDate` - Stores working hours-based due date
- Existing SLA fields continue to work alongside

### Migration
- Existing tasks can be bulk-updated with new due dates
- No data loss - old dates preserved
- Gradual rollout possible

## Performance

- ✅ Efficient calculation algorithms
- ✅ No external dependencies
- ✅ Cached results in database
- ✅ Minimal API impact
- ✅ Works with existing infrastructure

## Future Enhancements

Potential improvements:
- Holiday calendar integration
- Flexible lunch break times
- Department-specific working hours
- Time zone support
- Custom work schedules per user

## Summary

The Working Hours System provides realistic task due date calculations that respect business hours, making project planning more accurate and achievable. The system integrates seamlessly with existing task management while providing immediate benefits to users through more realistic deadlines.

**Key Achievement**: Easy task (2h) scheduled Friday 3 PM now correctly shows due date as Saturday 9 AM, properly utilizing Saturday working hours (8 AM-12 PM) and matching real-world business expectations.
