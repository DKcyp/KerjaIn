# Task Time Tracking System

A comprehensive time tracking system for tasks that allows users to start, pause, resume, and stop tasks while accurately tracking the total time spent.

## Features

### ⏱️ **Time Tracking Capabilities**
- **Start Task**: Begin working on a task and start the timer
- **Pause Task**: Temporarily pause work while preserving accumulated time
- **Resume Task**: Continue working from where you left off
- **Stop Task**: Complete the task and send for review with final time logged

### 📊 **Duration Tracking**
- **Total Duration**: Cumulative time spent across all work sessions
- **Current Session**: Time spent in the current active session
- **Real-time Updates**: Live timer updates while task is active
- **Persistent Storage**: Time data survives browser refreshes and sessions

### 🔄 **Status Management**
- **MENUNGGU_PROSES_USER**: Task waiting to be started
- **SEDANG_DIPROSES_USER**: Task actively being worked on
- **SEDANG_DIPROSES_USER_PAUSED**: Task paused but can be resumed
- **MENUNGGU_REVIEW_PM**: Task completed and sent for review

## Database Schema

### New Fields Added to `tasklist` Table

```sql
-- Time tracking fields
started_at              TIMESTAMP NULL     -- When task was last started/resumed
paused_at               TIMESTAMP NULL     -- When task was paused
total_duration_minutes  INTEGER DEFAULT 0  -- Total time spent in minutes
is_paused               BOOLEAN DEFAULT FALSE -- Whether task is currently paused
```

### New Task Status
- `SEDANG_DIPROSES_USER_PAUSED` - Task is paused and can be resumed

## API Endpoints

### Time Tracking Operations
```
POST /api/tasklist/[id]/time-tracking
```

**Request Body:**
```json
{
  "action": "start" | "pause" | "resume" | "stop"
}
```

**Response:**
```json
{
  "success": true,
  "action": "start",
  "timeInfo": {
    "id": 123,
    "status": "SEDANG_DIPROSES_USER",
    "startedAt": "2024-10-09T14:30:00.000Z",
    "pausedAt": null,
    "totalDurationMinutes": 45,
    "isPaused": false,
    "isActive": true,
    "currentSessionMinutes": 0
  }
}
```

### Get Time Information
```
GET /api/tasklist/[id]/time-tracking
```

**Response:**
```json
{
  "id": 123,
  "status": "SEDANG_DIPROSES_USER",
  "startedAt": "2024-10-09T14:30:00.000Z",
  "pausedAt": null,
  "totalDurationMinutes": 45,
  "isPaused": false,
  "isActive": true,
  "currentSessionMinutes": 15
}
```

### Get Active Tasks
```
GET /api/tasklist/active?userId=123
```

**Response:**
```json
{
  "activeTasks": [...],
  "count": 2,
  "userId": 123
}
```

## Frontend Integration

### React Hook Usage

```tsx
import { useTaskTimeTracking } from '@/hooks/useTaskTimeTracking';

function TaskComponent({ taskId }) {
  const {
    timeInfo,
    loading,
    error,
    startTask,
    pauseTask,
    resumeTask,
    stopTask,
    formatDuration,
    getTotalDuration
  } = useTaskTimeTracking(taskId);

  return (
    <div>
      <p>Total Time: {formatDuration(getTotalDuration())}</p>
      <button onClick={startTask}>Start</button>
      <button onClick={pauseTask}>Pause</button>
      <button onClick={resumeTask}>Resume</button>
      <button onClick={stopTask}>Complete</button>
    </div>
  );
}
```

### Time Tracker Component

```tsx
import TaskTimeTracker from '@/components/tasklist/TaskTimeTracker';

<TaskTimeTracker
  taskId={task.id}
  currentStatus={task.status}
  isAssignedToCurrentUser={task.pegawaiId === currentUser.id}
  onStatusChange={() => refreshTaskList()}
  compact={true} // For table view
/>
```

## Business Logic

### Time Calculation
- **Session Duration**: Calculated as `current_time - started_at`
- **Total Duration**: Sum of all previous sessions + current session
- **Pause Handling**: When paused, current session time is added to total duration

### Permission Rules
- Only the assigned user can start/pause/resume/stop their tasks
- PM/Admin can view time tracking information for all tasks
- Regular users can only see their own task time tracking

### Status Flow
```
MENUNGGU_PROSES_USER
    ↓ (start)
SEDANG_DIPROSES_USER
    ↓ (pause)
SEDANG_DIPROSES_USER_PAUSED
    ↓ (resume)
SEDANG_DIPROSES_USER
    ↓ (stop)
MENUNGGU_REVIEW_PM
```

## Setup Instructions

### 1. Database Migration
```bash
# Run the SQL migration
psql -d your_database -f prisma/migrations/add_task_time_tracking.sql
```

### 2. Regenerate Prisma Client
```bash
npx prisma generate
```

### 3. Run Setup Script
```bash
node scripts/setup-time-tracking.js
```

## Usage Examples

### Starting a Task
```bash
curl -X POST /api/tasklist/123/time-tracking \
  -H "Content-Type: application/json" \
  -d '{"action": "start"}'
```

### Pausing a Task
```bash
curl -X POST /api/tasklist/123/time-tracking \
  -H "Content-Type: application/json" \
  -d '{"action": "pause"}'
```

### Getting Time Info
```bash
curl /api/tasklist/123/time-tracking
```

## UI Components

### Compact View (Table)
- Shows total time and current session time
- Small action buttons (Start/Pause/Resume/Complete)
- Real-time updates

### Full View (Detail Modal)
- Complete time tracking information
- Large action buttons with descriptions
- Session history and timestamps
- Error handling and loading states

## Features

### ✅ **Implemented**
- Database schema with time tracking fields
- API endpoints for all time tracking operations
- React hooks for frontend integration
- Time tracking component with compact and full views
- Real-time session duration updates
- Persistent time storage across sessions
- Permission-based access control
- Activity logging for audit trail

### 🔄 **Status Integration**
- New PAUSED status added to TaskStatus enum
- Status code mapping updated (code 5 = PAUSED)
- Frontend status badges updated
- Status flow validation

### 📊 **Time Display**
- Human-readable duration formatting (e.g., "2h 30m")
- Real-time current session updates
- Total accumulated time display
- Visual indicators for active tasks

## Security & Permissions

- **User Validation**: Only assigned users can control their tasks
- **Session Management**: Proper authentication required
- **Audit Trail**: All time tracking actions are logged
- **Data Integrity**: Prevents invalid status transitions

## Performance Considerations

- **Efficient Queries**: Indexed time tracking fields
- **Real-time Updates**: Client-side timer updates to reduce server load
- **Batch Operations**: Optimized for multiple task operations
- **Caching**: Time info cached on client side with periodic updates

This system provides comprehensive time tracking capabilities while maintaining data integrity and user experience.
