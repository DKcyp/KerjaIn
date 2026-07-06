# UAT (User Acceptance Test) UI Implementation Guide

## 📋 Overview

This document provides a comprehensive guide to the UAT UI implementation, including design specifications, component structure, and usage instructions.

## 🎨 Design Philosophy

The UAT interface follows these core principles:

- **Clean & Functional**: Minimalist design focused on task completion
- **Process-Oriented**: Clear workflow from pending → testing → pass/fail
- **Responsive**: Works seamlessly on desktop screens
- **Accessible**: Clear visual hierarchy and intuitive interactions
- **Consistent**: Follows the existing design system

## 🎯 Target Audience

- QA Testers
- Business Analysts
- Project Managers
- Product Owners

## 📁 File Structure

```
src/
├── app/
│   └── (admin)/
│       └── uat/
│           ├── page.tsx              # Main UAT queue/list page
│           └── [id]/
│               └── page.tsx          # UAT detail & execution page
├── types/
│   └── uat.ts                        # TypeScript type definitions
└── components/
    ├── ui/
    │   ├── badge/
    │   │   └── Badge.tsx            # Reusable badge component
    │   └── modal/
    │       └── index.tsx            # Reusable modal component
    └── form/
        └── Select2Field.tsx         # Select dropdown component
```

## 🖼️ Screen 1: UAT Queue / Daftar UAT

### Purpose
Main dashboard where testers see all items ready for validation.

### Key Features

#### 1. **Header Section**
- Title: "Antrian UAT (User Acceptance Test)"
- Subtitle: "Validasi fitur yang telah selesai dikembangkan"

#### 2. **Statistics Cards** (5 cards)
- **Total Items**: Total number of UAT items
- **Pending**: Items waiting to be tested (Orange)
- **Passed**: Successfully validated items (Green)
- **Failed**: Items that did not pass (Red)
- **Pass Rate**: Percentage of passed items (Purple)

#### 3. **Filter Controls**
- **Search Bar**: Full-text search across feature name, project, and developer
- **Project Filter**: Dropdown to filter by specific project
- **Tester Filter**: Dropdown to filter by assigned tester
- **Status Filter**: Dropdown with options: All, Pending, Passed, Failed
- **View Mode Toggle**: Switch between Table and Kanban views

#### 4. **View Modes**

##### Table View (Default)
Columns:
- Nama Fitur / Task
- Project
- Developer
- Tanggal Selesai Dev
- Priority (High/Medium/Low badges)
- Status (Colored badges)

Features:
- Hover effect on rows
- Click to navigate to detail page
- Empty state with celebration emoji

##### Kanban Board View
Three columns:
- **Pending** (Orange theme)
- **Passed** (Green theme)
- **Failed** (Red theme)

Each card displays:
- Feature name
- Priority badge
- Description (truncated)
- Project name
- Developer name
- Completion date

### Color Palette

| Status | Background | Text | Border |
|--------|-----------|------|--------|
| Pending | Orange/Yellow | Orange-900 | Orange-200 |
| Passed | Green | Green-900 | Green-200 |
| Failed | Red | Red-900 | Red-200 |
| Primary | Blue/Teal | Blue-900 | Blue-200 |

### Empty State
- Icon: 🎉 (celebration emoji)
- Title: "Kerja bagus! Semua item sudah diuji."
- Message: "Tidak ada item UAT yang perlu divalidasi saat ini."

## 🖼️ Screen 2: UAT Detail & Execution

### Purpose
Detailed view for testing a single item with all necessary information and action buttons.

### Layout: Two-Column Design

#### Left Column (Information Panel) - 2/3 width

##### 1. **Header Card**
- Feature name (large, bold)
- Project name
- Developer name
- Completion date
- Current status badge

##### 2. **Deskripsi Fitur**
- Full description of the feature
- Clean typography with proper spacing

##### 3. **Requirements & Acceptance Criteria**
- Formatted list of requirements
- Clear, readable text
- Proper line spacing

##### 4. **Link Terkait**
- Clickable link to testing environment
- Opens in new tab
- Icon indicator for external link

##### 5. **Lampiran (Attachments)**
- File list with icons based on type:
  - 📄 PDF files (red)
  - 🖼️ Images (blue)
  - 📎 Other files (gray)
