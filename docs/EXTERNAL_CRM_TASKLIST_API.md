# External CRM Tasklist API

## Overview

The External CRM Tasklist API allows external CRM and ticketing systems to create tasklists in the logbook system. This API provides secure, authenticated access for creating tasks linked to CRM tickets with automatic notifications and activity logging.

## Base URL

```
http://localhost:3001/api/external/crm/tasklist
```

## Authentication

All requests require API key authentication via the `X-API-Key` header.

```bash
X-API-Key: your-crm-api-key
```

The API key is configured in the `CRM_API_KEY` environment variable.

## Endpoints

### POST /api/external/crm/tasklist

Creates a new tasklist linked to a CRM ticket.

#### Request Headers

```
X-API-Key: your-crm-api-key
Content-Type: application/json
```

#### Request Body

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `projectCode` | string | ✅ | Project code (e.g., "MMS-01") |
| `moduleCode` | string | ✅ | Module code within project (e.g., "01.01") |
| `assigneeUsername` | string | ✅ | Username of task assignee |
| `scheduleAt` | string | ✅ | ISO date string for task schedule |
| `description` | string | ❌ | Task description |
| `ticketId` | string | ❌ | CRM/Support ticket ID |
| `ticketUrl` | string | ❌ | URL to ticket in CRM system |
| `crmId` | string | ❌ | CRM record ID |
| `priority` | string | ❌ | Task priority: EASY, MEDIUM, HARD (default: MEDIUM) |
| `tasklistType` | string | ❌ | Task type: BLUEPRINT, DEVELOPMENT, MAINTENANCE (default: DEVELOPMENT) |

#### Example Request

```json
{
  "projectCode": "MMS-01",
  "moduleCode": "01.01",
  "assigneeUsername": "developer1",
  "scheduleAt": "2024-10-23T14:30:00.000Z",
  "description": "Fix login issue reported by customer",
  "ticketId": "TICKET-12345",
  "ticketUrl": "https://crm.example.com/tickets/12345",
  "crmId": "CRM-67890",
  "priority": "HIGH",
  "tasklistType": "DEVELOPMENT"
}
```

#### Success Response (201 Created)

```json
{
  "success": true,
  "message": "CRM tasklist created successfully",
  "data": {
    "taskId": 1234,
    "taskCode": "01.01 - 5",
    "projectCode": "MMS-01",
    "projectName": "Sistem Logbook",
    "moduleCode": "01.01",
    "assignee": {
      "username": "developer1",
      "name": "John Developer"
    },
    "scheduleAt": "2024-10-23T14:30:00.000Z",
    "status": "MENUNGGU_PROSES_USER",
    "crmId": "CRM-67890",
    "ticketId": "TICKET-12345",
    "ticketUrl": "https://crm.example.com/tickets/12345",
    "createdAt": "2024-10-22T13:15:30.000Z"
  }
}
```

#### Error Responses

**401 Unauthorized**
```json
{
  "error": "Unauthorized",
  "message": "Valid API key required in X-API-Key header"
}
```

**400 Bad Request - Missing Fields**
```json
{
  "error": "Missing required fields",
  "message": "projectCode, moduleCode, assigneeUsername, and scheduleAt are required",
  "required": ["projectCode", "moduleCode", "assigneeUsername", "scheduleAt"]
}
```

**400 Bad Request - Invalid Date**
```json
{
  "error": "Invalid date format",
  "message": "scheduleAt must be a valid ISO date string"
}
```

**404 Not Found - Project**
```json
{
  "error": "Project not found",
  "message": "Project with code 'INVALID-PROJECT' does not exist"
}
```

**404 Not Found - Module**
```json
{
  "error": "Module not found",
  "message": "Module with code 'INVALID-MODULE' not found in project 'MMS-01'"
}
```

**404 Not Found - User**
```json
{
  "error": "Assignee not found",
  "message": "User with username 'invalid-user' does not exist"
}
```

**403 Forbidden - Team Membership**
```json
{
  "error": "User not in project team",
  "message": "User 'developer1' is not assigned to project 'MMS-01'"
}
```

### GET /api/external/crm/tasklist

Returns API documentation and usage information.

#### Request Headers

