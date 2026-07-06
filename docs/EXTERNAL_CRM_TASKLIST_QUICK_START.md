# External CRM Tasklist API - Quick Start Guide

Get up and running with the External CRM Tasklist API in 5 minutes! 🚀

## 1. Prerequisites

- ✅ Next.js development server running on port 3001
- ✅ Database connection configured
- ✅ API key configured in environment

## 2. Environment Setup

Add to your `.env.development` file:

```env
CRM_API_KEY="logbook-sync-api-key-2024"
```

## 3. Basic Usage

### Create a CRM Task (cURL)

```bash
curl -X POST \
  -H "X-API-Key: logbook-sync-api-key-2024" \
  -H "Content-Type: application/json" \
  -d '{
    "projectCode": "MMS-01",
    "moduleCode": "01",
    "assigneeUsername": "erda@exp",
    "scheduleAt": "2024-10-23T14:30:00.000Z",
    "description": "Fix login issue from support ticket",
    "ticketId": "TICKET-12345",
    "priority": "HIGH"
  }' \
  http://localhost:3001/api/external/crm/tasklist
```

### Expected Response

```json
{
  "success": true,
  "message": "CRM tasklist created successfully",
  "data": {
    "taskId": 1234,
    "taskCode": "01 - 5",
    "projectCode": "MMS-01",
    "projectName": "Sistem Logbook",
    "assignee": {
      "username": "erda@exp",
      "name": "Aditya Erda S"
    },
    "status": "MENUNGGU_PROSES_USER",
    "ticketId": "TICKET-12345"
  }
}
```

## 4. JavaScript Integration

```javascript
async function createCrmTask(ticketData) {
  const response = await fetch('http://localhost:3001/api/external/crm/tasklist', {
    method: 'POST',
    headers: {
      'X-API-Key': 'logbook-sync-api-key-2024',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      projectCode: ticketData.project,
      moduleCode: ticketData.module || '01',
      assigneeUsername: ticketData.assignee,
      scheduleAt: ticketData.dueDate,
      description: ticketData.description,
      ticketId: ticketData.ticketId,
      ticketUrl: ticketData.ticketUrl,
      priority: ticketData.urgent ? 'HIGH' : 'MEDIUM'
    })
  });

  if (!response.ok) {
    throw new Error(`API Error: ${response.status}`);
  }

  const result = await response.json();
  return result.data;
}

// Usage
const task = await createCrmTask({
  project: 'MMS-01',
  module: '01',
  assignee: 'developer1',
  dueDate: '2024-10-23T14:30:00.000Z',
  description: 'Fix critical bug',
  ticketId: 'TICKET-123',
  ticketUrl: 'https://crm.example.com/tickets/123',
  urgent: true
});

console.log(`Task created: ${task.taskCode}`);
```

## 5. Required Fields

| Field | Description | Example |
|-------|-------------|---------|
| `projectCode` | Existing project code | "MMS-01" |
| `moduleCode` | Module code in project | "01" or "01.01" |
| `assigneeUsername` | Username of team member | "developer1" |
| `scheduleAt` | ISO date string | "2024-10-23T14:30:00.000Z" |

## 6. Optional CRM Fields

| Field | Description | Example |
|-------|-------------|---------|
| `description` | Task description | "Fix login bug from ticket" |
| `ticketId` | Support ticket ID | "TICKET-12345" |
| `ticketUrl` | Link to ticket | "https://crm.example.com/tickets/12345" |
| `crmId` | CRM record ID | "CRM-67890" |
| `priority` | EASY/MEDIUM/HIGH | "HIGH" |

## 7. Test the API

Run the test script to verify everything works:

```bash
node test-crm-tasklist-api.js
```

Expected output:
```
🎫 Testing External CRM Tasklist API
====================================

Test 1: API Key Validation
---------------------------
✅ API key validation working - unauthorized access blocked

Test 4: Valid CRM Tasklist Creation
-----------------------------------
✅ CRM tasklist created successfully
📊 Response structure:
   - Task ID: 1234
   - Task Code: 01 - 5
   - Project: Sistem Logbook (MMS-01)
   - Assignee: Aditya Erda S (erda@exp)
   - Ticket ID: TICKET-TEST-001

🎉 Testing completed!
```

## 8. Common Integration Patterns

### Support Ticket → Task
```javascript
// When support ticket needs development work
const createTaskFromTicket = async (ticket) => {
  return await createCrmTask({
    projectCode: ticket.projectCode,
    moduleCode: ticket.affectedModule || '01',
    assigneeUsername: ticket.assignedDeveloper,
    scheduleAt: ticket.dueDate,
    description: `${ticket.title}: ${ticket.description}`,
    ticketId: ticket.id,
    ticketUrl: ticket.url,
    priority: ticket.severity === 'critical' ? 'HIGH' : 'MEDIUM'
  });
};
```

### CRM Lead → Task
```javascript
// When CRM lead requires development
const createTaskFromLead = async (lead) => {
  return await createCrmTask({
    projectCode: lead.projectCode,
    moduleCode: lead.featureModule,
    assigneeUsername: lead.assignedDeveloper,
    scheduleAt: lead.requestedDelivery,
    description: lead.requirements,
    crmId: lead.id,
    ticketUrl: lead.crmUrl,
    tasklistType: 'DEVELOPMENT'
  });
};
```

## 9. Error Handling

```javascript
async function createCrmTaskSafely(taskData) {
  try {
    const task = await createCrmTask(taskData);
    console.log(`✅ Task created: ${task.taskCode}`);
    return task;
  } catch (error) {
    if (error.message.includes('401')) {
      console.error('❌ Invalid API key');
    } else if (error.message.includes('404')) {
      console.error('❌ Project, module, or user not found');
    } else if (error.message.includes('400')) {
      console.error('❌ Invalid request data');
    } else {
      console.error('❌ Unexpected error:', error.message);
    }
    throw error;
  }
}
```

## 10. What Happens When You Create a Task?

1. **✅ Validation**: API validates project, module, and user exist
2. **✅ Team Check**: Verifies assignee is part of project team
3. **✅ Code Generation**: Automatically generates sequential task code
4. **✅ Database**: Creates task with CRM/ticket references
5. **✅ Notification**: Sends WhatsApp notification to assignee
6. **✅ Logging**: Records activity in audit log

## 11. Troubleshooting

### Common Issues

**401 Unauthorized**
- Check API key in request header
- Verify `CRM_API_KEY` in environment file

**404 Project Not Found**
- Verify project code exists in database
- Check spelling and case sensitivity

**404 Module Not Found**
- Ensure module exists in the project
- Use correct module code format

**404 User Not Found**
- Verify username exists in pegawai table
- Check username spelling

**403 User Not in Team**
- Ensure user is assigned to the project
- Check project team membership

## 12. Next Steps

- 📖 Read the [full API documentation](./EXTERNAL_CRM_TASKLIST_API.md)
- 🧪 Run comprehensive tests with `node test-crm-tasklist-api.js`
- 🔗 Integrate with your CRM/ticketing system
- 📊 Monitor task creation and notifications

---

**🎉 You're ready to integrate CRM tasks with the logbook system!**

For advanced usage, error handling, and integration patterns, see the complete [External CRM Tasklist API Documentation](./EXTERNAL_CRM_TASKLIST_API.md).
