# Reports Page Tree View Update Plan

## Overview
Add tree-like hierarchical views to Laporan Proyek, Laporan Task, and Laporan UAT/EUT tabs, similar to the existing laporan page.

## Changes Required

### 1. Add Module Tree Structure
- Create dummy module hierarchy data for each project
- Add expand/collapse functionality
- Show tasks/bugs grouped by module

### 2. Update Tab Views

#### Laporan Proyek Tab
- Keep summary chart at top
- Replace flat table with tree view showing:
  - Project name as root
  - Modules as expandable tree
  - Progress per module
  - Task count per module

#### Laporan Task Tab
- Keep metric cards at top
- Replace flat table with tree view showing:
  - Project → Module → Tasks hierarchy
  - Expandable/collapsible modules
  - Task details under each module

#### Laporan UAT/EUT Tab
- Keep metric cards at top
- Replace flat table with tree view showing:
  - Project → Module → Bugs hierarchy
  - Bugs grouped by module
  - Severity indicators

### 3. Dummy Data Structure

```typescript
// Module tree for each project
const MODULE_TREES = {
  1: [ // Project ID 1
    {
      id: 101,
      nama: "Authentication Module",
      kode: "01",
      children: [
        { id: 102, nama: "Login", kode: "01.01", isLeaf: true },
        { id: 103, nama: "Register", kode: "01.02", isLeaf: true }
      ]
    },
    {
      id: 104,
      nama: "Dashboard Module",
      kode: "02",
      isLeaf: true
    }
  ]
};

// Tasks linked to modules
const TASKS_BY_MODULE = {
  102: [task1, task2], // Login module tasks
  103: [task3],        // Register module tasks
};
```

### 4. UI Components Needed
- Tree row component with indent
- Expand/collapse toggle button
- Progress bar per module
- Task count badge

### 5. State Management
- `expanded`: Set<number> for expanded module IDs
- `selectedProject`: number for filtering by project
- Tree flattening logic
- Task aggregation by module

## Implementation Steps
1. Add module tree dummy data
2. Add expand/collapse state
3. Create tree flattening function
4. Update Laporan Proyek tab UI
5. Update Laporan Task tab UI
6. Update Laporan UAT/EUT tab UI
7. Test expand/collapse functionality
8. Test filtering by project

## Benefits
- Better data organization
- Easier to navigate large datasets
- Consistent with existing laporan page
- Shows hierarchical relationships
- Clearer progress tracking per module
