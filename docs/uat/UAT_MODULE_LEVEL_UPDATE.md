# UAT Module-Level Testing Update

## 🔄 Major Changes

The UAT system has been redesigned to perform **module-level testing and approval** instead of individual task testing. This provides a more efficient workflow for validating complete modules.

## 🎯 Key Changes

### 1. **Module-Level Testing**
- **Before**: Each task was tested individually
- **After**: Entire modules are tested as a unit
- **Benefit**: More efficient, tests module integration, not just individual features

### 2. **Module Detail Page**
- **New Route**: `/uat/module/[id]`
- **Shows**: All tasks within the module
- **Tests**: The complete module, not individual tasks
- **Approval**: Pass/Fail applies to entire module

### 3. **File Upload for Both Pass & Fail**
- **Pass**: Can attach approval documents, test reports, certificates
- **Fail**: Can attach screenshots, videos, bug reports
- **Supported**: Images, Videos, PDFs, DOC, XLS files
- **Max Size**: 10MB per file
- **Multiple Files**: Yes, can upload multiple files

### 4. **Updated Tree Navigation**
- **Clickable Modules**: Click on leaf modules (with UAT items) to test
- **Visual Indicator**: Shows "(Click to test module)" on hover
- **Expand/Collapse**: Still works for parent modules
- **Individual Tasks**: No longer clickable (testing is module-level)

## 📊 New Structure

### Module UAT Object
```typescript
interface UATModule {
  id: number;
  moduleId: number;
  moduleName: string;
  moduleCode: string;
  projectId: number;
  projectName: string;
  status: "Pending" | "Passed" | "Failed";
  requirement?: string;              // Module requirements
  acceptanceCriteria?: string;       // Module acceptance criteria
  tasks: UATTask[];                  // All tasks in module
  attachments?: Attachment[];
  activityLog?: ActivityLog[];
  testedBy?: string;
  testedAt?: string;
}

interface UATTask {
  id: number;
  namaFitur: string;
  kode: string;
  developerId: number;
  developerName: string;
  tanggalSelesaiDev: string;
  deskripsi?: string;
  linkTerkait?: string;
  priority?: "High" | "Medium" | "Low";
}
```

## 🖼️ Visual Flow

### Main UAT Page
```
Antrian UAT (User Acceptance Test)

[Statistics Cards]

Filters:
  Proyek: [Sistem Informasi Akademik ▼] *
  Status: [Semua Status ▼]

Tree View:
┌────────────────────────────────────────────────────┐
│ ▸ Authentication Module              (2 items)    │
│ ▾ Dashboard Module                   (2 items)    │
│   • Analytics                        (1 item)     │ ← Click to test
│     (Click to test module)                        │
│   • Reports                          (1 item)     │ ← Click to test
│     (Click to test module)                        │
│ • Payment Module                     (1 item)     │ ← Click to test
│   (Click to test module)                          │
└────────────────────────────────────────────────────┘
```

### Module Detail Page
```
┌─────────────────────────────────────────────────────────┐
│ Login Features [AUTH-LOGIN]                [Pending]    │
│ Sistem Informasi Akademik • 2 Tasks                    │
└─────────────────────────────────────────────────────────┘

LEFT COLUMN:                      RIGHT COLUMN:
┌──────────────────────────┐     ┌──────────────────────┐
│ Tasks dalam Module (2)   │     │ Status Module        │
│ - UAT-001: Login SSO     │     │   [Pending]          │
│ - UAT-005: OAuth         │     │                      │
├──────────────────────────┤     ├──────────────────────┤
│ Module Requirements      │     │ Approval Module      │
│ (Full requirements text) │     │ [Approve Module]     │
├──────────────────────────┤     │ [Reject Module]      │
│ Acceptance Criteria      │     ├──────────────────────┤
│ (Criteria checklist)     │     │ Activity Log         │
├──────────────────────────┤     │ (Timeline)           │
│ Lampiran Module          │     └──────────────────────┘
│ (Files)                  │
└──────────────────────────┘
```

