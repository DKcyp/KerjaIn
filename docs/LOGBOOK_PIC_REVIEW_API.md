# Logbook to PIC Review Integration API

## Overview

This API endpoint allows the external Logbook system to automatically trigger a PIC review request when a task is completed. This replaces the manual "Request PIC Approval" flow that was previously done by Internal Support users.

## Endpoint

```
POST /api/tickets/{ticketId}/request-pic-review
```

## Authentication

This endpoint requires an API key for authentication. The API key should be included in the request body.

**Environment Variable**: `LOGBOOK_API_KEY`

## Request

### URL Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `ticketId` | string | Yes | The ID of the ticket to request PIC review for |

### Request Body

```json
{
  "logbookTaskId": "string",
  "completedBy": "string",
  "completionNotes": "string",
  "apiKey": "string"
}
```

#### Body Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `logbookTaskId` | string | Yes | The ID of the completed task in the Logbook system |
| `completedBy` | string | No | Name or identifier of the person who completed the task |
| `completionNotes` | string | No | Additional notes about the task completion |
| `apiKey` | string | Yes | API key for authentication |

### Example Request

```bash
curl -X POST https://your-crm-domain.com/api/tickets/cm123abc456/request-pic-review \
  -H "Content-Type: application/json" \
  -d '{
    "logbookTaskId": "TASK-2024-001",
    "completedBy": "Tri Muhammad AJI (aji@exp)",
    "completionNotes": "All development work completed. Ready for PIC review.",
    "apiKey": "your-secret-api-key"
  }'
```

## Response

### Success Response (200 OK)

```json
{
  "success": true,
  "message": "PIC review requested successfully",
  "ticket": {
    "id": "cm123abc456",
    "ticketNumber": "TKT-2024-001",
    "status": "WAITING_FOR_CUSTOMER",
    "dispositionStatus": "NEEDS_PIC_APPROVAL",
    "assignedTo": {
      "id": "user123",
      "name": "Bismo",
      "email": "bismo@exp"
    }
  }
}
```

### Error Responses

#### 401 Unauthorized - Invalid API Key

```json
{
  "success": false,
  "error": "Unauthorized: Invalid API key"
}
```

#### 400 Bad Request - Missing Required Fields

```json
{
  "success": false,
  "error": "logbookTaskId is required"
}
```

#### 400 Bad Request - Invalid Ticket Status

```json
{
  "success": false,
  "error": "Cannot request PIC review for ticket with status: CLOSED. Valid statuses are: ASSIGNED, IN_PROGRESS"
}
```

#### 404 Not Found - Ticket Not Found

```json
{
  "success": false,
  "error": "Ticket not found"
}
```

#### 500 Internal Server Error

```json
{
  "success": false,
  "error": "Failed to request PIC review"
}
```

## Workflow

### Before (Manual Flow)

1. PIC assigns ticket to Internal Support (bismo@exp)
2. Internal Support works on ticket
3. **Internal Support manually clicks "Request PIC Approval"**
4. PIC reviews and approves/rejects

### After (Automated Flow)

1. PIC assigns ticket to Internal Support (bismo@exp)
2. Internal Support works on ticket
3. Logbook system creates task for programmer
4. Programmer completes task in Logbook
5. **Logbook system automatically calls this API**
6. Ticket status updated to `NEEDS_PIC_APPROVAL`
7. PIC reviews and approves/rejects

## Ticket Status Changes

When this API is called, the following changes occur:

| Field | Before | After |
|-------|--------|-------|
| `status` | `ASSIGNED` or `IN_PROGRESS` | `WAITING_FOR_CUSTOMER` |
| `dispositionStatus` | Any status | `NEEDS_PIC_APPROVAL` |
| `dispositionNotes` | Previous notes | Task completion details |
| `dispositionAt` | Previous timestamp | Current timestamp |
| `assignedToId` | Unchanged | Unchanged (keeps Internal Support assignee) |

## System Comment

A system comment is automatically created on the ticket with the following format:

```
🤖 **Logbook System**: Task completed and PIC review requested.

**Logbook Task ID**: TASK-2024-001
**Completed By**: Tri Muhammad AJI (aji@exp)
**Notes**: All development work completed. Ready for PIC review.
```

This comment is marked as internal and visible to PIC and Internal Support users.

## Valid Ticket Statuses

The API only accepts tickets with the following statuses:
- `ASSIGNED` - Ticket is assigned to Internal Support
- `IN_PROGRESS` - Ticket is being worked on

Tickets with other statuses (e.g., `CLOSED`, `RESOLVED`, `OPEN`) will be rejected.

## Security Considerations

1. **API Key Authentication**: The endpoint requires a valid API key to prevent unauthorized access
2. **Environment Variable**: Store the API key in `.env` file as `LOGBOOK_API_KEY`
3. **HTTPS Only**: Always use HTTPS in production to protect the API key in transit
4. **Rate Limiting**: Consider implementing rate limiting to prevent abuse
5. **IP Whitelisting**: Optionally restrict access to known Logbook system IP addresses

## Setup Instructions

### 1. Configure API Key

Add to your `.env` file:

```bash
LOGBOOK_API_KEY=your-secret-api-key-here
```

**Generate a secure API key:**
```bash
# Using Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Or using OpenSSL
openssl rand -hex 32
```

### 2. Share API Key with Logbook Team

Securely share the API key with the Logbook system administrators. **Never commit the API key to version control.**

### 3. Configure Logbook System

The Logbook system should be configured to call this endpoint when a task is marked as complete. Provide them with:
- API endpoint URL
- API key
- This documentation

## Testing

### Test with cURL

```bash
# Replace with your actual values
TICKET_ID="cm123abc456"
API_KEY="your-secret-api-key"
BASE_URL="http://localhost:3000"

curl -X POST "$BASE_URL/api/tickets/$TICKET_ID/request-pic-review" \
  -H "Content-Type: application/json" \
  -d "{
    \"logbookTaskId\": \"TEST-TASK-001\",
    \"completedBy\": \"Test User\",
    \"completionNotes\": \"Test completion notes\",
    \"apiKey\": \"$API_KEY\"
  }"
```

### Test with Postman

Import the provided Postman collection (`LOGBOOK_PIC_REVIEW_API.postman_collection.json`) and update the environment variables:
- `base_url`: Your CRM base URL
- `api_key`: Your Logbook API key
- `ticket_id`: A valid ticket ID for testing

## Monitoring and Logging

All API calls are logged with the following information:
- Timestamp
- Ticket ID
- Logbook Task ID
- Success/Failure status
- Error messages (if any)

Check the server logs for entries prefixed with `[Request PIC Review]`.

## Support

For issues or questions:
1. Check the server logs for error details
2. Verify the API key is correct
3. Ensure the ticket exists and has a valid status
4. Contact the CRM development team

## Changelog

### Version 1.0.0 (2025-01-09)
- Initial release
- Basic API key authentication
- Automatic ticket status update
- System comment creation
- Error handling and validation
