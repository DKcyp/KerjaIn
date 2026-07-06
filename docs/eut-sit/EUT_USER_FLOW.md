# EUT User Flow Documentation

## Complete EUT Approval Flow

### Overview
The EUT (End User Test) system has a 3-level navigation structure for approving test items with file uploads.

---

## Navigation Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                      1. EUT Dashboard                            │
│                    /eut (Main List Page)                         │
│                                                                   │
│  • Select Project                                                │
│  • View all modules with EUT items                              │
│  • See statistics (Total, Pending, Approved)                    │
│  • Filter by status                                              │
│                                                                   │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ Module Tree View                                         │   │
│  │  📁 Module A (5 items) ──────────────► Click           │   │
│  │  📁 Module B (3 items)                                   │   │
│  │  📁 Module C (8 items)                                   │   │
│  └─────────────────────────────────────────────────────────┘   │
└───────────────────────────────────┬─────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────┐
│                   2. Module Detail Page                          │
│              /eut/module/[moduleId]                              │
│                                                                   │
│  • View all EUT items in the selected module                    │
│  • See module statistics                                         │
│  • Module summary (Total, Pending, Approved)                    │
│                                                                   │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ EUT Items List                                           │   │
│  │  ┌───────────────────────────────────────────────┐      │   │
│  │  │ EUT-001 | Feature A | Pending ──────► Click  │      │   │
│  │  └───────────────────────────────────────────────┘      │   │
│  │  ┌───────────────────────────────────────────────┐      │   │
│  │  │ EUT-002 | Feature B | Pending ──────► Click  │      │   │
│  │  └───────────────────────────────────────────────┘      │   │
│  │  ┌───────────────────────────────────────────────┐      │   │
│  │  │ EUT-003 | Feature C | Approved                │      │   │
│  │  └───────────────────────────────────────────────┘      │   │
│  └─────────────────────────────────────────────────────────┘   │
└───────────────────────────────────┬─────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────┐
│                   3. EUT Item Detail Page                        │
│                    /eut/[itemId]                                 │
│                                                                   │
│  • View complete item details                                    │
│  • See tester information                                        │
│  • View test date and description                                │
│                                                                   │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ Status: Pending                                          │   │
│  │                                                           │   │
│  │  ┌─────────────────────────────────────────┐            │   │
│  │  │  [Approve EUT] Button                   │            │   │
│  │  └─────────────────────────────────────────┘            │   │
│  └─────────────────────────────────────────────────────────┘   │
└───────────────────────────────────┬─────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────┐
│                   4. Approval Modal                              │
│                  (File Upload Interface)                         │
│                                                                   │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ UAT File Upload (Required) ⚠️                           │   │
│  │  📄 Click to upload UAT file                            │   │
│  │  Accepts: PDF, DOC, DOCX, XLS, XLSX                     │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                   │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ User Guide Files (Optional)                              │   │
│  │  📚 Click to upload user guide files                     │   │
│  │  Accepts: PDF, DOC, DOCX (Multiple files)               │   │
│  │                                                           │   │
│  │  Selected files:                                         │   │
│  │  • guide1.pdf [Remove]                                   │   │
│  │  • guide2.pdf [Remove]                                   │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                   │
│  [Cancel]  [Approve EUT]                                         │
└─────────────────────────────────────────────────────────────────┘
```

---

## Detailed Step-by-Step Flow

### Step 1: EUT Dashboard (`/eut`)

**Purpose**: Overview of all EUT items organized by project and module

**Actions**:
1. Select a project from dropdown
2. View module tree with EUT item counts
3. See overall statistics
4. Click on any module to view its items

**Features**:
- Project filter
- Status filter (All, Pending, Approved)
- Statistics cards (Total, Pending, Approved, Approval Rate)
- Module tree with expandable/collapsible nodes
- Visual progress bars per module

---

### Step 2: Module Detail Page (`/eut/module/[moduleId]`)

**Purpose**: View all EUT items within a specific module

**Actions**:
1. View list of all EUT items in the module
2. See module-level statistics
3. Click on any EUT item to view details and approve

**Features**:
- Module information card
- List of all EUT items with:
  - Item code
  - Feature name
  - Status badge
  - Tester information
  - Test date
- Module summary statistics
- Quick actions sidebar
- **Each item is clickable** → redirects to item detail page

**Visual Indicators**:
- Hover effect on items (shows they're clickable)
- Arrow icon on the right of each item
- Status badges (Pending/Approved)

---

### Step 3: EUT Item Detail Page (`/eut/[itemId]`)

**Purpose**: View complete details of a single EUT item and approve it

**Actions**:
1. Review item details (feature name, description, tester, dates)
2. Check current status
3. Click **"Approve EUT"** button (only visible if status is Pending)

**Features**:
- Complete item information
- Test details section
- Status card
- Approval button (conditional - only for Pending items)
- Back navigation to module/list

**Approval Button Visibility**:
```typescript
{eutItem.status === "Pending" && (
  <button onClick={handleApproveClick}>
    Approve EUT
  </button>
)}
```

---

### Step 4: Approval Modal (File Upload)

**Purpose**: Upload required files and approve the EUT item

**Required**:
- ✅ **UAT File** (Single file)
  - Formats: PDF, DOC, DOCX, XLS, XLSX
  - Must be provided to approve

**Optional**:
- 📚 **User Guide Files** (Multiple files)
  - Formats: PDF, DOC, DOCX
  - Can upload multiple files
  - Can remove files before submission

**Actions**:
1. Upload UAT file (required)
2. Upload user guide files (optional)
3. Review selected files
4. Click "Approve EUT" to submit

**Process**:
1. Files are uploaded to `/api/eut/upload`
2. File paths are stored in database
3. Status is updated to "Approved"
4. Approver ID and timestamp are recorded
5. Modal closes and page refreshes with updated data

---

## Status System

### Only 2 Statuses

1. **Pending** (Default)
   - Newly created EUT items
   - Waiting for approval
   - Shows "Approve EUT" button

2. **Approved** (Final)
   - Files uploaded successfully
   - Approver recorded
   - No further action needed
   - No approval button shown

**Note**: Reject functionality has been removed. Only approval is supported.

---

## File Storage

### Directory Structure
```
public/uploads/eut/
├── uat/
│   └── {timestamp}_{filename}.pdf
└── userguide/
    ├── {timestamp}_{guide1}.pdf
    └── {timestamp}_{guide2}.pdf
