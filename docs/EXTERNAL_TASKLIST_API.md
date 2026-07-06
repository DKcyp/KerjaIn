# External Tasklist API Documentation

The External Tasklist API allows external applications to create and update tasklists in the LogBook system using secure API key authentication.

## Table of Contents

- [Authentication](#authentication)
- [Endpoints](#endpoints)
- [Request/Response Format](#requestresponse-format)
- [Error Handling](#error-handling)
- [Examples](#examples)
- [Testing](#testing)
- [Security](#security)

## Authentication

All requests must include an API key in the `X-API-Key` header.

```http
X-API-Key: your-external-api-key-here
```

The API key is configured via the `EXTERNAL_API_KEY` environment variable (same as the project API).

## Endpoints

### GET /api/external/tasklist

Test API key validation and get endpoint documentation.

**Headers:**
- `X-API-Key`: Required API key

**Response:**
```json
{
  "success": true,
  "message": "API key is valid",
  "endpoint": "/api/external/tasklist",
  "methods": ["POST", "PUT"],
  "documentation": {
    "authentication": "API Key in X-API-Key header",
    "post": {
      "description": "Create new tasklist",
      "requiredFields": ["projectCode", "moduleCode", "assigneeUsername", "scheduleAt"],
      "optionalFields": ["description", "tasklistType", "taskComplexity", "status"]
    },
    "put": {
      "description": "Update existing tasklist",
      "requiredFields": ["taskCode"],
      "optionalFields": ["scheduleAt", "description", "taskComplexity", "status"]
    }
  }
}
```

### POST /api/external/tasklist

Create a new tasklist with optional file attachments.

#### JSON Request (No Files)

**Headers:**
- `X-API-Key`: Required API key
- `Content-Type`: application/json

**Request Body:**
```json
{
  "projectCode": "string",        // Project code (required)
  "moduleCode": "string",         // Module code within project (required)
  "assigneeUsername": "string",   // Username of assignee (required)
  "scheduleAt": "ISO date",       // Schedule date/time (required)
  "description": "string",        // Task description (optional)
  "tasklistType": "DEVELOPMENT",  // BLUEPRINT|DEVELOPMENT|MAINTENANCE (optional, default: DEVELOPMENT)
  "taskComplexity": "MEDIUM",     // EASY|MEDIUM|HARD (optional, default: MEDIUM)
  "status": "MENUNGGU_PROSES_USER" // Initial status (optional, default: MENUNGGU_PROSES_USER)
}
```

#### Multipart Request (With Files)

**Headers:**
- `X-API-Key`: Required API key
- `Content-Type`: multipart/form-data

**Form Fields:**
- `projectCode`: string (required)
- `moduleCode`: string (required)
- `assigneeUsername`: string (required)
- `scheduleAt`: ISO date string (required)
- `description`: string (optional)
- `tasklistType`: string (optional, default: DEVELOPMENT)
- `taskComplexity`: string (optional, default: MEDIUM)
- `status`: string (optional, default: MENUNGGU_PROSES_USER)
- `files`: file[] (optional, multiple files supported)

**Supported File Types:**
- Images: JPG, JPEG, PNG, GIF, BMP, WEBP, SVG
- Documents: PDF, DOC, DOCX, XLS, XLSX, TXT
- Archives: ZIP, RAR
- Any other file type (stored as application/octet-stream)

**Response (201 Created):**
```json
{
  "success": true,
  "message": "Task created successfully",
  "data": {
    "task": {
      "id": 123,
      "code": "01.01 - 1",
      "description": "Task description",
      "status": "MENUNGGU_PROSES_USER",
      "statusCode": 1,
      "scheduleAt": "2024-10-15T10:00:00.000Z",
      "tasklistType": "DEVELOPMENT",
      "taskComplexity": "MEDIUM",
      "imagePath": "/api/uploads/tasklist/1234567890_abc123.jpg",
      "uploadedFiles": [
        {
          "fileName": "1234567890_abc123.jpg",
          "originalName": "screenshot.jpg",
          "filePath": "/api/uploads/tasklist/1234567890_abc123.jpg",
          "fileType": "image/jpeg",
          "fileSize": 102400
        },
        {
          "fileName": "1234567891_def456.pdf",
          "originalName": "requirements.pdf",
          "filePath": "/api/uploads/tasklist/1234567891_def456.pdf",
          "fileType": "application/pdf",
          "fileSize": 204800
        }
      ],
      "project": {
        "id": 1,
        "code": "PRJ-001",
        "name": "Project Name"
      },
      "module": {
        "id": 5,
        "code": "01.01",
        "name": "Module Name"
      },
      "assignee": {
        "id": 2,
        "username": "developer1",
        "name": "John Doe"
      }
    }
  }
}
```

### PUT /api/external/tasklist

Update an existing tasklist.

**Headers:**
- `X-API-Key`: Required API key
- `Content-Type`: application/json

**Request Body:**
```json
{
  "taskCode": "string",           // Task code to identify task (required)
  "scheduleAt": "ISO date",       // New schedule date/time (optional)
  "description": "string",        // New task description (optional)
  "taskComplexity": "MEDIUM",     // New complexity (optional)
  "status": "SEDANG_DIPROSES_USER" // New status (optional)
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Task updated successfully",
  "data": {
    "task": {
      "id": 123,
      "code": "01.01 - 1",
      "description": "Updated description",
      "status": "SEDANG_DIPROSES_USER",
      "statusCode": 2,
      "scheduleAt": "2024-10-15T14:00:00.000Z",
      "tasklistType": "DEVELOPMENT",
      "taskComplexity": "HARD",
      "project": {
        "id": 1,
        "code": "PRJ-001",
        "name": "Project Name"
      },
      "assignee": {
        "id": 2,
        "username": "developer1",
        "name": "John Doe"
      }
    }
  }
}
```

## Request/Response Format

### Field Descriptions

#### Required Fields (POST)
- **projectCode**: Must match an existing project's `kodeProyek`
- **moduleCode**: Must match an existing module's `kode` within the specified project
- **assigneeUsername**: Must match an existing user's `username` who is a team member of the project
- **scheduleAt**: ISO 8601 date string (e.g., "2024-10-15T10:00:00.000Z")

#### Optional Fields (POST)
- **description**: Task description text
- **tasklistType**: One of `BLUEPRINT`, `DEVELOPMENT`, `MAINTENANCE` (default: `DEVELOPMENT`)
- **taskComplexity**: One of `EASY`, `MEDIUM`, `HARD` (default: `MEDIUM`)
- **status**: Initial task status (default: `MENUNGGU_PROSES_USER`)

#### Required Fields (PUT)
- **taskCode**: Must match an existing task's `kode`

#### Optional Fields (PUT)
- **scheduleAt**: New schedule date/time
- **description**: New task description
- **taskComplexity**: New complexity level
- **status**: New task status

### Valid Status Values

- `MENUNGGU_PROSES_USER` (1) - Waiting for user to start
- `SEDANG_DIPROSES_USER` (2) - Being processed by user
- `SEDANG_DIPROSES_USER_PAUSED` (5) - Processing paused by user
- `MENUNGGU_REVIEW_PM` (3) - Waiting for PM review
- `SELESAI` (4) - Completed

### Automatic Calculations

When creating or updating tasks, the system automatically:

1. **Generates Task Code**: Based on module hierarchy (e.g., "01.01 - 1")
2. **Calculates SLA Deadlines**: Based on task complexity and schedule
3. **Sets Due Date**: Based on task complexity hours
4. **Creates Activity Log**: Records creation/update in tasklist_log table

## Error Handling

### HTTP Status Codes

- **200 OK**: Successful update
- **201 Created**: Successful creation
- **400 Bad Request**: Invalid request data
- **401 Unauthorized**: Invalid or missing API key
- **500 Internal Server Error**: Server error

### Error Response Format

```json
{
  "success": false,
  "error": "Error description",
  "details": "Additional error details (optional)"
}
```

### Common Errors

#### Authentication Errors
```json
{
  "success": false,
  "error": "Unauthorized: Invalid or missing API key"
}
```

#### Validation Errors
```json
{
  "success": false,
  "error": "Missing required fields: projectCode, moduleCode, assigneeUsername, and scheduleAt are required"
}
```

#### Data Not Found Errors
```json
{
  "success": false,
  "error": "Project with code 'INVALID-CODE' not found"
}
```

```json
{
  "success": false,
  "error": "User 'invalid-user' is not a member of project 'PRJ-001' team"
}
```

#### Invalid Data Errors
```json
{
  "success": false,
  "error": "Invalid taskComplexity. Must be EASY, MEDIUM, or HARD"
}
```

## Examples

### Create a Development Task

```bash
curl -X POST "http://localhost:3000/api/external/tasklist" \
  -H "X-API-Key: your-api-key-here" \
  -H "Content-Type: application/json" \
  -d '{
    "projectCode": "PRJ-001",
    "moduleCode": "01.01",
    "assigneeUsername": "developer1",
    "scheduleAt": "2024-10-15T10:00:00.000Z",
    "description": "Implement user authentication",
    "tasklistType": "DEVELOPMENT",
    "taskComplexity": "MEDIUM"
  }'
```

### Create a Blueprint Task

```bash
curl -X POST "http://localhost:3000/api/external/tasklist" \
  -H "X-API-Key: your-api-key-here" \
  -H "Content-Type: application/json" \
  -d '{
    "projectCode": "PRJ-002",
    "moduleCode": "02.01",
    "assigneeUsername": "analyst1",
    "scheduleAt": "2024-10-16T09:00:00.000Z",
    "description": "Create system requirements document",
    "tasklistType": "BLUEPRINT",
    "taskComplexity": "HARD"
  }'
```

### Update Task Status

```bash
curl -X PUT "http://localhost:3000/api/external/tasklist" \
  -H "X-API-Key: your-api-key-here" \
  -H "Content-Type: application/json" \
  -d '{
    "taskCode": "01.01 - 1",
    "status": "SEDANG_DIPROSES_USER",
    "description": "Updated task description"
  }'
```

### Update Task Complexity and Schedule

```bash
curl -X PUT "http://localhost:3000/api/external/tasklist" \
  -H "X-API-Key: your-api-key-here" \
  -H "Content-Type: application/json" \
  -d '{
    "taskCode": "01.01 - 1",
    "taskComplexity": "HARD",
    "scheduleAt": "2024-10-17T14:00:00.000Z"
  }'
```

## Testing

### Using the Test Script

A comprehensive test script is provided: `test-external-tasklist-api.js`

```bash
# Set environment variables
export API_KEY=your-external-api-key-here
export API_URL=http://localhost:3000

# Run tests
node test-external-tasklist-api.js
```

### Manual Testing with curl

1. **Test API Key Validation:**
```bash
curl -X GET "http://localhost:3000/api/external/tasklist" \
  -H "X-API-Key: your-api-key-here"
```

2. **Test Invalid API Key:**
```bash
curl -X GET "http://localhost:3000/api/external/tasklist" \
  -H "X-API-Key: invalid-key"
```

3. **Test Task Creation:**
```bash
curl -X POST "http://localhost:3000/api/external/tasklist" \
  -H "X-API-Key: your-api-key-here" \
  -H "Content-Type: application/json" \
  -d '{
    "projectCode": "TEST-001",
    "moduleCode": "01.01",
    "assigneeUsername": "admin",
    "scheduleAt": "2024-10-15T10:00:00.000Z",
    "description": "Test task"
  }'
```

### Test Data Requirements

Before testing, ensure you have:

1. **Valid Project**: A project with `kodeProyek` that matches your test data
2. **Valid Module**: A leaf module with `kode` within the project
3. **Valid User**: A user with `username` who is a team member of the project
4. **API Key**: Configured in environment variables

## Security

### API Key Management

- Store API keys securely in environment variables
- Use different API keys for different environments (development, staging, production)
- Rotate API keys regularly
- Never commit API keys to version control

### Request Validation

The API performs comprehensive validation:

- **Authentication**: API key validation on every request
- **Authorization**: Ensures users are team members of projects
- **Data Validation**: Validates all input fields and formats
- **Business Rules**: Enforces module hierarchy and team membership rules

### Rate Limiting

Consider implementing rate limiting in production:

- Limit requests per minute per API key
- Monitor for unusual usage patterns
- Log all API requests for audit purposes

### HTTPS

Always use HTTPS in production to protect API keys and data in transit.

## Integration Patterns

### Synchronous Integration

For real-time task creation/updates:

```javascript
async function createTask(taskData) {
  const response = await fetch('/api/external/tasklist', {
    method: 'POST',
    headers: {
      'X-API-Key': process.env.EXTERNAL_API_KEY,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(taskData)
  });
  
  if (!response.ok) {
    throw new Error(`Task creation failed: ${response.status}`);
  }
  
  return await response.json();
}
```

### Batch Processing

For bulk operations, implement retry logic and error handling:

```javascript
async function createTasksBatch(tasks) {
  const results = [];
  
  for (const task of tasks) {
    try {
      const result = await createTask(task);
      results.push({ success: true, data: result });
    } catch (error) {
      results.push({ success: false, error: error.message, task });
    }
  }
  
  return results;
}
```

### Error Recovery

Implement proper error handling and retry logic:

```javascript
async function createTaskWithRetry(taskData, maxRetries = 3) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await createTask(taskData);
    } catch (error) {
      if (attempt === maxRetries) throw error;
      
      // Wait before retry (exponential backoff)
      await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
    }
  }
}
```

## Troubleshooting

### Common Issues

1. **"Project not found"**
   - Verify the project code exists in the database
   - Check for exact case-sensitive match

2. **"Module not found or not a leaf"**
   - Ensure the module exists within the specified project
   - Verify the module is a leaf node (has no children)

3. **"User not a team member"**
   - Check that the user exists in the pegawai table
   - Verify the user is assigned to the project team

4. **"Invalid date format"**
   - Use ISO 8601 format: "2024-10-15T10:00:00.000Z"
   - Ensure the date is valid and in the future

5. **"Task code not found" (for updates)**
   - Verify the task code exists and matches exactly
   - Check for any extra spaces or formatting differences

### Debugging

Enable detailed logging by checking:

1. **Server Logs**: Check the application logs for detailed error messages
2. **Database Logs**: Verify database constraints and foreign key relationships
3. **Network Logs**: Ensure requests are reaching the server correctly

### Support

For additional support:

1. Check the server logs for detailed error information
2. Verify your test data matches existing database records
3. Use the provided test script to validate your setup
4. Review the API response error messages for specific guidance
