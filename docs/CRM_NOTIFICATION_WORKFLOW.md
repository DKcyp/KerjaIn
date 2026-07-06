# CRM Notification Workflow

## Overview

When a PM approves a task that has a CRM ticket ID (`idCrm`), they can send a notification to the CRM system with completion notes and an optional screenshot/proof image. This triggers the PIC review process in the CRM system.

## Workflow

### 1. Task Completion by Developer
- Developer completes work on task
- Developer sends task for review (status: `MENUNGGU_REVIEW_PM`)
- PM receives WhatsApp notification

### 2. PM Review
- PM reviews the completed task
- If task has `idCrm` field, PM can approve and send to CRM for PIC review

### 3. CRM Notification Modal
When PM approves a task with `idCrm`:
- Modal opens automatically
- PM enters completion notes (required)
- PM can upload screenshot/proof image (optional)
- PM clicks "Send to CRM"

### 4. CRM Integration
System sends multipart/form-data to CRM:
```
POST {CRM_API_URL}/api/tickets/{ticketId}/request-pic-review
```

**Payload:**
- `logbookTaskId`: Task code (e.g., "PRJ-001-1")
- `completedBy`: Developer name and username
- `completionNotes`: PM's notes about completion
- `apiKey`: CRM API key from environment
- `image`: Optional image file

**Expected Response:**
```json
{
  "success": true,
  "message": "PIC review requested successfully",
  "ticket": {
    "id": "cm123abc456",
    "ticketNumber": "TKT-2024-001",
    "status": "WAITING_FOR_ASSIGNEE",
    "dispositionStatus": "NEEDS_PIC_APPROVAL",
    "assignedTo": null,
    "attachmentId": "attachment_id_here"
  }
}
```

## Technical Implementation

### Backend API

**Endpoint:** `POST /api/tasklist/[id]/notify-crm`

**Authentication:** PM or SUPER_ADMIN only

**Request:** multipart/form-data
- `completionNotes` (required): Text description
- `image` (optional): Image file (max 5MB)

**Response:**
```json
{
  "success": true,
  "message": "CRM notification sent successfully",
  "ticket": { ... }
}
```

### Frontend Component

**Component:** `CRMNotificationModal`

**Props:**
- `isOpen`: boolean
- `onClose`: () => void
- `taskId`: number
- `taskCode`: string
- `onSuccess`: () => void (optional)

**Features:**
- Text area for completion notes
- Image upload with preview
- File validation (type and size)
- Loading states
- Error handling

### Environment Configuration

Required environment variables:
```env
CRM_API_URL=http://192.168.1.109:6969
CRM_API_KEY=your-api-key-here
```

## Integration Points

### 1. Task Status Change
- When PM changes status from `MENUNGGU_REVIEW_PM` to `SELESAI`
- If task has `idCrm`, show CRM notification modal
- Legacy CRM notification still sent (for backward compatibility)

### 2. Database Fields
Task must have `idCrm` field populated:
```sql
SELECT id, kode, idCrm FROM tasklist WHERE idCrm IS NOT NULL;
```

### 3. CRM Service
**File:** `src/lib/crmNotificationService.ts`

**Function:** `notifyCRMTaskCompleted()`
- Builds multipart/form-data payload
- Sends to CRM API
- Handles timeout (30 seconds)
- Returns success/error response

## Error Handling

### Validation Errors
- Missing completion notes: "Please enter completion notes"
- Invalid image type: "Please select a valid image file"
- Image too large: "Image size must be less than 5MB"

### API Errors
- Missing CRM_API_URL: "CRM_API_URL not configured"
- Missing CRM_API_KEY: "CRM_API_KEY not configured"
- CRM API error: Shows error message from CRM
- Network timeout: "Request timeout"

### Non-Blocking
- CRM notification failures don't prevent task approval
- Errors are logged but don't break the workflow
- PM can retry sending notification if needed

## Usage Example

### Frontend Integration

```typescript
import { CRMNotificationModal } from '@/components/tasklist/CRMNotificationModal';

function TaskDetailPage() {
  const [showCRMModal, setShowCRMModal] = useState(false);
  
  const handleApproveTask = async () => {
    // Approve task first
    await updateTaskStatus(taskId, 'SELESAI');
    
    // If task has CRM ID, show modal
    if (task.idCrm) {
      setShowCRMModal(true);
    }
  };
  
  return (
    <>
      <button onClick={handleApproveTask}>
        Approve Task
      </button>
      
      <CRMNotificationModal
        isOpen={showCRMModal}
        onClose={() => setShowCRMModal(false)}
        taskId={task.id}
        taskCode={task.kode}
        onSuccess={() => {
          // Refresh task data
          refetchTask();
        }}
      />
    </>
  );
}
```

### API Integration

```typescript
// Send CRM notification
const formData = new FormData();
formData.append('completionNotes', 'All features implemented and tested');
formData.append('image', imageFile);

const response = await fetch(`/api/tasklist/${taskId}/notify-crm`, {
  method: 'POST',
  body: formData,
});

const data = await response.json();
console.log('CRM Ticket:', data.ticket);
```

## Testing

### Manual Testing
1. Create a task with `idCrm` field
2. Complete the task as developer
3. Approve as PM
4. Fill in completion notes
5. Upload screenshot
6. Click "Send to CRM"
7. Verify CRM receives notification

### Console Logs
```
[CRM Notification] Sending notification to CRM: {
  endpoint: 'http://192.168.1.109:6969/api/tickets/cm123/request-pic-review',
  ticketId: 'cm123',
  logbookTaskId: 'PRJ-001-1',
  completedBy: 'John Doe (johndoe)',
  hasImage: true
}

[CRM Notification] Successfully notified CRM: {
  ticketId: 'cm123',
  ticketNumber: 'TKT-2024-001',
  status: 'WAITING_FOR_ASSIGNEE',
  dispositionStatus: 'NEEDS_PIC_APPROVAL',
  attachmentId: 'att_123'
}
```

## Security

### Authentication
- Only PM and SUPER_ADMIN can send CRM notifications
- API key authentication with CRM system
- Session-based authentication for logbook users

### File Upload
- Image type validation (image/*)
- File size limit (5MB)
- Secure file handling with Buffer

### API Communication
- 30-second timeout protection
- Error logging without exposing sensitive data
- Non-blocking error handling

## Future Enhancements

1. **Retry Mechanism**: Allow PM to retry failed notifications
2. **Notification History**: Track all CRM notifications sent
3. **Bulk Notifications**: Send multiple tasks to CRM at once
4. **Status Tracking**: Show CRM ticket status in logbook
5. **Webhook Integration**: Receive updates from CRM when PIC reviews