- Each attachment shows:
  - File name
  - Uploader name
  - Upload timestamp
  - Download button

#### Right Column (Action Panel) - 1/3 width

##### 1. **Status Saat Ini Card**
- Large status badge display
- Tester name (if tested)

##### 2. **Aksi Testing Card** (Only for Pending items)
Two prominent buttons:
- **✔ Lulus (Pass)** - Green button
- **✖ Gagal (Fail)** - Red button

Button states:
- Default: Solid color
- Hover: Darker shade
- Disabled: 50% opacity

##### 3. **Activity Log Card**
Timeline-style display showing:
- User avatar (initials)
- Action description
- Status badge (if applicable)
- Comments (in bordered box)
- Timestamp

Visual elements:
- Circular avatar with initials
- Vertical line connecting activities
- Color-coded by action type

## 🎭 Feedback Modal

### Triggered By
- Clicking "Lulus (Pass)" button
- Clicking "Gagal (Fail)" button

### Pass Modal
- **Icon**: Green checkmark in circle
- **Title**: "Konfirmasi Lulus (Pass)"
- **Subtitle**: "Fitur ini telah memenuhi semua requirements"
- **Catatan Field**: Optional text area
- **Actions**: Cancel (gray) | Kirim Feedback (green)

### Fail Modal
- **Icon**: Red X in circle
- **Title**: "Laporan Kegagalan (Fail)"
- **Subtitle**: "Berikan detail masalah yang ditemukan"
- **Catatan Field**: Required text area with placeholder guidance
- **File Upload**: Drag-and-drop zone for screenshots/videos
  - Accepted formats: PNG, JPG, GIF, MP4
  - Max size: 10MB
  - Shows uploaded file list with remove option
- **Actions**: Cancel (gray) | Kirim Feedback (red, disabled if no comment)

### Modal Features
- Backdrop blur effect
- Close on ESC key
- Close on backdrop click
- Smooth animations
- Responsive sizing

## 🎨 Component Specifications

### Status Badges

```tsx
// Pending
<Badge variant="light" color="warning" size="sm">
  Pending
</Badge>

// Passed
<Badge variant="light" color="success" size="sm">
  Passed
</Badge>

// Failed
<Badge variant="light" color="error" size="sm">
  Failed
</Badge>
```

### Priority Badges

```tsx
// High
<Badge variant="solid" color="error" size="sm">
  High
</Badge>

// Medium
<Badge variant="solid" color="warning" size="sm">
  Medium
</Badge>

// Low
<Badge variant="solid" color="info" size="sm">
  Low
</Badge>
```

## 📊 Data Structure

### UATItem Interface
```typescript
interface UATItem {
  id: number;
  namaFitur: string;
  projectId: number;
  projectName: string;
  developerId: number;
  developerName: string;
  tanggalSelesaiDev: string;
  status: "Pending" | "Passed" | "Failed";
  deskripsi?: string;
  requirement?: string;
  linkTerkait?: string;
  testerId?: number;
  testerName?: string;
  priority?: "High" | "Medium" | "Low";
  attachments?: Attachment[];
  activityLog?: ActivityLog[];
}
```

See `src/types/uat.ts` for complete type definitions.

## 🔄 User Flow

### Testing Flow
1. User navigates to `/uat`
2. Views list of pending items (table or kanban)
3. Filters/searches for specific items
4. Clicks on an item to view details
5. Reviews feature description, requirements, and attachments
6. Tests the feature using provided link
7. Clicks "Lulus" or "Gagal" button
8. Fills feedback form (required for Fail)
9. Submits feedback
10. Status updates and activity log is recorded
11. Returns to list view

### Navigation Flow
```
/uat (List Page)
  ├─ Filter by Project
  ├─ Filter by Tester
  ├─ Filter by Status
  ├─ Search
  └─ Click Item → /uat/[id] (Detail Page)
                    ├─ View Information
                    ├─ Test Feature
                    ├─ Pass/Fail Action
                    └─ Back to List
```

## 🎯 Responsive Behavior

