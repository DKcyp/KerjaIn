# EUT/SIT Management System - UI/UX Design Documentation

## 📋 Overview

This document provides comprehensive documentation for the **EUT (End User Test) and SIT (System Integration Test) Management System** UI/UX design. This is a high-fidelity visual mockup implementation created using React and Tailwind CSS, demonstrating the complete user interface for managing test processes.

**Target Audience:** QA Engineers, System Integrators, and Test Managers

**Design Philosophy:** Professional, structured, and highly functional interface prioritizing clarity over decoration, inspired by industry-standard test management tools like Jira.

---

## 🎨 Design System

### Color Palette

The design follows a consistent color scheme to convey status and actions:

| Color | Usage | Hex/Tailwind |
|-------|-------|--------------|
| **Neutral (Grays, Whites)** | Main interface, backgrounds | `bg-gray-50`, `bg-white`, `text-gray-900` |
| **Blue** | Interactive elements, links, primary actions | `bg-blue-600`, `text-blue-600` |
| **Green** | Passed tests, approved status | `bg-green-600`, `text-green-600` |
| **Red** | Failed tests, critical bugs, errors | `bg-red-600`, `text-red-600` |
| **Orange** | In Progress status | `bg-orange-600`, `text-orange-600` |
| **Yellow** | Pending/Awaiting Approval status | `bg-yellow-600`, `text-yellow-600` |

### Typography

- **Headings:** Bold, clear hierarchy (text-3xl, text-2xl, text-lg)
- **Body Text:** text-sm for most content
- **Labels:** text-xs uppercase for section headers
- **Font Weight:** Medium (500) for emphasis, Bold (700) for headings

### Layout Patterns

- **Master-Detail Pattern:** List view → Detail view navigation
- **Grid-Based Layout:** Clean, structured spacing using Tailwind's grid system
- **Two-Column Layout:** Used in test execution for steps and bug logging
- **Card Components:** Elevated surfaces with shadow-sm and border

---

## 📁 File Structure

```
src/
├── app/
│   └── (admin)/
│       └── eut-sit/
│           ├── page.tsx                          # Screen 1: Dashboard
│           ├── [id]/
│           │   ├── page.tsx                      # Screen 2: Test Plan Detail
│           │   └── scenario/
│           │       └── [scenarioId]/
│           │           └── page.tsx              # Screen 3: Test Execution
│
├── components/
│   └── eutSit/
│       ├── StatusBadge.tsx                       # Reusable status badge component
│       ├── ProgressBar.tsx                       # Reusable progress bar component
│       └── SeverityIndicator.tsx                 # Reusable severity indicator
│
└── layout/
    └── AppSidebar.tsx                            # Updated with EUT/SIT navigation
```

---

## 🖥️ Screen Designs

### Screen 1: EUT/SIT Dashboard

**File:** `src/app/(admin)/eut-sit/page.tsx`

**Purpose:** High-level overview of all active and past EUT/SIT test cycles.

#### Key Components

1. **Header Section**
   - Title: "Manajemen EUT/SIT"
   - Subtitle with description
   - Primary action button: `[+ Buat Rencana Tes Baru]` (blue, with icon)

2. **Statistics Cards** (4-column grid)
   - Total Rencana Tes (blue)
   - Sedang Berjalan (orange)
   - Menunggu Approval (yellow)
   - Disetujui (green)
   - Each card includes an icon and count

3. **Test Plans Table**
   - Columns:
     - ID (e.g., TP-001)
     - Nama Rencana Tes
     - Progres (visual progress bar)
     - Status (colored badge)
     - Tanggal Mulai
     - Tanggal Selesai
     - Skenario (count badge)
     - Bug (count badge with red highlight if > 0)
   - Interactive rows with hover state (blue-50)
   - Click to navigate to detail view

4. **Empty State**
   - Displayed when no test plans exist
   - Icon, message, and CTA button

#### Visual States

- **Hover:** Row background changes to `bg-blue-50`
- **Selected:** Row highlighted with `bg-blue-50`
- **Status Badges:** Colored pills with appropriate status colors

#### Mock Data

The dashboard displays 5 sample test plans with varying statuses and progress levels.

---

### Screen 2: Test Plan Detail

**File:** `src/app/(admin)/eut-sit/[id]/page.tsx`

**Purpose:** Manage a single EUT/SIT plan, view scenarios, and track bugs.

#### Key Components

1. **Breadcrumb Navigation**
   - Manajemen EUT/SIT → [Test Plan Name]
   - Blue links with hover states