### Approval Modal (Pass)
```
┌─────────────────────────────────────────────────┐
│ ✓ Approve Module (Pass)                         │
│ Module ini telah memenuhi semua requirements   │
│                                                 │
│ Catatan (optional):                             │
│ ┌─────────────────────────────────────────┐   │
│ │ Tambahkan catatan approval...           │   │
│ └─────────────────────────────────────────┘   │
│                                                 │
│ Lampirkan File:                                 │
│ ┌─────────────────────────────────────────┐   │
│ │ ☁️ Click to upload or drag and drop     │   │
│ │ PNG, JPG, PDF, DOC, XLS, MP4 up to 10MB│   │
│ └─────────────────────────────────────────┘   │
│                                                 │
│ 📎 test_report.pdf              [X]            │
│ 📎 approval_certificate.pdf     [X]            │
│                                                 │
│ [Batal]  [Submit Approval]                     │
└─────────────────────────────────────────────────┘
```

### Rejection Modal (Fail)
```
┌─────────────────────────────────────────────────┐
│ ✖ Reject Module (Fail)                          │
│ Berikan detail masalah yang ditemukan          │
│                                                 │
│ Catatan *:                                      │
│ ┌─────────────────────────────────────────┐   │
│ │ Jelaskan masalah yang ditemukan,        │   │
│ │ task mana yang bermasalah, dan apa      │   │
│ │ yang perlu diperbaiki...                │   │
│ └─────────────────────────────────────────┘   │
│                                                 │
│ Lampirkan File (Screenshot / Video / Document):│
│ ┌─────────────────────────────────────────┐   │
│ │ ☁️ Click to upload or drag and drop     │   │
│ │ PNG, JPG, PDF, DOC, XLS, MP4 up to 10MB│   │
│ └─────────────────────────────────────────┘   │
│                                                 │
│ 📎 bug_screenshot.png           [X]            │
│ 📎 error_video.mp4              [X]            │
│ 📎 bug_report.pdf               [X]            │
│                                                 │
│ [Batal]  [Submit Rejection]                    │
└─────────────────────────────────────────────────┘
```

## 🎨 Features

### Module Detail Page
✅ **Module Information**
- Module name and code
- Project name
- Total tasks count
- Current status

✅ **Tasks List**
- All tasks in the module
- Task code, name, description
- Developer and completion date
- Priority badges
- Test links for each task

✅ **Module Requirements**
- Complete requirements documentation
- Functional and non-functional requirements
- Formatted text display

✅ **Acceptance Criteria**
- Checklist of criteria
- Clear pass/fail conditions
- Quality standards

✅ **Module Attachments**
- Specifications
- Test cases
- Documentation
- Download capability

✅ **Approval Actions**
- Approve Module (Pass) button
- Reject Module (Fail) button
- Only shown for Pending modules

✅ **Activity Timeline**
- All module activities
- Status changes
- Comments and attachments
- User attribution

### File Upload System
✅ **For Pass (Approval)**
- Test reports
- Approval certificates
- Sign-off documents
- Quality assurance docs

✅ **For Fail (Rejection)**
- Bug screenshots
- Error videos
- Bug reports
- Reproduction steps

✅ **Features**
- Drag and drop support
- Multiple file upload
- File preview list
- Remove files before submit
- File size display
- Supported formats: Images, Videos, PDF, DOC, XLS

## 🔄 User Workflow

### Testing a Module
1. **Select Project** on main UAT page
2. **Navigate Tree** to find module
3. **Click Module Row** (leaf modules with items)
4. **Review Module Details**:
   - Check all tasks
   - Read requirements
   - Review acceptance criteria
   - Check attachments
5. **Test All Tasks** in the module
6. **Make Decision**:
   - Click "Approve Module" if all pass
   - Click "Reject Module" if any fail