### Desktop (≥1024px)
- Two-column layout on detail page
- Full table view with all columns
- Kanban board with 3 columns side-by-side
- Statistics cards in 5-column grid

### Tablet (768px - 1023px)
- Single column layout on detail page
- Scrollable table
- Kanban board with 3 columns (scrollable)
- Statistics cards in 2-3 column grid

### Mobile (<768px)
- Stacked layout
- Simplified table (fewer columns)
- Kanban board with vertical scrolling
- Statistics cards in 1-2 column grid

## 🎨 Visual Hierarchy

### Typography
- **Page Title**: 3xl, bold (text-3xl font-bold)
- **Section Title**: lg, semibold (text-lg font-semibold)
- **Card Title**: base, medium (text-base font-medium)
- **Body Text**: sm, regular (text-sm)
- **Caption**: xs, regular (text-xs)

### Spacing
- **Page Padding**: 6 (space-y-6)
- **Card Padding**: 6 (p-6)
- **Section Gap**: 4 (gap-4)
- **Element Gap**: 2-3 (gap-2, gap-3)

### Borders & Shadows
- **Card Border**: 1px solid gray-200/gray-700
- **Hover Shadow**: md (hover:shadow-md)
- **Border Radius**: lg (rounded-lg)

## 🔧 Implementation Notes

### Mock Data
Currently using mock data in the components. Replace with actual API calls:

```typescript
// Replace this:
const MOCK_UAT_ITEMS = [...];

// With this:
useEffect(() => {
  fetch('/api/uat')
    .then(res => res.json())
    .then(data => setUatItems(data.items));
}, []);
```

### API Endpoints (To Be Implemented)
- `GET /api/uat` - List all UAT items with filters
- `GET /api/uat/[id]` - Get single UAT item details
- `POST /api/uat` - Create new UAT item
- `PUT /api/uat/[id]` - Update UAT item
- `POST /api/uat/[id]/feedback` - Submit test feedback (pass/fail)
- `GET /api/uat/statistics` - Get UAT statistics

### State Management
Currently using local React state. Consider:
- Context API for global UAT state
- React Query for server state management
- Zustand for client state management

## 🚀 Next Steps

### Backend Integration
1. Create Prisma schema for UAT tables
2. Implement API routes
3. Add file upload handling
4. Implement authentication/authorization
5. Add real-time updates (optional)

### Enhancements
1. Add filtering by date range
2. Add bulk actions (assign tester, change priority)
3. Add email notifications
4. Add export to Excel/PDF
5. Add UAT templates
6. Add test case management
7. Add integration with task management system

### Testing
1. Unit tests for components
2. Integration tests for user flows
3. E2E tests with Playwright/Cypress
4. Accessibility testing
5. Performance testing

## 📝 Design Decisions

### Why Table + Kanban?
- **Table**: Better for detailed information, sorting, and filtering
- **Kanban**: Better for visual workflow and status overview
- Users can choose based on their preference

### Why Separate Detail Page?
- Provides focused testing environment
- Reduces clutter on main page
- Allows deep linking to specific items
- Better for mobile experience

### Why Modal for Feedback?
- Keeps user in context
- Prevents accidental navigation away
- Provides clear call-to-action
- Allows for rich feedback (text + files)

## 🎓 Best Practices

### Accessibility
- Use semantic HTML
- Provide alt text for images
- Ensure keyboard navigation
- Maintain color contrast ratios
- Use ARIA labels where needed

### Performance
- Lazy load images
- Virtualize long lists
- Debounce search input
- Optimize re-renders
- Use React.memo for expensive components

### UX
- Show loading states
- Provide clear error messages
- Confirm destructive actions
- Auto-save drafts
- Show success feedback

## 📚 References

- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
- [Next.js App Router](https://nextjs.org/docs/app)
- [React Hook Form](https://react-hook-form.com/)
- [Prisma Documentation](https://www.prisma.io/docs)

## 🤝 Contributing

When adding new features:
1. Follow existing design patterns
2. Update type definitions
3. Add to this documentation
4. Test on multiple screen sizes
5. Ensure dark mode compatibility

---

**Last Updated**: 2025-10-01
**Version**: 1.0.0
**Status**: UI Mockup Complete - Backend Integration Pending