2. **Header Card**
   - Test plan name (large, bold)
   - Status badge
   - Description text
   - Metadata grid (3 columns):
     - Tanggal Mulai
     - Tanggal Selesai
     - Dibuat Oleh
   - **Approve Button** (conditional)
     - Enabled state: Green background, active
     - Disabled state: Gray background, cursor-not-allowed
     - Helper text when disabled
   - Overall progress bar (large, with percentage)

3. **Tabbed Interface**
   - **Tab 1: Skenario Tes**
     - Active tab: Blue text, blue underline, blue background
     - Badge showing count
     - Table with columns:
       - ID Skenario
       - Judul Skenario (with icon)
       - Modul Terkait (blue tags)
       - Tester (avatar + name)
       - Progress (mini progress bar)
       - Status (colored badge)
       - Bug (count badge)
     - Clickable rows to navigate to test execution

   - **Tab 2: Daftar Bug**
     - Badge showing open bug count (red)
     - Table with columns:
       - Bug ID
       - Judul Bug (with warning icon)
       - Skenario Terkait (ID + title)
       - Severity (colored indicator)
       - Status Bug (colored badge)
       - Dilaporkan Oleh
       - Tanggal

#### Visual States

- **Tab Active:** Blue accent color with bottom border
- **Tab Inactive:** Gray text with hover effect
- **Approve Button Enabled:** Green with hover effect
- **Approve Button Disabled:** Gray, non-interactive
- **Table Rows:** Hover effect on scenarios

#### Conditional Logic

- Approve button is only enabled when:
  - All scenarios have status = "passed"
  - Overall progress = 100%

---

### Screen 3: Test Execution

**File:** `src/app/(admin)/eut-sit/[id]/scenario/[scenarioId]/page.tsx`

**Purpose:** Execute test steps and log bugs for a specific scenario.

#### Layout: Two-Column Design

##### Left Column (2/3 width): Execution Steps

1. **Scenario Header**
   - Gradient background (blue-50 to white)
   - Scenario title (large, bold)
   - Description
   - Status badge
   - Tester info with icon
   - Module tags (blue pills)

2. **Steps List**
   - Ordered list of test steps
   - Each step card contains:
     - **Step Number Badge**
       - Not Started: Gray circle with number
       - Passed: Green circle with checkmark
       - Failed: Red circle with X
     - **Step Content:**
       - Aksi (action description)
       - Hasil yang Diharapkan (expected result)
     - **Action Buttons** (for not-started steps):
       - `[✔ Pass]` button (green)
       - `[✖ Fail]` button (red)
     - **Status Badge** (for completed steps)

3. **Step Visual States**
   - Not Started: White background, gray border
   - Passed: Green background (green-50), green border
   - Failed: Red background (red-50), red border
   - Hover: Blue border (for not-started)

##### Right Column (1/3 width): Bug Logging & Info

1. **Status Skenario Card**
   - White card with statistics:
     - Total Langkah
     - Passed (green text)
     - Failed (red text)
     - Not Started (gray text)

2. **Catat Bug/Error Form**
   - Collapsible section with header button
   - Gradient background (red-50 to white)
   - Warning icon
   - Expand/collapse chevron icon
   - **Form Fields** (when expanded):
     - Judul Bug (text input, required)
     - Langkah Terkait (dropdown, required)
     - Severity (dropdown, required)
       - Options: Trivial, Minor, Major, Critical
     - Deskripsi Bug (textarea, required)
     - Lampirkan Bukti (file upload)
       - Drag & drop area
       - File type and size hints
     - `[Laporkan Bug]` button (red, full width)

3. **Bug Terkait Skenario Card**
   - List of bugs already logged
   - Each bug card shows:
     - Bug ID
     - Status badge
     - Title
     - Severity indicator
     - Related step number
   - Empty state when no bugs

#### Interaction Flow

1. Tester views step-by-step instructions
2. For each step, tester performs the action
3. Tester clicks `[Pass]` or `[Fail]`
4. If `[Fail]` is clicked:
   - Bug form automatically expands
   - Step field is pre-filled
   - Tester fills in bug details
   - Tester submits bug report
5. Step status updates visually
6. Progress updates in real-time

---

## 🧩 Reusable Components

### 1. StatusBadge Component

**File:** `src/components/eutSit/StatusBadge.tsx`

**Props:**
- `status`: StatusType (draft | in-progress | awaiting-approval | approved | passed | failed | not-started | open | fixed | closed)
- `label`: string

**Styling:**
- Rounded pill shape
- Border and background colors based on status
- Small text (text-xs)
- Inline-flex for proper alignment

**Usage:**
```tsx
<StatusBadge status="in-progress" label="In Progress" />
```

