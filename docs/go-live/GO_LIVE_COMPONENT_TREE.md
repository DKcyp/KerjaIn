# Go-Live Command Center - Component Tree

## 🌳 Component Hierarchy

```
GoLiveCommandCenter (Main Component)
│
├── State Management
│   ├── project (GoLiveProject | null)
│   ├── timeRemaining (string)
│   ├── expandedPhases (Set<TaskPhase>)
│   ├── newComment (string)
│   └── activityLogRef (useRef)
│
├── Effects
│   ├── useEffect: Load project data
│   ├── useEffect: Update countdown timer (1s interval)
│   └── useEffect: Auto-scroll activity log
│
└── Render Tree
    │
    ├── [1] Main Container (min-h-screen bg-gray-900)
    │   │
    │   ├── [1.1] Main Header / Status Bar
    │   │   │
    │   │   ├── [1.1.1] Project Info Section
    │   │   │   ├── Project Title (h1)
    │   │   │   └── Scheduled Time (p)
    │   │   │
    │   │   ├── [1.1.2] Countdown Timer Card
    │   │   │   ├── Label: "TIME TO GO-LIVE"
    │   │   │   └── Timer Display (HH:MM:SS)
    │   │   │
    │   │   └── [1.1.3] Overall Status Badge
    │   │       └── Status Text (ON_SCHEDULE/DELAYED/DONE)
    │   │
    │   └── [1.2] Main Content Grid (3 columns on desktop)
    │       │
    │       ├── [1.2.1] Left Column (2/3 width)
    │       │   │
    │       │   ├── [1.2.1.1] Go-Live Checklist Card
    │       │   │   │
    │       │   │   ├── Card Header
    │       │   │   │   └── Title: "Go-Live Checklist"
    │       │   │   │
    │       │   │   └── Card Body (scrollable)
    │       │   │       │
    │       │   │       ├── Phase: PRE_GOLIVE
    │       │   │       │   ├── Phase Header (collapsible)
    │       │   │       │   │   ├── Phase Label
    │       │   │       │   │   ├── Progress Counter
    │       │   │       │   │   └── Chevron Icon
    │       │   │       │   │
    │       │   │       │   └── Task List (conditional render)
    │       │   │       │       └── Task Item (repeated)
    │       │   │       │           ├── Status Icon
    │       │   │       │           ├── Task Info
    │       │   │       │           │   ├── Description
    │       │   │       │           │   ├── PIC Avatar + Name
    │       │   │       │           │   └── Completion Time
    │       │   │       │           └── Status Dropdown
    │       │   │       │
    │       │   │       ├── Phase: DURING_GOLIVE
    │       │   │       │   └── (Same structure as PRE_GOLIVE)
    │       │   │       │
    │       │   │       └── Phase: POST_GOLIVE
    │       │   │           └── (Same structure as PRE_GOLIVE)
    │       │   │
    │       │   └── [1.2.1.2] Bottom Cards Grid (2 columns)
    │       │       │
    │       │       ├── [1.2.1.2.1] Key Contacts Card
    │       │       │   ├── Card Header
    │       │       │   │   └── Title: "Key Contacts"
    │       │       │   │
    │       │       │   └── Card Body
    │       │       │       └── Contact Item (repeated)
    │       │       │           ├── Avatar Circle
    │       │       │           ├── Contact Info
    │       │       │           │   ├── Name
    │       │       │           │   └── Role
    │       │       │           └── Status Indicator
    │       │       │
    │       │       └── [1.2.1.2.2] Emergency Actions Card
    │       │           ├── Card Header
    │       │           │   └── Title: "Emergency Actions"
    │       │           │
    │       │           └── Card Body
    │       │               ├── Rollback Button
    │       │               │   ├── Warning Icon
    │       │               │   └── Button Text
    │       │               └── Description Text
    │       │
    │       └── [1.2.2] Right Column (1/3 width)
    │           │
    │           └── [1.2.2.1] Activity Log Card
    │               │
    │               ├── Card Header
    │               │   └── Title: "Activity Log"
    │               │
    │               ├── Log Feed (scrollable, ref attached)
    │               │   └── Log Entry (repeated)
    │               │       ├── User Avatar
    │               │       └── Entry Content
    │               │           ├── User Name + Timestamp
    │               │           └── Message Text
    │               │
    │               └── Comment Input Section
    │                   ├── Text Input
    │                   └── Send Button
    │
    └── [Loading State]
        └── Centered Loading Message
```

---

## 🔄 Data Flow

```
User Interaction
    ↓
Event Handler
    ↓
State Update (setProject)
    ↓
Component Re-render
    ↓
UI Update
    ↓
Activity Log Update (if applicable)
    ↓
Auto-scroll to Latest Entry
```

### Example: Task Status Change