```
X-API-Key: your-crm-api-key
```

#### Response (200 OK)

```json
{
  "message": "External CRM Tasklist API",
  "version": "1.0.0",
  "description": "API for creating tasklists linked to CRM tickets from external systems",
  "authentication": "API Key via X-API-Key header",
  "endpoints": {
    "POST /api/external/crm/tasklist": {
      "description": "Create a new tasklist linked to CRM ticket",
      "authentication": "Required"
    }
  },
  "features": [
    "API key authentication",
    "Project and module validation",
    "Team membership verification",
    "Automatic task code generation",
    "CRM/ticket linking",
    "WhatsApp notifications",
    "Activity logging"
  ]
}
```

## Features

### 🔐 Security
- **API Key Authentication**: Secure access control
- **Input Validation**: Comprehensive request validation
- **Team Verification**: Ensures assignees are project team members

### 🎫 CRM Integration
- **Ticket Linking**: Links tasks to CRM tickets with ID and URL
- **CRM Record Reference**: Stores CRM record ID for cross-referencing
- **Flexible Data**: Optional fields for various CRM systems

### 🔔 Notifications
- **WhatsApp Integration**: Automatic notifications to assignees
- **Professional Messages**: Formatted notifications with task details
- **Non-blocking**: Notification failures don't affect task creation

### 📊 Activity Tracking
- **Automatic Logging**: All operations logged in tasklist_log table
- **Audit Trail**: Complete history of task creation and changes
- **User Attribution**: Tracks who created tasks (external system)

### 🏗️ Task Management
- **Automatic Code Generation**: Sequential task codes per module
- **Status Management**: Proper task status initialization
- **Priority Levels**: Support for EASY/MEDIUM/HARD priorities
- **Task Types**: Support for BLUEPRINT/DEVELOPMENT/MAINTENANCE

## Usage Examples

### cURL

```bash
# Create CRM tasklist
curl -X POST \
  -H "X-API-Key: logbook-sync-api-key-2024" \
  -H "Content-Type: application/json" \
  -d '{
    "projectCode": "MMS-01",
    "moduleCode": "01",
    "assigneeUsername": "developer1",
    "scheduleAt": "2024-10-23T14:30:00.000Z",
    "description": "Fix critical bug from support ticket",
    "ticketId": "TICKET-12345",
    "ticketUrl": "https://support.company.com/tickets/12345",
    "priority": "HIGH"
  }' \
  http://localhost:3001/api/external/crm/tasklist
```

### JavaScript/Node.js

```javascript
const response = await fetch('http://localhost:3001/api/external/crm/tasklist', {
  method: 'POST',
  headers: {
    'X-API-Key': 'logbook-sync-api-key-2024',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    projectCode: 'MMS-01',
    moduleCode: '01',
    assigneeUsername: 'developer1',
    scheduleAt: '2024-10-23T14:30:00.000Z',
    description: 'Fix critical bug from support ticket',
    ticketId: 'TICKET-12345',
    ticketUrl: 'https://support.company.com/tickets/12345',
    priority: 'HIGH'
  })
});

const data = await response.json();
console.log('Task created:', data.data.taskCode);
```

### Python

```python
import requests
import json

url = 'http://localhost:3001/api/external/crm/tasklist'
headers = {
    'X-API-Key': 'logbook-sync-api-key-2024',
    'Content-Type': 'application/json'
}
data = {
    'projectCode': 'MMS-01',
    'moduleCode': '01',
    'assigneeUsername': 'developer1',
    'scheduleAt': '2024-10-23T14:30:00.000Z',
    'description': 'Fix critical bug from support ticket',
    'ticketId': 'TICKET-12345',
    'ticketUrl': 'https://support.company.com/tickets/12345',
    'priority': 'HIGH'
}

response = requests.post(url, headers=headers, json=data)
result = response.json()
print(f"Task created: {result['data']['taskCode']}")
```

### PHP

