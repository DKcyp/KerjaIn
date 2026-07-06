# EUT Approval System Implementation Summary

## Overview
Implemented a comprehensive EUT (End User Test) approval system with file upload capabilities. The system now supports only 2 statuses (Pending and Approved) with mandatory file uploads during approval.

## Key Changes Made

### 1. Database Schema Updates
**File**: `prisma/schema.prisma`

Added new fields to `EutTest` model:
- `uatFilePath` (String, optional): Stores path to single UAT file
- `userGuideFiles` (Json, default []): Stores array of user guide file paths

**Migration**: `prisma/migrations/20251004073900_add_eut_file_fields/migration.sql`

### 2. Status Simplification
- **Removed**: Reject functionality
- **Kept**: Only Pending and Approved statuses
- When approving, UAT file is **required**, user guide files are optional

### 3. Frontend Implementation

#### EUT Detail Page (`src/app/(admin)/eut/[id]/page.tsx`)

**New Features**:
- Approval modal with file upload interface
- UAT file upload (single file, required)
- User guide files upload (multiple files, optional)
- File preview and removal functionality
- Upload progress indicator
- Removed reject button - only approve action available

**File Upload UI**:
- Drag-and-drop style file input areas
- Visual feedback for selected files
- File type validation (PDF, DOC, DOCX, XLS, XLSX for UAT; PDF, DOC, DOCX for user guides)
- Remove file functionality for user guides

**Updated Interface**:
```typescript
interface EUTItem {
  id: number;
  namaFitur: string;
  kode: string;
  projectId: number;
  moduleId: number;
  testerId: number;
  testerName: string;
  testerEmail?: string;
  tanggalTest: string;
  status: EUTStatus; // "Pending" | "Approved"
  deskripsi?: string;
  approvedBy?: number;
  approvedByName?: string;
  approvedDate?: string;
  uatFilePath?: string;        // NEW
  userGuideFiles?: string[];   // NEW
  project?: {
    id: number;
    kodeProyek: string;
    namaProyek: string;
  };
}
```

### 4. Backend API Implementation

#### File Upload Endpoint (`src/app/api/eut/upload/route.ts`)

**New API**: `POST /api/eut/upload`

**Features**:
- Handles multipart/form-data file uploads
- Validates file types based on upload type (uat or userguide)
- Enforces single file limit for UAT uploads
- Generates unique filenames with timestamps
- Creates upload directories automatically
- Returns relative file paths for database storage

**Request Format**:
```typescript
FormData {
  files: File | File[]
  type: 'uat' | 'userguide'
}
```

**Response Format**:
```json
{
  "success": true,
  "files": ["/uploads/eut/uat/1234567890_filename.pdf"]
}
```

#### Update EUT Endpoint (`src/app/api/eut/[id]/route.ts`)

**Enhanced**: `PUT /api/eut/[id]`

**New Features**:
- Session-based authentication using custom auth system
- Automatic approval user tracking (approvedBy field)
- File path storage for UAT and user guide files
- Includes approver information in response

**Request Format**:
```json
{
  "status": "Approved",
  "uatFilePath": "/uploads/eut/uat/1234567890_file.pdf",
  "userGuideFiles": [
    "/uploads/eut/userguide/1234567891_guide1.pdf",
    "/uploads/eut/userguide/1234567892_guide2.pdf"
  ]
}
```

### 5. File Storage Structure

```
public/
  uploads/
    eut/
      uat/          # Single UAT files
        {timestamp}_{filename}
      userguide/    # Multiple user guide files
        {timestamp}_{filename}
```

## Approval Workflow

1. **User clicks "Approve EUT"** button on detail page
2. **Modal opens** with file upload interface
3. **User uploads**:
   - UAT File (required, single file)
   - User Guide Files (optional, multiple files)
4. **System validates** UAT file is provided
5. **Files are uploaded** to server via `/api/eut/upload`
6. **EUT status updated** to "Approved" with file paths
7. **Approver information** recorded (user ID, timestamp)
8. **Modal closes** and page refreshes with updated data

## API Endpoints Summary

### GET /api/eut
- Fetch all EUT items with optional filtering
- Supports: projectId, status, moduleId filters

### GET /api/eut/[id]
- Fetch specific EUT item with full details
- Includes: tester info, project info, file paths

### POST /api/eut
- Create new EUT item
- Status defaults to "Pending"

### PUT /api/eut/[id]
- Update EUT item (primarily for approval)
- Requires authentication
- Records approver and timestamp

### POST /api/eut/upload
- Upload files for EUT approval
- Supports: UAT files and user guide files
- Returns file paths for database storage

### DELETE /api/eut/[id]
- Delete EUT item
- Cascades to related data

## Security Features

1. **Authentication**: Session-based auth using custom auth system
2. **File Validation**: Type and size restrictions
3. **Unique Filenames**: Timestamp-based to prevent conflicts
4. **Path Sanitization**: Removes special characters from filenames
5. **Authorization**: Only authenticated users can approve

## Database Migration Required

Run these commands to apply changes:

```bash
# Generate Prisma client with new schema
npx prisma generate

# Apply database migration
npx prisma migrate dev
```

## File Type Support

**UAT Files**:
- PDF (.pdf)
- Word Documents (.doc, .docx)
- Excel Spreadsheets (.xls, .xlsx)

**User Guide Files**:
- PDF (.pdf)
- Word Documents (.doc, .docx)

## UI/UX Improvements

1. **Visual File Upload**: Drag-and-drop style interface
2. **File Preview**: Shows selected files before upload
3. **Progress Indicator**: Real-time upload status
4. **Error Handling**: Clear error messages for validation failures
5. **Responsive Design**: Works on all screen sizes
6. **Dark Mode Support**: Full dark mode compatibility

## Integration Points

- **EUT Dashboard** (`src/app/(admin)/eut/page.tsx`): Lists all EUT items
- **Module View**: Shows EUT items by module
- **Project Integration**: Links to project details
- **User Management**: Tracks testers and approvers

## Next Steps

1. Run database migration
2. Create upload directories (if not auto-created)
3. Test file upload functionality
4. Verify approval workflow
5. Check file access permissions

## Notes

- The Prisma client errors in the IDE will resolve after running `npx prisma generate`
- Upload directories are created automatically by the upload API
- File paths are stored as relative paths for portability
- The system uses the existing custom authentication (not NextAuth)