```

### Database Storage
- `uatFilePath`: String (single file path)
- `userGuideFiles`: JSON array of file paths

---

## API Endpoints Used

### 1. GET `/api/eut?projectId={id}`
- Fetch all EUT items for a project
- Used by: Dashboard page

### 2. GET `/api/eut/module/{moduleId}`
- Fetch all EUT items for a specific module
- Used by: Module detail page

### 3. GET `/api/eut/{itemId}`
- Fetch single EUT item details
- Used by: Item detail page

### 4. POST `/api/eut/upload`
- Upload files (UAT or user guides)
- Returns file paths
- Used by: Approval modal

### 5. PUT `/api/eut/{itemId}`
- Update EUT item (approve with file paths)
- Records approver and timestamp
- Used by: Approval modal

---

## User Experience Features

### Visual Feedback
- ✅ Hover effects on clickable items
- ✅ Loading states
- ✅ Progress indicators during upload
- ✅ Status badges with icons
- ✅ Arrow icons indicating clickable items

### Error Handling
- ✅ Validation for required UAT file
- ✅ File type validation
- ✅ Error messages for failed uploads
- ✅ Network error handling

### Responsive Design
- ✅ Mobile-friendly layout
- ✅ Dark mode support
- ✅ Adaptive grid layouts

---

## Key Points

1. **3-Level Navigation**: Dashboard → Module → Item Detail
2. **Click-through Flow**: Each level is clickable to drill down
3. **Approval at Item Level**: Individual items are approved with file uploads
4. **Required UAT File**: Cannot approve without uploading UAT file
5. **Optional User Guides**: Multiple user guide files can be uploaded
6. **No Reject**: Only Pending and Approved statuses exist
7. **Automatic Tracking**: Approver and timestamp recorded automatically

---

## Common User Journeys

### Journey 1: Approve Single Item
```
Dashboard → Select Project → Click Module → Click Item → Approve → Upload Files → Submit
```

### Journey 2: Review Module Progress
```
Dashboard → Select Project → Click Module → View all items and statistics
```

### Journey 3: Check Specific Item Status
```
Dashboard → Select Project → Click Module → Click Item → View details
```

---

## Troubleshooting

### "No Approve Button"
- **Cause**: Item status is not "Pending"
- **Solution**: Check item status - button only shows for Pending items

### "Cannot Submit Approval"
- **Cause**: UAT file not uploaded
- **Solution**: Upload UAT file (required)

### "Module Page Shows No Items"
- **Cause**: No EUT items created for that module yet
- **Solution**: EUT items are auto-created from UAT items when module is 100% UAT approved

---

## Summary

The EUT system provides a clear, hierarchical flow for reviewing and approving end user tests:

1. **Start broad** (Dashboard with all modules)
2. **Narrow down** (Module page with all items)
3. **Focus on detail** (Item page with approval action)
4. **Complete approval** (Modal with file uploads)

Each level is clickable and provides appropriate context and actions for that level of detail.