```
1. User selects new status from dropdown
   ↓
2. handleTaskStatusChange(taskId, newStatus) called
   ↓
3. Update task in checklist array
   ↓
4. Create new activity log entry
   ↓
5. Update project state with both changes
   ↓
6. Component re-renders with new data
   ↓
7. Activity log auto-scrolls to show new entry
```

---

## 📦 Component Props & State

### Main Component State

```typescript
// Project data
const [project, setProject] = useState<GoLiveProject | null>(null);

// Countdown timer
const [timeRemaining, setTimeRemaining] = useState<string>('');

// Phase expansion state
const [expandedPhases, setExpandedPhases] = useState<Set<TaskPhase>>(
  new Set(['PRE_GOLIVE', 'DURING_GOLIVE', 'POST_GOLIVE'])
);

// Comment input
const [newComment, setNewComment] = useState('');

// Activity log scroll reference
const activityLogRef = useRef<HTMLDivElement>(null);
```

### Derived State

```typescript
// Tasks grouped by phase
const tasksByPhase = {
  PRE_GOLIVE: project.checklist.filter(t => t.phase === 'PRE_GOLIVE'),
  DURING_GOLIVE: project.checklist.filter(t => t.phase === 'DURING_GOLIVE'),
  POST_GOLIVE: project.checklist.filter(t => t.phase === 'POST_GOLIVE'),
};
```

---

## 🎨 Styling Architecture

### Tailwind Class Patterns

```
Container Pattern:
├── bg-gray-{shade}          (Background color)
├── border border-gray-{shade} (Border)
├── rounded-lg               (Border radius)
├── shadow-{size}            (Shadow)
└── p-{size}                 (Padding)

Text Pattern:
├── text-{size}              (Font size)
├── font-{weight}            (Font weight)
├── text-{color}             (Text color)
└── tracking-{spacing}       (Letter spacing)

Interactive Pattern:
├── hover:bg-{color}         (Hover state)
├── transition-{property}    (Transition)
├── cursor-pointer           (Cursor)
└── focus:ring-{size}        (Focus ring)
```

### Color Mapping by Component

```
Main Header:
├── Background: bg-gray-800
├── Border: border-gray-700
└── Text: text-white

Countdown Timer:
├── Background: bg-gray-950
├── Border: border-gray-700
└── Text: text-blue-400

Status Badge:
├── ON_SCHEDULE: bg-green-500
├── DELAYED: bg-orange-500
└── DONE: bg-blue-500

Checklist Card:
├── Background: bg-gray-800
├── Border: border-gray-700
├── Phase Header: bg-gray-750
└── Task Row: hover:bg-gray-750

Activity Log:
├── Background: bg-gray-800
├── Border: border-gray-700
├── Auto Log: bg-gray-800
└── Manual Comment: bg-gray-750

Key Contacts:
├── Background: bg-gray-800
├── Border: border-gray-700
├── Avatar: bg-blue-600
└── Status Dot: bg-green-500 / bg-gray-500

Rollback Button:
├── Background: bg-red-600
├── Hover: hover:bg-red-700
└── Text: text-white
```

---

## 🔧 Function Reference

### Event Handlers

```typescript
// Task status change
handleTaskStatusChange(taskId: number, newStatus: TaskStatus): void

// Add manual comment
handleAddComment(): void

// Toggle phase expansion
togglePhase(phase: TaskPhase): void
```

### Utility Functions

```typescript
// Get status badge color
getStatusColor(status: GoLiveStatus): string

// Get task status icon
getTaskStatusIcon(status: TaskStatus): JSX.Element

// Get status label
getStatusLabel(status: TaskStatus): string

// Get phase label
getPhaseLabel(phase: TaskPhase): string

// Format time
formatTime(isoString: string): string

// Format scheduled time
formatScheduledTime(isoString: string): string
```

---

## 📊 Component Metrics

### Complexity Analysis

```
Main Component:
├── Lines of Code: 596
├── State Variables: 4
├── Effects: 3
├── Event Handlers: 3
├── Utility Functions: 6
└── Render Sections: 5

Nesting Depth:
├── Maximum: 6 levels
├── Average: 3 levels
└── Recommended: < 7 levels ✓

Component Size:
├── Current: 596 lines
├── Recommended: < 500 lines (consider splitting)
└── Status: Acceptable for single-page dashboard
```

### Potential Refactoring

```
Extractable Components:
├── TaskItem (task row with status)
├── PhaseSection (collapsible phase group)
├── ActivityLogEntry (single log entry)
├── ContactCard (single contact item)
└── CountdownTimer (timer display)

Benefits:
├── Reduced main component size
├── Improved reusability
├── Easier testing
└── Better maintainability
```

---

## 🔄 Lifecycle Flow

```
Component Mount
    ↓
Load Project Data (useEffect)
    ↓
Start Countdown Timer (useEffect + setInterval)
    ↓
Render Initial UI
    ↓
[User Interactions]
    ↓
State Updates
    ↓
Re-render Affected Sections
    ↓
Auto-scroll Activity Log (useEffect)
    ↓
Component Unmount
    ↓
Cleanup Timer (clearInterval)
```

