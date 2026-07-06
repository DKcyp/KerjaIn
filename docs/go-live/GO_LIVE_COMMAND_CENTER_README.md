# Go-Live Command Center - Design Documentation

## Overview

The **Go-Live Command Center** is a mission control-style dashboard designed for managing and monitoring real-time project deployment processes. This UI/UX implementation provides clarity, confidence, and control during critical go-live windows.

## Access

Navigate to: `/go-live/[projectId]` (e.g., `/go-live/1`)

Or use the sidebar menu: **Go-Live Command Center**

---

## Design Philosophy

### Theme: Mission Control
- **Aesthetic**: Clean, data-dense, professional interface
- **Color Scheme**: Dark theme with high contrast for readability
- **Layout**: Single-page dashboard - all critical information visible without scrolling

### Color Palette
- **Dark Background**: `bg-gray-900` (primary), `bg-gray-800` (cards)
- **Success/Done**: Green (`bg-green-500`)
- **In Progress/Warning**: Orange (`border-orange-500`)
- **Critical/Failed**: Red (`bg-red-500`, `bg-red-600`)
- **Info/Interactive**: Blue (`bg-blue-500`, `bg-blue-600`)
- **Neutral**: Gray scale for borders and text

---

## Key Components

### 1. Main Header / Status Bar

**Location**: Top of the page

**Features**:
- **Project Title**: Large, bold display (e.g., "Go-Live: Project Alpha")
- **Scheduled Time**: Shows planned deployment date/time in WIB timezone
- **Live Countdown Timer**: Real-time countdown to go-live moment
  - Format: `HH:MM:SS`
  - Updates every second
  - Displayed in monospace font with blue accent
- **Overall Status Indicator**: Large, color-coded badge
  - `ON SCHEDULE` - Green background
  - `DELAYED` - Orange background
  - `DONE` - Blue background

**Visual Priority**: Highest - immediately visible and attention-grabbing

---

### 2. Go-Live Checklist

**Location**: Left column (2/3 width on desktop)

**Features**:
- **Grouped Sections**: Collapsible phases
  - **Pra Go-Live** (Pre-Go-Live)
  - **Saat Go-Live** (During Go-Live)
  - **Pasca Go-Live** (Post-Go-Live)
  
- **Phase Headers**: 
  - Shows completion progress (e.g., "4 / 5")
  - Expandable/collapsible with chevron icon
  - Hover effects for interactivity

- **Task Items**: Each task displays:
  - **Status Icon**:
    - Empty circle: Pending
    - Spinning circle: In Progress
    - Green checkmark: Done
    - Red X: Failed
  - **Task Description**: Clear, actionable text
  - **PIC (Person in Charge)**: Avatar badge + name
  - **Completion Timestamp**: Shows when task was completed
  - **Status Dropdown**: Interactive select to change task status

**Interaction**:
- Click phase header to expand/collapse
- Change task status via dropdown
- Completed tasks show strikethrough text and gray color
- Status changes automatically log to Activity Log

---

### 3. Activity Log

**Location**: Right column (1/3 width on desktop)

**Features**:
- **Real-time Feed**: Chronological list of all actions
- **Auto-scroll**: Automatically scrolls to latest entry
- **Log Entry Types**:
  - **Automatic Logs**: System-generated (task status changes)
  - **Manual Comments**: User-added notes
  
- **Entry Display**:
  - User avatar (initials)
  - Username
  - Timestamp (HH:MM:SS WIB)
  - Message content
  - Visual differentiation (manual comments have darker background)

- **Comment Input**:
  - Text input field at bottom
  - Send button with paper plane icon
  - Press Enter to submit
  - Placeholder: "Tambahkan komentar..."

**Use Cases**:
- Track deployment progress
- Document issues or observations
- Communicate with team members
- Create audit trail

---

### 4. Key Contacts Card

**Location**: Bottom left, below checklist

**Features**:
- **Contact List**: Shows critical team members
  - Name
  - Role (e.g., "Release Manager", "Lead DevOps")
  - Avatar with initials
  - Online/Offline status indicator (green/gray dot)

**Purpose**: Quick reference for who to contact during deployment

---

### 5. Emergency Actions / Rollback Plan

**Location**: Bottom left, next to Key Contacts

**Features**:
- **Prominent Red Button**: "Rencana Rollback"
- **Warning Icon**: Triangle with exclamation mark
- **Description**: "Akses prosedur rollback darurat"

**Design Intent**: 
- High visibility for emergency situations
- Red color indicates critical action
- One-click access to rollback procedures

---

## Responsive Design

### Desktop (lg and above)
- 3-column grid layout
- Checklist: 2 columns
- Activity Log: 1 column (fixed height)
- All components visible simultaneously

### Tablet (md)
- Stacked layout
- Key Contacts and Rollback Plan side-by-side
- Activity Log full width
- Reduced padding