7. **Provide Feedback**:
   - Add comments (required for fail)
   - Upload files (optional for pass, recommended for fail)
   - Submit
8. **Status Updates**:
   - Module status changes
   - Activity log updated
   - Tester recorded

## 📝 API Integration Notes

### Endpoints Needed
```typescript
// Get module for UAT testing
GET /api/uat/module/{moduleId}
Response: UATModule

// Submit module approval/rejection
POST /api/uat/module/{moduleId}/feedback
Body: {
  action: "pass" | "fail",
  comment?: string,
  files?: File[]
}

// Upload files
POST /api/uat/module/{moduleId}/upload
Body: FormData with files
```

### Database Schema
```sql
-- UAT Modules table
CREATE TABLE uat_modules (
  id INT PRIMARY KEY,
  module_id INT,
  project_id INT,
  status VARCHAR(20),
  requirement TEXT,
  acceptance_criteria TEXT,
  tested_by INT,
  tested_at TIMESTAMP,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);

-- UAT Module Feedback
CREATE TABLE uat_module_feedback (
  id INT PRIMARY KEY,
  uat_module_id INT,
  action VARCHAR(10),
  comment TEXT,
  user_id INT,
  created_at TIMESTAMP
);

-- UAT Module Attachments
CREATE TABLE uat_module_attachments (
  id INT PRIMARY KEY,
  uat_module_id INT,
  file_name VARCHAR(255),
  file_path VARCHAR(500),
  file_type VARCHAR(100),
  uploaded_by INT,
  uploaded_at TIMESTAMP
);
```

## ✨ Benefits

### Efficiency
- ✅ Test entire module at once
- ✅ Fewer approval steps
- ✅ Faster validation process

### Quality
- ✅ Tests module integration
- ✅ Ensures all tasks work together
- ✅ Comprehensive acceptance criteria

### Documentation
- ✅ File attachments for evidence
- ✅ Complete activity history
- ✅ Clear approval trail

### User Experience
- ✅ Simpler workflow
- ✅ Clear module boundaries
- ✅ Easy navigation

## 🔧 Technical Details

### File Upload Implementation
```typescript
const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
  if (e.target.files) {
    setFeedbackFiles(Array.from(e.target.files));
  }
};

const removeFile = (index: number) => {
  setFeedbackFiles(feedbackFiles.filter((_, i) => i !== index));
};
```

### Module Click Handler
```typescript
const handleModuleClick = (moduleId: number) => {
  router.push(`/uat/module/${moduleId}`);
};
```

### Approval Submission
```typescript
const handleFeedbackSubmit = () => {
  // Create FormData for file upload
  const formData = new FormData();
  formData.append('action', feedbackAction);
  formData.append('comment', feedbackComment);
  feedbackFiles.forEach((file) => {
    formData.append('files[]', file);
  });
  
  // Submit to API
  // POST /api/uat/module/{id}/feedback
};
```

## 📂 Files Created/Modified

### New Files
- `src/app/(admin)/uat/module/[id]/page.tsx` - Module detail page

### Modified Files
- `src/app/(admin)/uat/page.tsx` - Added module click handler, updated tree navigation

### Documentation
- `UAT_MODULE_LEVEL_UPDATE.md` - This file

## 🎯 Summary

The UAT system now operates at the **module level** instead of task level:

✅ **Module-Level Testing** - Test entire modules as units  
✅ **File Upload** - Attach files for both pass and fail  
✅ **Clickable Modules** - Click leaf modules to test  
✅ **Comprehensive View** - See all tasks, requirements, and criteria  
✅ **Efficient Workflow** - Single approval for entire module  
✅ **Better Documentation** - File attachments and activity log  

---

**Updated**: 2025-10-01  
**Version**: 3.0.0 (Module-Level Testing)  
**Status**: ✅ Complete