---

## 🎯 Optimization Opportunities

### Current Implementation
- ✅ Efficient state management
- ✅ Proper useEffect dependencies
- ✅ Ref for scroll management
- ✅ Conditional rendering

### Future Optimizations
- ⏳ React.memo for task items
- ⏳ useCallback for event handlers
- ⏳ useMemo for derived state
- ⏳ Virtual scrolling for large lists
- ⏳ Debounced scroll events

---

## 📱 Responsive Behavior

### Desktop (≥1024px)
```
Grid Layout:
├── Checklist: 2 columns (66%)
├── Activity Log: 1 column (33%)
└── Bottom Cards: 2 columns (50% each)
```

### Tablet (768px - 1023px)
```
Stacked Layout:
├── Checklist: Full width
├── Bottom Cards: 2 columns (50% each)
└── Activity Log: Full width
```

### Mobile (<768px)
```
Single Column:
├── Header: Stacked elements
├── Checklist: Full width
├── Contacts: Full width
├── Rollback: Full width
└── Activity Log: Full width (reduced height)
```

---

## 🧩 Integration Points

### Backend API Endpoints (Future)

```
GET    /api/go-live/:projectId          (Load project)
PATCH  /api/go-live/tasks/:taskId       (Update task status)
POST   /api/go-live/:projectId/comments (Add comment)
GET    /api/go-live/:projectId/logs     (Get activity log)
```

### WebSocket Events (Future)

```
TASK_UPDATE     → Update task status
NEW_LOG         → Add log entry
STATUS_CHANGE   → Update overall status
USER_JOINED     → Show user online
USER_LEFT       → Show user offline
```

---

## 📝 Type Definitions

```typescript
// Main types
type GoLiveStatus = 'ON_SCHEDULE' | 'DELAYED' | 'DONE'
type TaskStatus = 'PENDING' | 'IN_PROGRESS' | 'DONE' | 'FAILED'
type TaskPhase = 'PRE_GOLIVE' | 'DURING_GOLIVE' | 'POST_GOLIVE'

// Interfaces
interface GoLiveProject { ... }
interface ChecklistTask { ... }
interface ActivityLog { ... }
interface KeyContact { ... }
```

---

## 🎨 Visual Component Map

```
┌─────────────────────────────────────────────┐
│ [1.1] HEADER                                │ ← Main Header
│  Project | Countdown | Status               │
└─────────────────────────────────────────────┘
┌──────────────────────────┬──────────────────┐
│ [1.2.1] LEFT COLUMN      │ [1.2.2] RIGHT    │
│                          │                  │
│ ┌──────────────────────┐ │ ┌──────────────┐ │
│ │ [1.2.1.1] CHECKLIST  │ │ │ [1.2.2.1]    │ │
│ │                      │ │ │ ACTIVITY LOG │ │
│ │ • Pra Go-Live        │ │ │              │ │
│ │ • Saat Go-Live       │ │ │ [Log Feed]   │ │
│ │ • Pasca Go-Live      │ │ │              │ │
│ └──────────────────────┘ │ │ [Comment]    │ │
│                          │ └──────────────┘ │
│ ┌──────────┬───────────┐ │                  │
│ │[1.2.1.2.1]│[1.2.1.2.2]│ │                  │
│ │ CONTACTS │ ROLLBACK  │ │                  │
│ └──────────┴───────────┘ │                  │
└──────────────────────────┴──────────────────┘
```

---

## 🔍 Component Responsibilities

### Main Component (GoLiveCommandCenter)
- **Responsibility**: Orchestrate entire dashboard
- **Concerns**: State management, data flow, layout
- **Size**: Large (596 lines) - acceptable for single-page app

### Potential Sub-Components (Future)

#### TaskItem
- **Responsibility**: Render single task
- **Props**: task, onStatusChange
- **Size**: ~50 lines

#### PhaseSection
- **Responsibility**: Render collapsible phase
- **Props**: phase, tasks, expanded, onToggle
- **Size**: ~80 lines

#### ActivityLogEntry
- **Responsibility**: Render single log entry
- **Props**: log
- **Size**: ~30 lines

#### ContactCard
- **Responsibility**: Render single contact
- **Props**: contact
- **Size**: ~20 lines

---

## 📚 Summary

This component tree provides a complete architectural overview of the Go-Live Command Center, including:

- ✅ Component hierarchy and nesting
- ✅ State management structure
- ✅ Data flow patterns
- ✅ Styling architecture
- ✅ Function reference
- ✅ Optimization opportunities
- ✅ Integration points
- ✅ Type definitions

Use this document as a reference for understanding the codebase structure and planning future enhancements.

---

**Document Version**: 1.0.0  
**Last Updated**: October 1, 2025  
**Related Files**: `page.tsx`, `GO_LIVE_COMMAND_CENTER_README.md`