### Mobile (sm)
- Single column layout
- Countdown timer and status badge stack vertically
- Checklist full width
- Activity Log full width with reduced height
- Touch-optimized controls

---

## Interactive Features

### Real-time Updates
- **Countdown Timer**: Updates every second
- **Activity Log**: Auto-scrolls to new entries
- **Task Status**: Immediate visual feedback on change

### User Interactions
1. **Change Task Status**: Dropdown selection
2. **Expand/Collapse Phases**: Click phase header
3. **Add Comments**: Type and send in activity log
4. **Access Rollback Plan**: Click emergency button

### Visual Feedback
- Hover effects on interactive elements
- Smooth transitions on expand/collapse
- Color changes on status updates
- Loading states (spinning icon for in-progress tasks)

---

## Data Structure

### GoLiveProject
```typescript
{
  id: number
  title: string
  scheduledTime: string (ISO 8601)
  status: 'ON_SCHEDULE' | 'DELAYED' | 'DONE'
  checklist: ChecklistTask[]
  activityLog: ActivityLog[]
  keyContacts: KeyContact[]
  rollbackPlanUrl?: string
}
```

### ChecklistTask
```typescript
{
  id: number
  description: string
  pic: string
  picAvatar?: string
  status: 'PENDING' | 'IN_PROGRESS' | 'DONE' | 'FAILED'
  phase: 'PRE_GOLIVE' | 'DURING_GOLIVE' | 'POST_GOLIVE'
  completedAt?: string (ISO 8601)
}
```

### ActivityLog
```typescript
{
  id: number
  timestamp: string (ISO 8601)
  user: string
  userAvatar?: string
  message: string
  type: 'AUTO' | 'MANUAL'
}
```

---

## Mock Data

The current implementation uses comprehensive mock data including:
- **15 checklist tasks** across 3 phases
- **7 activity log entries** (mix of auto and manual)
- **3 key contacts** with online/offline status
- **Scheduled time**: October 1, 2025, 23:00 WIB

---

## Future Enhancements (Backend Integration)

When implementing backend functionality:

1. **WebSocket/SSE Integration**: Real-time updates from server
2. **Multi-user Support**: See other users' actions in real-time
3. **Notifications**: Browser notifications for critical events
4. **Historical Data**: View past go-live sessions
5. **Export Reports**: Generate PDF/Excel reports
6. **Role-based Permissions**: Control who can change task status
7. **Automated Status Detection**: Integration with CI/CD pipelines
8. **Metrics Dashboard**: Success rate, average time, etc.

---

## Accessibility

- High contrast colors for readability
- Semantic HTML structure
- Keyboard navigation support
- Screen reader friendly labels
- Focus indicators on interactive elements

---

## Performance Considerations

- Efficient re-renders with React hooks
- Optimized scroll behavior in activity log
- Minimal animation for smooth performance
- Lazy loading for large datasets (future)

---

## Browser Compatibility

Tested and optimized for:
- Chrome/Edge (latest)
- Firefox (latest)
- Safari (latest)
- Mobile browsers (iOS Safari, Chrome Mobile)

---

## Usage Tips

### For Release Managers
1. Monitor overall status indicator at all times
2. Use activity log to document key decisions
3. Keep stakeholders informed via manual comments
4. Have rollback plan ready but hope to never use it

### For DevOps Engineers
1. Update task status as you complete each step
2. Add technical details in activity log comments
3. Monitor countdown timer to stay on schedule
4. Communicate issues immediately via comments

### For Stakeholders
1. View-only access to monitor progress
2. Check overall status for quick updates
3. Review activity log for detailed information
4. Contact key personnel if needed

---

## Design Credits

**Design Pattern**: Mission Control / Command Center
**Inspiration**: NASA Mission Control, DevOps War Rooms
**UI Framework**: Tailwind CSS
**Icons**: Heroicons (via inline SVG)

---

## File Location

**Main Component**: `src/app/(admin)/go-live/[projectId]/page.tsx`
**Navigation**: Added to `src/layout/AppSidebar.tsx`

---

## Screenshots Reference

### Main Dashboard
- Full-width header with countdown and status
- Three-column layout on desktop
- Dark theme with high contrast

### Checklist Section
- Collapsible phase groups
- Task items with status icons
- PIC avatars and names
- Interactive status dropdowns

### Activity Log
- Scrollable feed of events
- User avatars and timestamps
- Comment input at bottom
- Auto-scroll to latest

### Key Contacts & Rollback
- Contact cards with online status
- Emergency rollback button
- Side-by-side layout on desktop

---

## Conclusion

The Go-Live Command Center provides a comprehensive, professional interface for managing critical deployment processes. Its mission control aesthetic, combined with practical features and responsive design, ensures teams can monitor and control go-live operations with confidence.

**Status**: ✅ UI/UX Design Complete - Ready for Backend Integration
