# Blueprint Management Module

## Overview
This document describes the newly created **Blueprint Management** module for the Logbook application. This module provides a clean, modern, and intuitive interface for managing project blueprints with dummy data (no backend/database integration).

## Features Implemented

### 1. **Project Dashboard / List Page** (`/blueprint`)
- **Location**: `src/app/(admin)/blueprint/page.tsx`
- **Features**:
  - Full-width data table displaying all projects
  - Search functionality (searches across Project ID, Name, Client, and PIC)
  - Filter by Blueprint Status (All, Draft, Approved, Rejected)
  - Color-coded status badges:
    - **Green**: Approved
    - **Orange**: Draft/Pending
    - **Red**: Rejected
  - Clickable rows that navigate to detail page
  - Hover effects for better UX
  - Responsive design

### 2. **Project Blueprint Detail Page** (`/blueprint/[id]`)
- **Location**: `src/app/(admin)/blueprint/[id]/page.tsx`
- **Layout**: Card-based, two-column responsive layout

#### Components:

**a. Project Header Card**
- Displays project name prominently
- Shows Project ID, Client, and PIC information
- Color-coded status badge

**b. Document Management Card** (Left Column)
- Title: "Dokumen Requirement"
- "+ Upload Dokumen" button (opens modal)
- File list with:
  - File icons (based on extension: PDF, DOCX, XLSX)
  - File name, version, uploader, and upload date
  - Hover actions: Preview (eye icon), Download (arrow icon), Replace (refresh icon)

**c. System Requirements Checklist Card** (Left Column)
- Title: "Checklist Kebutuhan Sistem"
- Progress bar showing completion percentage
- List of requirements with:
  - Checkbox (checked for "Done" status)
  - Requirement description
  - Assigned user with avatar icon
  - Status dropdown (Pending, Done, Revisi)

**d. Approval & History Card** (Right Column)
- Title: "Approval & Histori"
- Conditional approval buttons (shown only for Draft status):
  - Green "Approve" button
  - Red "Reject" button
  - Both trigger modal for comments
- Activity timeline feed showing:
  - User avatars (initials)
  - Action descriptions
  - Timestamps
  - Comments (if any)

### 3. **Modals**

**Upload Document Modal**
- Drag & drop file upload area
- Optional notes field
- Cancel and Upload buttons

**Approval Modal**
- Dynamic title (Approve/Reject)
- Comment/notes textarea (required for rejection)
- Cancel and action buttons

### 4. **Navigation Integration**
- Added "Blueprint" menu item to sidebar (`src/layout/AppSidebar.tsx`)
- Custom Blueprint icon (document with lines)
- Visible to all roles (SUPER_ADMIN, PM, PROGRAMMER, ADMIN)
- Positioned between "Master" and "Tasklist" menus

## Dummy Data

### Projects (8 total):
1. Sistem Informasi Akademik - Universitas Indonesia (Approved)
2. E-Commerce Platform - PT Maju Jaya (Draft)
3. Mobile Banking App - Bank Sejahtera (Approved)
4. Inventory Management System - PT Logistik Nusantara (Rejected)
5. HR Management Portal - PT Karya Mandiri (Draft)
6. Customer Relationship Management - PT Digital Solusi (Approved)
7. Learning Management System - Sekolah Tinggi Teknologi (Draft)
8. Warehouse Management System - PT Gudang Sentral (Approved)

### Blueprint Details (for projects 1 & 2):
- Documents with versions, uploaders, and dates
- Requirements with assigned users and statuses
- Activity logs with user actions and timestamps

## Design Principles

### Color Palette:
- **Base**: Neutral grays and whites
- **Status Colors**:
  - Green (#10B981): Approved/Done
  - Orange (#F59E0B): Draft/Pending/Revisi
  - Red (#EF4444): Rejected
- **Accent**: Brand color (blue) for primary actions

### UI/UX Features:
- Clean, minimalist design
- Clear visual hierarchy
- Consistent icon usage
- Responsive layout (mobile to desktop)
- Hover effects for interactivity
- Smooth transitions
- Dark mode support
- Professional typography

## File Structure

```
src/app/(admin)/blueprint/
├── page.tsx              # Project list page
├── layout.tsx            # Layout wrapper with metadata
└── [id]/
    └── page.tsx          # Project detail page

src/layout/
└── AppSidebar.tsx        # Updated with Blueprint menu item
```

## Usage

1. **Navigate to Blueprint Management**:
   - Click "Blueprint" in the sidebar
   - Or visit `/blueprint`

2. **View Project List**:
   - Search for projects using the search bar
   - Filter by status using the dropdown
   - Click any row to view details

3. **View Project Details**:
   - See all project information in organized cards
   - View documents, requirements, and activity history
   - Use approval buttons (for Draft projects)
   - Upload documents via modal

## Future Integration Points

When implementing backend/database:

1. **API Endpoints to Create**:
   - `GET /api/blueprint` - List all projects
   - `GET /api/blueprint/[id]` - Get project details
   - `POST /api/blueprint/[id]/documents` - Upload document
   - `PUT /api/blueprint/[id]/approve` - Approve blueprint
   - `PUT /api/blueprint/[id]/reject` - Reject blueprint
   - `PUT /api/blueprint/[id]/requirements/[reqId]` - Update requirement status

2. **Database Schema** (Prisma):
   - `Blueprint` table
   - `BlueprintDocument` table
   - `BlueprintRequirement` table
   - `BlueprintActivityLog` table

3. **File Upload**:
   - Implement file storage (local or cloud)
   - Add file validation
   - Handle file versioning

4. **Authentication & Authorization**:
   - Role-based access control
   - PM/Manager approval permissions
   - User assignment to requirements

## Notes

- All data is currently hardcoded (dummy data)
- No API calls are made
- Modals show console logs instead of actual actions
- File upload is UI-only (no actual file handling)
- Status changes are not persisted

## Testing

To test the module:
1. Start the development server: `npm run dev`
2. Navigate to `/blueprint`
3. Try searching and filtering projects
4. Click on a project to view details
5. Test modal interactions (Upload, Approve, Reject)
6. Verify responsive behavior on different screen sizes
7. Test dark mode compatibility

---

**Created**: 2025-10-01
**Module**: Blueprint Management
**Status**: Frontend Complete (Backend Not Implemented)
