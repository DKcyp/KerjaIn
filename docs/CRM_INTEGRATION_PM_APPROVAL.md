# CRM Integration - PM Approval Flow

## Overview

When a PM approves a task that has a `ticket_id` (from CRM), the system now:
1. Shows a modal for the PM to enter completion notes and upload a screenshot
2. Sends this information back to the CRM system
3. Updates the ticket status in CRM to "Send to PIC" for PIC review

## Database Fields

The system supports both new and legacy CRM ticket ID fields:
- **New fields**: `ticket_id` or `ticketId` (recommended)
- **Legacy fields**: `idCrm` or `id_crm` (for backward compatibility)

## Complete Flow

### 1. Task Creation from CRM
When a disposition is created in CRM and sent to Logbook:
```
POST /api/external/tasklist
Body: {
  "projectCode": "PRJ001",
  "moduleCode": "MOD001", 
  "assigneeUsername": "john.doe",
  "scheduleAt": "2025-11-11T10:00:00Z",
  "description": "Fix login bug",
  "ticketId": "TICKET-123",  // CRM ticket ID
  "ticketUrl": "https://crm.example.com/tickets/123"
}
```

The `ticketId` is saved to the database in the `ticket_id` column.

### 2. Developer Works on Task
- Developer starts task: Status → `SEDANG_DIPROSES_USER`
- Developer completes work and sends for review: Status → `MENUNGGU_REVIEW_PM`

### 3. PM Approval (Key Part)

When PM clicks "Approve" on a task with `ticket_id`:

#### Frontend (tasklist/page.tsx)
```typescript
// Check if task has CRM ticket ID
const hasCrmTicket = !!(t.ticketId || t.ticket_id || t.idCrm);

if (prev === 'MENUNGGU_REVIEW_PM' && next === 'SELESAI' && hasCrmTicket) {
  // Show CRM notification modal
  setCrmModalTask({ ...t, status: next });
  setCrmModalOpen(true);
}
```

#### CRM Notification Modal (CRMNotificationModal.tsx)
Modal appears with:
- **Completion Notes** (required): Text area for PM to describe what was completed
- **Proof/Screenshot** (optional): Image upload for visual proof
- **Send to CRM** button

#### API Call
```typescript
POST /api/tasklist/[id]/notify-crm
Content-Type: multipart/form-data

Fields:
- completionNotes: "Fixed the login bug. Users can now login successfully."
- image: [File object] (optional)
```

#### Backend Processing (notify-crm/route.ts)
```typescript
1. Validate PM authorization
2. Get task details and ticket ID
3. Prepare multipart form data
4. Call CRM notification service
5. Return success/error response
```

#### CRM Notification Service (crmNotificationService.ts)
```typescript
POST {CRM_API_URL}/api/tickets/{ticketId}/request-pic-review
Content-Type: multipart/form-data

Fields:
- logbookTaskId: "PRJ001-1.1-1"
- completedBy: "John Doe (john.doe)"
- completionNotes: "Fixed the login bug..."
- image: [Binary image data]
- apiKey: [CRM_API_KEY]
```

### 4. CRM Response
CRM system receives the notification and:
- Updates ticket disposition status to "Send to PIC"
- Attaches the image (if provided)
- Notifies the PIC for review
- Returns response:
```json
{
  "success": true,
  "message": "Ticket updated successfully",
  "ticket": {
    "id": "123",
    "ticketNumber": "TICKET-123",
    "status": "Open",
    "dispositionStatus": "Send to PIC",
    "assignedTo": "pic.user",
    "attachmentId": "att_456"
  }
}
```

## Environment Variables Required

### Logbook (.env)
```bash
# CRM Integration
CRM_API_URL=https://crm.example.com
CRM_API_KEY=your-secret-api-key-here
EXTERNAL_API_KEY=logbook-api-key-for-crm-to-call
```

### CRM (.env)
```bash
# Logbook Integration
LOGBOOK_API_URL=https://logbook.example.com
LOGBOOK_API_KEY=your-secret-api-key-here
```

## Key Files Modified

### 1. `/logbook/src/lib/crmNotificationService.ts`
- Added `getTaskTicketId()` helper function
- Updated `shouldNotifyCRM()` to check new `ticket_id` field
- Supports both new and legacy field names

### 2. `/logbook/src/app/api/tasklist/[id]/notify-crm/route.ts`
- Uses `getTaskTicketId()` to get ticket ID from any field
- Validates ticket ID exists before sending notification

### 3. `/logbook/src/app/(admin)/tasklist/page.tsx`
- Updated TaskItem type to include `ticketId` and `ticket_id` fields
- Updated modal trigger logic to check all ticket ID fields
- Shows modal when PM approves task with any CRM ticket ID

### 4. `/logbook/src/app/api/external/tasklist/route.ts`
- Increased transaction timeout from 5s to 15s
- Prevents timeout errors during file uploads and complex operations

## Testing the Flow

### 1. Create Task from CRM
```bash
curl -X POST http://localhost:3000/api/external/tasklist \
  -H "X-API-Key: your-api-key" \
  -H "Content-Type: application/json" \
  -d '{
    "projectCode": "TEST",
    "moduleCode": "1.1",
    "assigneeUsername": "developer1",
    "scheduleAt": "2025-11-12T09:00:00Z",
    "description": "Test task from CRM",
    "ticketId": "TEST-001",
    "ticketUrl": "https://crm.example.com/tickets/TEST-001"
  }'
```

### 2. Developer Workflow
- Login as developer
- Start the task
- Complete work
- Send for review (status → MENUNGGU_REVIEW_PM)

### 3. PM Approval
- Login as PM
- Click "Approve" on the task
- **Modal should appear** asking for completion notes and screenshot
- Enter notes: "Task completed successfully. Login bug fixed."
- Upload screenshot (optional)
- Click "Send to CRM"
- Check CRM system - ticket should be updated to "Send to PIC"

## Error Handling

### Common Errors

1. **"Task does not have CRM ticket ID"**
   - Task was not created from CRM
   - No `ticket_id`, `ticketId`, or `idCrm` field present

2. **"CRM_API_URL not configured"**
   - Missing environment variable in Logbook
   - Add `CRM_API_URL` to `.env` file

3. **"CRM API returned status 401"**
   - Invalid API key
   - Check `CRM_API_KEY` in Logbook `.env`

4. **"Request timeout"**
   - CRM system not responding
   - Network connectivity issues
   - Timeout set to 30 seconds

## Future Enhancements

1. **Bidirectional Status Sync**
   - When PIC approves/rejects in CRM, update Logbook task

2. **Attachment Management**
   - Store CRM attachment IDs in Logbook
   - Allow viewing CRM attachments from Logbook

3. **Notification History**
   - Log all CRM notifications sent
   - Show notification status in task details

4. **Retry Mechanism**
   - Auto-retry failed CRM notifications
   - Queue system for offline scenarios

## Support

For issues or questions:
- Check logs: `console.log('[CRM Integration]', ...)`
- Review error messages in modal
- Verify environment variables are set correctly
- Test CRM API endpoint manually with curl/Postman
