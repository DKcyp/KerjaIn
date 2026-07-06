# Reports Tree View Implementation

## Overview
The Reports page has been completely redesigned to display hierarchical data in a tree-like view, similar to the existing `/laporan` page. This implementation shows tasks and bugs organized by project modules with expand/collapse functionality.

## Features Implemented

### 1. **Four Report Tabs**
- **Laporan Proyek**: Project reports with module hierarchy
- **Laporan Task**: Task reports organized by modules with progress tracking
- **Laporan UAT/EUT**: Bug/UAT reports organized by modules
- **Laporan Tiket Support**: Support ticket monitoring with SLA compliance tracking

### 2. **Tree View Structure**
- Hierarchical display of project modules
- Expand/collapse functionality for parent modules
- Indentation based on module depth
- Visual indicators (▸ for collapsed, ▾ for expanded, • for leaf nodes)

### 3. **Module-Based Organization**
- Tasks and bugs are grouped by their associated modules
- Counts show total items per module (including descendants)
- Progress bars for task completion (only in Task tab)
- Color-coded progress: Red (<50%), Amber (50-80%), Green (>80%)

### 4. **Filtering Options**
- **Project Filter**: Select specific project to view its modules
- **User Filter**: Filter tasks by assigned user (Task tab only)
- Real-time data loading from API

### 5. **Data Display**
- Tasks show: Code, User, Date, Status badge
- Bugs show: Bug ID, Description, Severity badge, Status
- Support Tickets show: ID, Subject, Client, Date, Status, Resolution Time, SLA Status
- Status badges with color coding matching existing system
- Severity badges (Critical/Major/Minor) for bugs
- SLA badges (Met/Missed) for support tickets

### 6. **Export Functionality**
- Export to Excel (XLSX) format
- Includes project name in filename
- Formatted headers and data
- Separate export formats for Task and UAT tabs

## Technical Implementation

### File Structure
```
src/app/(admin)/reports/
  └── page.tsx          # Main reports page with tree view
```

### Key Components

#### Data Types
```typescript
type TabType = "proyek" | "task" | "uat";
type ModulNode = { id, nama, children?, isLeaf?, kode? };
type TaskItem = { id, kode, projectId, moduleId, pegawaiId, scheduleAt, status, ... };
type BugItem = { id, deskripsi, projectId, moduleId, severity, status, ... };
```

#### State Management
- `modulesTree`: Hierarchical module structure from API
- `expanded`: Set of expanded module IDs
- `detailsOpen`: Set of leaf modules showing task/bug details
- `tasks`: Array of task items from API
- `bugs`: Array of bug items (currently mock data)

#### Key Functions
- `flattenTree()`: Converts hierarchical tree to flat rows for rendering
- `toggleExpand()`: Handles parent module expand/collapse
- `toggleDetails()`: Handles leaf module detail display
- `tasksByModule` / `bugsByModule`: Maps items to their modules
- `tasksTotalCountMap` / `bugsTotalCountMap`: Aggregates counts including descendants
- `modulePct`: Calculates completion percentage per module

### API Integration
- `/api/proyek`: Loads project list
- `/api/pegawai`: Loads user list for filtering
- `/api/proyek-modules/{id}/tree`: Loads module hierarchy
- `/api/tasklist`: Loads tasks with filters (projectId, pegawaiId, showAll)

### Styling
- Dark mode support throughout
- Consistent with existing design system
- Responsive layout
- Hover effects and transitions
- Color-coded status badges

## Usage

1. **Select a Project**: Use the project dropdown to select which project to view
2. **Choose Tab**: Switch between Proyek, Task, or UAT/EUT tabs
3. **Expand Modules**: Click the arrow (▸/▾) to expand/collapse module hierarchies
4. **View Details**: Click on leaf modules to see individual tasks or bugs
5. **Filter (Task tab)**: Optionally filter by specific user
6. **Export**: Click "Export Excel" to download data

## Future Enhancements

### Recommended Additions
1. **Bug API Integration**: Replace mock bug data with actual API endpoint
2. **Date Range Filter**: Add date range picker for time-based filtering
3. **Search Functionality**: Add search box to filter modules/tasks by name
4. **Sorting Options**: Allow sorting by date, status, priority
5. **Detail Modal**: Add modal for viewing full task/bug details
6. **Project Summary Tab**: Add overview statistics and charts for selected project
7. **Bulk Actions**: Select multiple items for bulk status updates
8. **Real-time Updates**: WebSocket integration for live status updates

### Performance Optimizations
- Implement virtual scrolling for large datasets
- Add pagination for tasks/bugs
- Cache module tree data
- Lazy load module children on expand

## Notes
- Bug data is currently mocked - needs API endpoint implementation
- Progress calculation only applies to Task tab
- Export functionality works for Task and UAT tabs (Proyek tab can be added)
- Module tree structure must be properly configured in the database
