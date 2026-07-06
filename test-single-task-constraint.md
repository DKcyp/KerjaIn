# Test Plan: Single Task Constraint

## Overview
This document outlines how to test the new single task constraint feature that prevents users from starting multiple tasks simultaneously.

## Test Scenarios

### Scenario 1: Normal Task Start (Should Work)
1. **Setup**: User has no active tasks
2. **Action**: Start a task with status `MENUNGGU_PROSES_USER`
3. **Expected**: Task starts successfully, status changes to `SEDANG_DIPROSES_USER`

### Scenario 2: Multiple Task Start Prevention (Should Block)
1. **Setup**: User already has one active task running
2. **Action**: Try to start another task with status `MENUNGGU_PROSES_USER`
3. **Expected**: 
   - Request fails with error message
   - Toast notification appears: "You already have an active task running: [TASK_CODE]. Please stop or complete it before starting a new task."
   - Second task remains in `MENUNGGU_PROSES_USER` status

### Scenario 3: Resume Paused Task (Should Work)
1. **Setup**: User has a paused task (`SEDANG_DIPROSES_USER_PAUSED`)
2. **Action**: Resume the paused task
3. **Expected**: Task resumes successfully (no active task check for resumes)

### Scenario 4: Start After Stop (Should Work)
1. **Setup**: User stops their active task
2. **Action**: Start a different task
3. **Expected**: New task starts successfully

## Testing Steps

### Manual Testing
1. **Login** to the application
2. **Navigate** to the tasklist page
3. **Find two tasks** assigned to you with `MENUNGGU_PROSES_USER` status
4. **Start the first task** - should work normally
5. **Try to start the second task** - should show error notification
6. **Stop the first task** 
7. **Start the second task** - should work now

### API Testing
```bash
# 1. Start first task
curl -X POST "http://localhost:3000/api/tasklist/[TASK_ID_1]/time-tracking" \
  -H "Content-Type: application/json" \
  -H "Cookie: [YOUR_SESSION_COOKIE]" \
  -d '{"action": "start"}'

# 2. Try to start second task (should fail)
curl -X POST "http://localhost:3000/api/tasklist/[TASK_ID_2]/time-tracking" \
  -H "Content-Type: application/json" \
  -H "Cookie: [YOUR_SESSION_COOKIE]" \
  -d '{"action": "start"}'

# Expected response for step 2:
# {
#   "error": "ACTIVE_TASK_EXISTS:You already have an active task running: \"PRJ-001-1\". Please stop or complete it before starting a new task."
# }
```

## Implementation Details

### Backend Changes
- **File**: `src/lib/taskTimeTracker.ts`
- **Function**: `startTask()`
- **Logic**: 
  - Only checks for active tasks when starting new tasks (`MENUNGGU_PROSES_USER`)
  - Allows resuming paused tasks without checking
  - Returns specific error format: `ACTIVE_TASK_EXISTS:[message]`

### Frontend Changes
- **File**: `src/hooks/useTaskTimeTracking.ts`
- **Enhancement**: 
  - Detects `ACTIVE_TASK_EXISTS:` error prefix
  - Shows toast notification with user-friendly message
  - Displays error for 8 seconds

### Database Queries
- Uses existing `getActiveTasks(userId)` function
- Checks for tasks with status `SEDANG_DIPROSES_USER` and `isPaused: false`

## Success Criteria
✅ Only one task can be active per user at any time  
✅ Clear error message when trying to start multiple tasks  
✅ Toast notification appears with task details  
✅ Resuming paused tasks works without restriction  
✅ No impact on existing functionality  
✅ Error handling is graceful and user-friendly  

## Edge Cases Covered
- User tries to start task while another is active
- User resumes paused task (should work)
- User starts task after stopping previous one
- Database errors during active task check
- Missing task codes in error messages