```php
<?php
$url = 'http://localhost:3001/api/external/crm/tasklist';
$data = [
    'projectCode' => 'MMS-01',
    'moduleCode' => '01',
    'assigneeUsername' => 'developer1',
    'scheduleAt' => '2024-10-23T14:30:00.000Z',
    'description' => 'Fix critical bug from support ticket',
    'ticketId' => 'TICKET-12345',
    'ticketUrl' => 'https://support.company.com/tickets/12345',
    'priority' => 'HIGH'
];

$options = [
    'http' => [
        'header' => [
            'X-API-Key: logbook-sync-api-key-2024',
            'Content-Type: application/json'
        ],
        'method' => 'POST',
        'content' => json_encode($data)
    ]
];

$context = stream_context_create($options);
$result = file_get_contents($url, false, $context);
$response = json_decode($result, true);

echo "Task created: " . $response['data']['taskCode'];
?>
```

## Database Schema

The API automatically ensures the following database columns exist:

### tasklist table additions:
- `id_crm` (TEXT) - CRM record ID
- `ticket_id` (TEXT) - Support ticket ID  
- `ticket_url` (TEXT) - URL to ticket in CRM system

### tasklist_log table:
- Automatic activity logging for all CRM task operations

## Integration Patterns

### 1. Support Ticket Integration
```javascript
// When support ticket is created/escalated
const taskData = {
  projectCode: ticket.projectCode,
  moduleCode: ticket.moduleCode || '01',
  assigneeUsername: ticket.assignedDeveloper,
  scheduleAt: ticket.dueDate,
  description: ticket.description,
  ticketId: ticket.id,
  ticketUrl: ticket.url,
  priority: ticket.priority === 'urgent' ? 'HIGH' : 'MEDIUM'
};

await createCrmTask(taskData);
```

### 2. CRM Lead Integration
```javascript
// When CRM lead requires development work
const taskData = {
  projectCode: lead.projectCode,
  moduleCode: lead.featureModule,
  assigneeUsername: lead.assignedDeveloper,
  scheduleAt: lead.requestedDelivery,
  description: lead.requirements,
  crmId: lead.id,
  ticketUrl: lead.crmUrl,
  tasklistType: 'DEVELOPMENT'
};

await createCrmTask(taskData);
```

### 3. Batch Processing
```javascript
// Process multiple tickets in batch
const tickets = await getCrmTickets({ status: 'needs_development' });

for (const ticket of tickets) {
  try {
    await createCrmTask({
      projectCode: ticket.project,
      moduleCode: ticket.module,
      assigneeUsername: ticket.developer,
      scheduleAt: ticket.deadline,
      description: ticket.description,
      ticketId: ticket.id,
      priority: ticket.priority
    });
    
    await updateTicketStatus(ticket.id, 'task_created');
  } catch (error) {
    console.error(`Failed to create task for ticket ${ticket.id}:`, error);
  }
}
```

## Testing

Run the comprehensive test suite:

```bash
node test-crm-tasklist-api.js
```

The test suite covers:
- ✅ API key authentication
- ✅ Field validation
- ✅ Date format validation
- ✅ Project/module/user validation
- ✅ Team membership verification
- ✅ Task creation with all fields
- ✅ Minimal required fields
- ✅ Documentation endpoint
- ✅ Performance testing

## Environment Configuration

Add to your `.env.development` file:

```env
CRM_API_KEY="logbook-sync-api-key-2024"
```

## Error Handling Best Practices

1. **Always check response status** before processing data
2. **Handle network errors** gracefully with retries
3. **Validate data** before sending requests
4. **Log errors** for debugging and monitoring
5. **Implement fallback mechanisms** for critical integrations

## Rate Limiting

Currently no rate limiting is implemented. For production use, consider:
- Implementing rate limiting per API key
- Adding request queuing for high-volume integrations
- Monitoring API usage patterns

## Security Considerations

1. **Secure API Key Storage**: Never hardcode API keys in source code
2. **HTTPS Only**: Use HTTPS in production environments
3. **Input Sanitization**: API validates and sanitizes all inputs
4. **Team Verification**: Ensures users can only be assigned to their projects
5. **Audit Logging**: All operations are logged for security auditing

## Support

For API support and integration assistance:
- Check the test script for usage examples
- Review error messages for specific guidance
- Ensure all required fields are provided
- Verify project/module/user relationships in the database

---

**Version**: 1.0.0  
**Last Updated**: October 2024  
**Status**: Production Ready 🚀
