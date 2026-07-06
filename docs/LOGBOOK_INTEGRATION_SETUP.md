# Logbook Integration Setup Guide

## Overview

This guide walks you through setting up the Logbook to CRM integration that automatically triggers PIC review requests when tasks are completed in the Logbook system.

## Prerequisites

- CRM application deployed and running
- Access to `.env` configuration file
- Logbook system administrator contact

## Step 1: Generate API Key

Generate a secure API key for the Logbook system to authenticate with the CRM:

### Using Node.js

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### Using OpenSSL

```bash
openssl rand -hex 32
```

**Example output:**
```
a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6a7b8c9d0e1f2
```

## Step 2: Configure CRM Environment

Add the generated API key to your `.env` file:

```bash
# Logbook Integration API Key (for incoming requests from Logbook)
LOGBOOK_API_KEY_INCOMING=a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6a7b8c9d0e1f2
```

**Important:**
- Never commit this key to version control
- Keep it secure and share only with authorized personnel
- Rotate the key periodically for security

## Step 3: Restart CRM Application

After updating the `.env` file, restart your CRM application:

```bash
# Development
npm run dev

# Production (using PM2)
pm2 restart crm-app

# Production (using systemd)
sudo systemctl restart crm-app
```

## Step 4: Test the API Endpoint

### Using cURL

```bash
# Replace with your actual values
TICKET_ID="your-ticket-id"
API_KEY="your-generated-api-key"
BASE_URL="https://your-crm-domain.com"

curl -X POST "$BASE_URL/api/tickets/$TICKET_ID/request-pic-review" \
  -H "Content-Type: application/json" \
  -d "{
    \"logbookTaskId\": \"TEST-001\",
    \"completedBy\": \"Test User\",
    \"completionNotes\": \"Test completion\",
    \"apiKey\": \"$API_KEY\"
  }"
```

### Using Postman

1. Import the Postman collection: `LOGBOOK_PIC_REVIEW_API.postman_collection.json`
2. Update collection variables:
   - `base_url`: Your CRM URL (e.g., `https://crm.yourcompany.com`)
   - `api_key`: Your generated API key
   - `ticket_id`: A valid test ticket ID
3. Run the "Request PIC Review" request
4. Verify you get a 200 OK response

**Expected Success Response:**
```json
{
  "success": true,
  "message": "PIC review requested successfully",
  "ticket": {
    "id": "cm123abc456",
    "ticketNumber": "TKT-2024-001",
    "status": "OPEN",
    "dispositionStatus": "NEEDS_PIC_APPROVAL",
    "assignedTo": {
      "id": "user123",
      "name": "Bismo",
      "email": "bismo@exp"
    }
  }
}
```

## Step 5: Share Integration Details with Logbook Team

Provide the following information to the Logbook system administrators:

### Integration Endpoint

```
POST https://your-crm-domain.com/api/tickets/{ticketId}/request-pic-review
```

### Authentication

- **Method**: API Key in request body
- **API Key**: `[Share the generated key securely]`

### Request Format

```json
{
  "logbookTaskId": "TASK-2024-001",
  "completedBy": "Programmer Name",
  "completionNotes": "Optional completion notes",
  "apiKey": "your-api-key-here"
}
```

### Required Fields

- `logbookTaskId` (string, required): ID of the completed task in Logbook
- `apiKey` (string, required): Authentication key

### Optional Fields

- `completedBy` (string): Name of person who completed the task
- `completionNotes` (string): Additional notes about completion

### Documentation

Share these files with the Logbook team:
- `docs/LOGBOOK_PIC_REVIEW_API.md` - Complete API documentation
- `LOGBOOK_PIC_REVIEW_API.postman_collection.json` - Postman collection for testing

## Step 6: Configure Logbook System

The Logbook team should configure their system to:

1. **Trigger on Task Completion**: When a task is marked as complete
2. **Extract Ticket ID**: Get the CRM ticket ID from the task metadata
3. **Call CRM API**: Make POST request to the integration endpoint
4. **Handle Response**: Log success/failure and handle errors appropriately

