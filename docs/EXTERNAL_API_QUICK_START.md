# External API Quick Start Guide

Quick reference for integrating with the Logbook External Project API.

## Setup (5 minutes)

### 1. Configure API Key
Add to your `.env` file:
```env
EXTERNAL_API_KEY="your-secure-api-key-here"
```

### 2. Restart Server
```bash
npm run dev
```

## Basic Usage

### Minimal Request (Required Fields Only)
```bash
curl -X POST http://localhost:3000/api/external/project \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your-api-key-here" \
  -d '{
    "projectCode": "PRJ-001",
    "projectName": "My Project",
    "customerName": "Customer Name"
  }'
```

### Full Request (With Team & PICs)
```bash
curl -X POST http://localhost:3000/api/external/project \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your-api-key-here" \
  -d '{
    "projectCode": "PRJ-002",
    "projectName": "Full Project",
    "customerName": "Customer Inc.",
    "companyName": "Company Ltd.",
    "pics": [
      {"id": 1, "name": "Admin User", "role": "Administrator", "email": "admin@example.com", "phone": "081234567890"},
      {"id": 2, "name": "Manager", "role": "Project Manager", "email": "manager@example.com", "phone": "081234567891"}
    ],
    "team": ["admin", "dev1"]
  }'
```

## Request Fields

| Field | Required | Type | Example |
|-------|----------|------|---------|
| `projectCode` | ✅ Yes | string | "PRJ-2024-001" |
| `projectName` | ✅ Yes | string | "Website Redesign" |
| `customerName` | ✅ Yes | string | "Acme Corp" |
| `companyName` | ❌ No | string | "Tech Solutions" |
| `pics` | ❌ No | array | [{"id": 1, "name": "John", "role": "PM", "email": "john@example.com", "phone": "081234567890"}] |
| `team` | ❌ No | array | ["user1", "user2"] |

## Response

### Success (201)
```json
{
  "success": true,
  "message": "Project created successfully",
  "data": {
    "project": {
      "id": 123,
      "code": "PRJ-001",
      "name": "My Project"
    },
    "blueprint": {
      "id": 456,
      "status": "DRAFT"
    },
    "team": [...]
  }
}
```

### Error (4xx/5xx)
```json
{
  "success": false,
  "error": "Error message"
}
```

## Common Errors

| Status | Error | Solution |
|--------|-------|----------|
| 401 | Invalid API key | Check `X-API-Key` header and `.env` file |
| 400 | Missing required fields | Include `projectCode`, `projectName`, `customerName` |
| 409 | Project code exists | Use a unique `projectCode` |
| 400 | Team member not found | Verify username exists in database |

## Test the API

### 1. Test API Key
```bash
curl -X GET http://localhost:3000/api/external/project \
  -H "X-API-Key: your-api-key-here"
```

### 2. Run Test Script
```bash
node test-external-api.js
```

## Integration Examples

### JavaScript/Node.js
```javascript
const response = await fetch('http://localhost:3000/api/external/project', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-API-Key': process.env.API_KEY
  },
  body: JSON.stringify({
    projectCode: 'PRJ-001',
    projectName: 'My Project',
    customerName: 'Customer',
    pics: [{
      id: 1,
      name: 'Admin',
      role: 'Administrator',
      email: 'admin@example.com',
      phone: '081234567890'
    }],
    team: ['admin', 'dev1']
  })
});

const result = await response.json();
console.log(result.data.project.id);
```

### Python
```python
import requests

response = requests.post(
    'http://localhost:3000/api/external/project',
    headers={
        'Content-Type': 'application/json',
        'X-API-Key': 'your-api-key'
    },
    json={
        'projectCode': 'PRJ-001',
        'projectName': 'My Project',
        'customerName': 'Customer'
    }
)

result = response.json()
print(result['data']['project']['id'])
```

### PHP
```php
<?php
$ch = curl_init('http://localhost:3000/api/external/project');
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    'Content-Type: application/json',
    'X-API-Key: your-api-key'
]);
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode([
    'projectCode' => 'PRJ-001',
    'projectName' => 'My Project',
    'customerName' => 'Customer'
]));

$response = curl_exec($ch);
$result = json_decode($response, true);
echo $result['data']['project']['id'];
?>
```

## What Gets Created

When you call this API, the system automatically creates:

1. **Project** - New project record with unique code
2. **Blueprint** - Auto-created blueprint in DRAFT status
3. **Team Members** - Assigned to project with their positions
4. **PICs** - Added to blueprint for management
5. **Activity Log** - Tracks creation via external API

## Security Best Practices

✅ **DO:**
- Store API key in environment variables
- Use HTTPS in production
- Rotate API keys periodically
- Log all API calls
- Validate data before sending

❌ **DON'T:**
- Hardcode API keys in code
- Commit API keys to git
- Share API keys publicly
- Use same key for dev/prod

## Need Help?

- 📖 Full documentation: `docs/EXTERNAL_API.md`
- 🧪 Test script: `test-external-api.js`
- 🐛 Check server logs for detailed errors
- 📝 Verify usernames exist in Pegawai table

## Quick Troubleshooting

```bash
# Check if server is running
curl http://localhost:3000/api/external/project

# Test with valid API key
curl -H "X-API-Key: your-key" http://localhost:3000/api/external/project

# View server logs
# Check console output for error details
```

## Production Checklist

- [ ] Generate secure API key (UUID recommended)
- [ ] Add API key to production `.env`
- [ ] Update API base URL to production domain
- [ ] Enable HTTPS
- [ ] Set up API key rotation schedule
- [ ] Configure rate limiting
- [ ] Set up monitoring/logging
- [ ] Test with production data
- [ ] Document API key for your team
- [ ] Create backup/recovery plan
