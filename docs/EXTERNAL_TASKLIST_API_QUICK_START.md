# External Tasklist API - Quick Start Guide

Get started with the External Tasklist API in 5 minutes.

## Prerequisites

1. **API Key**: You need the same `EXTERNAL_API_KEY` used for the project API
2. **Test Data**: Valid project code, module code, and username in your database
3. **Running Server**: LogBook application running locally or on your server

## Step 1: Verify API Key

Test your API key works:

```bash
curl -X GET "http://localhost:3000/api/external/tasklist" \
  -H "X-API-Key: your-external-api-key-here"
```

**Expected Response:**
```json
{
  "success": true,
  "message": "API key is valid",
  "endpoint": "/api/external/tasklist",
  "methods": ["POST", "PUT"]
}
```

## Step 2: Create Your First Task

```bash
curl -X POST "http://localhost:3000/api/external/tasklist" \
  -H "X-API-Key: your-external-api-key-here" \
  -H "Content-Type: application/json" \
  -d '{
    "projectCode": "PRJ-001",
    "moduleCode": "01.01",
    "assigneeUsername": "admin",
    "scheduleAt": "2024-10-15T10:00:00.000Z",
    "description": "My first external task",
    "taskComplexity": "MEDIUM"
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Task created successfully",
  "data": {
    "task": {
      "id": 123,
      "code": "01.01 - 1",
      "description": "My first external task",
      "status": "MENUNGGU_PROSES_USER",
      "project": {
        "code": "PRJ-001",
        "name": "Project Name"
      },
      "assignee": {
        "username": "admin",
        "name": "Administrator"
      }
    }
  }
}
```

## Step 3: Update the Task

Using the task code from the previous response:

```bash
curl -X PUT "http://localhost:3000/api/external/tasklist" \
  -H "X-API-Key: your-external-api-key-here" \
  -H "Content-Type: application/json" \
  -d '{
    "taskCode": "01.01 - 1",
    "status": "SEDANG_DIPROSES_USER",
    "description": "Updated task description"
  }'
```

## Step 4: Run the Test Script

For comprehensive testing:

```bash
# Set environment variables
export API_KEY=your-external-api-key-here
export API_URL=http://localhost:3000

# Run the test script
node test-external-tasklist-api.js
```

## Common Issues & Solutions

### Issue: "Project not found"
**Solution**: Check your database for existing projects:
```sql
SELECT kodeProyek, namaProyek FROM proyek LIMIT 10;
```

### Issue: "Module not found"
**Solution**: Check modules for your project:
```sql
SELECT kode, nama FROM proyek_module 
WHERE projectId = (SELECT id FROM proyek WHERE kodeProyek = 'YOUR-PROJECT-CODE')
AND isLeaf = true;
```

### Issue: "User not a team member"
**Solution**: Check team members:
```sql
SELECT p.username, p.namaLengkap, pt.jabatan 
FROM pegawai p 
JOIN proyek_team pt ON p.id = pt.pegawaiId 
WHERE pt.projectId = (SELECT id FROM proyek WHERE kodeProyek = 'YOUR-PROJECT-CODE');
```

## Next Steps

1. **Read Full Documentation**: See `EXTERNAL_TASKLIST_API.md` for complete details
2. **Integrate with Your App**: Use the API in your application code
3. **Set Up Monitoring**: Monitor API usage and errors
4. **Configure Production**: Set up proper API keys and HTTPS for production

## API Endpoints Summary

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/api/external/tasklist` | Test API key and get documentation |
| POST | `/api/external/tasklist` | Create new tasklist |
| PUT | `/api/external/tasklist` | Update existing tasklist |

## Required Fields

### Create Task (POST)
- `projectCode` - Existing project code
- `moduleCode` - Existing module code (must be leaf)
- `assigneeUsername` - Existing username (must be team member)
- `scheduleAt` - ISO date string

### Update Task (PUT)
- `taskCode` - Existing task code

## Optional Fields

- `description` - Task description
- `tasklistType` - BLUEPRINT, DEVELOPMENT, MAINTENANCE
- `taskComplexity` - EASY, MEDIUM, HARD
- `status` - Task status (see documentation for valid values)

## Support

If you encounter issues:

1. Check the server logs for detailed error messages
2. Verify your test data exists in the database
3. Use the test script to validate your setup
4. Review the full documentation for advanced usage