### Example Logbook Configuration

```javascript
// Pseudo-code for Logbook system
async function onTaskComplete(task) {
  const ticketId = task.metadata.crmTicketId;
  
  if (!ticketId) {
    console.log('No CRM ticket linked to this task');
    return;
  }
  
  try {
    const response = await fetch(
      `https://crm.yourcompany.com/api/tickets/${ticketId}/request-pic-review`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          logbookTaskId: task.id,
          completedBy: task.completedBy.name,
          completionNotes: task.completionNotes,
          apiKey: process.env.CRM_API_KEY,
        }),
      }
    );
    
    const result = await response.json();
    
    if (result.success) {
      console.log('PIC review requested successfully');
    } else {
      console.error('Failed to request PIC review:', result.error);
    }
  } catch (error) {
    console.error('Error calling CRM API:', error);
  }
}
```

## Step 7: Monitor and Verify

### Check CRM Logs

Monitor the CRM application logs for integration activity:

```bash
# Using PM2
pm2 logs crm-app --lines 100

# Using journalctl (systemd)
sudo journalctl -u crm-app -f

# Docker
docker logs -f crm-container
```

Look for log entries prefixed with `[Request PIC Review]`:

```
[Request PIC Review] Ticket updated successfully: {
  ticketId: 'cm123abc456',
  logbookTaskId: 'TASK-2024-001',
  status: 'OPEN',
  dispositionStatus: 'NEEDS_PIC_APPROVAL'
}
```

### Verify in CRM UI

1. Log in as a PIC user
2. Navigate to the Tickets page
3. Look for tickets with disposition status "NEEDS_PIC_APPROVAL"
4. Open a ticket and verify:
   - Status is "OPEN"
   - Disposition status is "NEEDS_PIC_APPROVAL"
   - System comment shows Logbook task completion details
   - Assignee is still the Internal Support user

## Troubleshooting

### Error: "Unauthorized: Invalid API key"

**Cause**: API key mismatch between Logbook and CRM

**Solution**:
1. Verify the API key in CRM `.env` file
2. Confirm Logbook is using the same key
3. Check for extra spaces or newlines in the key
4. Regenerate and update the key if needed

### Error: "Ticket not found"

**Cause**: Invalid ticket ID or ticket doesn't exist

**Solution**:
1. Verify the ticket ID is correct
2. Check if the ticket exists in the CRM database
3. Ensure Logbook is using the correct CRM ticket ID

### Error: "Cannot request PIC review for ticket with status: CLOSED"

**Cause**: Ticket is in an invalid state

**Solution**:
1. Only tickets with status `ASSIGNED` or `IN_PROGRESS` can request PIC review
2. Check the ticket status in CRM
3. Ensure Logbook only calls the API for active tickets

### No System Comment Created

**Cause**: Comment creation failed or user ID invalid

**Solution**:
1. Check CRM logs for errors
2. Verify the ticket has a valid assignee or customer
3. Check database permissions

## Security Best Practices

1. **Use HTTPS**: Always use HTTPS in production
2. **Rotate Keys**: Rotate the API key periodically (e.g., every 6 months)
3. **Monitor Usage**: Set up alerts for unusual API activity
4. **Rate Limiting**: Consider implementing rate limiting to prevent abuse
5. **IP Whitelisting**: Optionally restrict access to known Logbook server IPs
6. **Audit Logging**: Keep logs of all API calls for security audits

## Support

For issues or questions:

1. **Check Documentation**: Review `docs/LOGBOOK_PIC_REVIEW_API.md`
2. **Check Logs**: Review CRM application logs for errors
3. **Test with Postman**: Use the provided collection to test manually
4. **Contact Support**: Reach out to the CRM development team

## Changelog

### Version 1.0.0 (2025-01-09)
- Initial integration setup
- API key authentication
- Automatic PIC review triggering
- System comment logging