### 2. ProgressBar Component

**File:** `src/components/eutSit/ProgressBar.tsx`

**Props:**
- `percentage`: number (0-100)
- `showLabel?`: boolean (default: true)
- `size?`: 'sm' | 'md' | 'lg' (default: 'md')

**Features:**
- Dynamic color based on percentage:
  - 100%: Green
  - 70-99%: Blue
  - 40-69%: Orange
  - 0-39%: Red
- Smooth transition animation
- Optional percentage label

**Usage:**
```tsx
<ProgressBar percentage={75} size="md" showLabel={true} />
```

### 3. SeverityIndicator Component

**File:** `src/components/eutSit/SeverityIndicator.tsx`

**Props:**
- `severity`: SeverityType (critical | major | minor | trivial)

**Features:**
- Colored dot indicator
- Severity label
- Consistent spacing

**Severity Colors:**
- Critical: Red (bg-red-500)
- Major: Orange (bg-orange-500)
- Minor: Yellow (bg-yellow-500)
- Trivial: Gray (bg-gray-400)

**Usage:**
```tsx
<SeverityIndicator severity="critical" />
```

---

## 🎯 Design Patterns & Best Practices

### Visual Hierarchy

1. **Primary Actions:** Large, colored buttons (blue for create, green for approve, red for fail)
2. **Secondary Actions:** Smaller, outlined or gray buttons
3. **Destructive Actions:** Red color scheme
4. **Information Display:** Cards with subtle shadows and borders

### Status Communication

- **Colors:** Instantly convey status (green = good, red = bad, orange = in progress, yellow = pending)
- **Icons:** Supplement text labels (checkmarks, X's, warning triangles)
- **Badges:** Compact status indicators with consistent styling

### Interaction States

All interactive elements include:
- **Default State:** Base styling
- **Hover State:** Background color change or border highlight
- **Active State:** Pressed appearance
- **Disabled State:** Grayed out with cursor-not-allowed

### Responsive Design

- Grid layouts adapt to screen size
- Tables are horizontally scrollable on small screens
- Sidebar collapses on mobile
- Two-column layout stacks on mobile

### Accessibility Considerations

- Semantic HTML elements
- Proper heading hierarchy
- Color contrast ratios meet WCAG standards
- Focus states for keyboard navigation
- ARIA labels where appropriate

---

## 🔗 Navigation Flow

```
Dashboard (/eut-sit)
    ↓ Click on test plan row
Test Plan Detail (/eut-sit/[id])
    ↓ Click on scenario row
Test Execution (/eut-sit/[id]/scenario/[scenarioId])
```

**Breadcrumb Navigation:**
- Always visible at top of page
- Links are clickable to navigate back
- Current page is non-clickable

---

## 📊 Mock Data Structure

### Test Plan
```typescript
{
  id: string;              // e.g., "TP-001"
  name: string;            // e.g., "SIT Rilis Q4 2025"
  description: string;
  progress: number;        // 0-100
  status: 'draft' | 'in-progress' | 'awaiting-approval' | 'approved';
  startDate: string;       // ISO date
  endDate: string;         // ISO date
  createdBy: string;
  scenarios: number;       // count
  bugs: number;           // count
}
```

### Scenario
```typescript
{
  id: string;              // e.g., "SC-001"
  title: string;
  modules: string[];       // e.g., ["Penjualan", "Gudang"]
  tester: string;
  status: 'passed' | 'failed' | 'in-progress' | 'not-started';
  totalSteps: number;
  passedSteps: number;
  bugs: number;
}
```

### Test Step
```typescript
{
  id: number;
  action: string;
  expectedResult: string;
  status: 'passed' | 'failed' | 'not-started';
}
```

### Bug
```typescript
{
  id: string;              // e.g., "BUG-001"
  title: string;
  scenario: string;        // scenario ID
  scenarioTitle: string;
  severity: 'critical' | 'major' | 'minor' | 'trivial';
  status: 'open' | 'in-progress' | 'fixed' | 'closed';
  reportedBy: string;
  reportedDate: string;    // ISO date
  description?: string;
  step?: number;
}
```

---

## 🚀 Implementation Notes

### Technology Stack

- **Framework:** Next.js 14+ with App Router
- **Styling:** Tailwind CSS
- **Language:** TypeScript
- **State Management:** React useState hooks
- **Routing:** Next.js file-based routing with dynamic segments

### Key Features Implemented

✅ **Dashboard with statistics and test plan list**
✅ **Test plan detail with tabbed interface**
✅ **Test execution with step-by-step interface**
✅ **Bug logging form with validation**
✅ **Reusable UI components**
✅ **Responsive design**
✅ **Interactive states (hover, active, disabled)**
✅ **Status indicators and progress bars**
✅ **Breadcrumb navigation**
✅ **Sidebar integration**

### Future Enhancements (Out of Scope for UI/UX Phase)

The following are intentionally **not implemented** as this is a UI/UX design phase:

- ❌ Database schema and backend API
- ❌ Authentication and authorization
- ❌ Real data fetching and mutations
- ❌ Form validation logic
- ❌ File upload functionality
- ❌ Real-time updates
- ❌ Email notifications
- ❌ Reporting and analytics
- ❌ Export functionality

---

## 🎨 Visual Design Highlights

### Cards & Containers
- Subtle shadows (`shadow-sm`)
- Border radius (`rounded-lg`)
- Border colors (`border-gray-200`)
- White backgrounds with gray-50 page background

### Tables
- Striped rows with dividers
- Hover effects for interactivity
- Sticky headers (optional)
- Responsive horizontal scroll

### Forms
- Clear labels with required indicators
- Placeholder text for guidance
- Focus states with blue ring
- Validation styling (not implemented in mockup)

### Buttons
- Primary: Blue background, white text
- Success: Green background, white text
- Danger: Red background, white text
- Disabled: Gray background, gray text
- Icons for visual clarity

### Typography Scale
- `text-3xl`: Page titles
- `text-2xl`: Section titles
- `text-lg`: Card titles
- `text-sm`: Body text
- `text-xs`: Labels, badges, metadata

---

## 📱 Responsive Breakpoints

- **Mobile:** < 640px (sm)
- **Tablet:** 640px - 1024px (md, lg)
- **Desktop:** > 1024px (xl, 2xl)

**Responsive Behaviors:**
- Statistics cards: 1 column (mobile) → 2 columns (tablet) → 4 columns (desktop)
- Test execution: Single column (mobile) → Two columns (desktop)
- Tables: Horizontal scroll on mobile
- Sidebar: Collapsible on mobile

---

## 🎯 Design Goals Achieved

✅ **Professional & Structured:** Clean, grid-based layout with clear hierarchy
✅ **Functional:** Prioritizes usability and clarity over decoration
✅ **Visual Traceability:** Clear relationship between test plans, scenarios, steps, and bugs
✅ **Status Communication:** Consistent use of colors, icons, and badges
✅ **Interaction States:** All interactive elements have hover, active, and disabled states
✅ **Master-Detail Pattern:** Effective navigation from list to detail views
✅ **Approval Mechanism:** Clear visual indication of approval eligibility

---

## 📖 Usage Guide

### For Developers

1. **Navigate to the EUT/SIT section** via the sidebar
2. **Review the three main screens** to understand the user flow
3. **Examine the reusable components** for consistency
4. **Check the mock data** to understand data structures
5. **Test responsive behavior** by resizing the browser

### For Designers

1. **Color Palette:** Documented in Design System section
2. **Component Library:** StatusBadge, ProgressBar, SeverityIndicator
3. **Layout Patterns:** Master-detail, two-column, card-based
4. **Typography:** Consistent scale and hierarchy
5. **Interaction States:** Hover, active, disabled states for all elements

### For QA/Stakeholders

1. **Dashboard:** View all test plans at a glance
2. **Test Plan Detail:** Manage scenarios and track bugs
3. **Test Execution:** Execute tests step-by-step and log bugs
4. **Visual Feedback:** Clear status indicators throughout
5. **Approval Workflow:** Conditional approval based on test completion

---

## 🔍 Testing the UI

To view the UI mockup:

1. Start the development server
2. Navigate to `/eut-sit` in your browser
3. Click on a test plan to view details
4. Click on a scenario to view test execution
5. Interact with buttons and forms to see states

**Note:** Since this is a UI/UX mockup, actions will log to console but won't persist data.

---

## 📝 Conclusion

This EUT/SIT Management System UI/UX design provides a comprehensive, high-fidelity visual mockup for managing end-user and system integration testing. The design emphasizes:

- **Clarity:** Clear visual hierarchy and status communication
- **Functionality:** Intuitive workflows for test execution and bug tracking
- **Professionalism:** Clean, structured interface inspired by industry standards
- **Consistency:** Reusable components and design patterns
- **Responsiveness:** Adapts to different screen sizes

The mockup is ready for stakeholder review, user testing, and serves as a blueprint for backend implementation.

---

**Document Version:** 1.0  
**Last Updated:** 2025-10-01  
**Created By:** Cascade AI Assistant
