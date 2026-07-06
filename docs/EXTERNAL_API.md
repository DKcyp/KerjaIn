# External Project Creation API

This API allows external applications to create projects in the Logbook system programmatically. It uses API key authentication and automatically creates projects with their blueprints and team assignments.

## Table of Contents
- [Authentication](#authentication)
- [Endpoint](#endpoint)
- [Request Format](#request-format)
- [Response Format](#response-format)
- [Error Handling](#error-handling)
- [Usage Examples](#usage-examples)
- [Testing](#testing)

## Authentication

The API uses API key authentication. Include your API key in the request header:

```
X-API-Key: your-api-key-here
```

### Setting up API Key

1. Add the API key to your environment file (`.env.development` or `.env.production`):
   ```env
   EXTERNAL_API_KEY="your-secure-api-key-here"
   ```

2. **Important**: Use a strong, unique API key in production. Consider using a UUID or similar secure random string.

3. Keep your API key secure and never commit it to version control.

## Endpoint

### Create Project
**POST** `/api/external/project`

Creates a new project with automatic blueprint creation and team assignment.

### Test API Key
**GET** `/api/external/project`

Tests if your API key is valid and returns endpoint documentation.

## Request Format
x
### Headers
```
Content-Type: application/json
X-API-Key: your-api-key-here
```

### Request Body

```json
{
  "projectCode": "string",        // Required: Unique project code (kodeProyek)
  "projectName": "string",        // Required: Project name (namaProyek)
  "companyName": "string",       // Required: Customer/client name
  "pics": [                       // Optional: Array of PIC objects for blueprint
    {
      "id": 1,                    // Required: Pegawai ID
      "name": "John Doe",         // Required: Pegawai name
      "role": "Project Manager",  // Required: Role/position
      "email": "john@example.com", // Required: Email address
      "phone": "081234567890"     // Required: Phone number
    }
  ],
  "team": ["fachrel@exp", "dian@exp"] // Optional: Array of usernames (jabatan from role)
}
```

### Field Descriptions

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `projectCode` | string | Yes | Unique identifier for the project. Must be unique across all projects. |
| `projectName` | string | Yes | Human-readable name of the project. |
| `customerName` | string | Yes | Name of the customer/client for this project. |
| `companyName` | string | No | Company name or additional identifier. |
| `pics` | array | No | Array of PIC objects with `id`, `name`, `role`, `email`, and `phone` fields. Stored as JSON in blueprint. |
| `pics[].id` | number | Yes* | Pegawai ID of the PIC. Must exist in the system. |
| `pics[].name` | string | Yes* | Name of the PIC. |
| `pics[].role` | string | Yes* | Role/position of the PIC (e.g., "Project Manager", "Technical Lead"). |
| `pics[].email` | string | Yes* | Email address of the PIC. |
| `pics[].phone` | string | Yes* | Phone number of the PIC. |
| `team` | array | No | Array of usernames. Each username must exist in the Pegawai table. The `jabatan` (position) is automatically derived from the user's role. |

*Required if `pics` array is provided.

## Response Format

### Success Response (201 Created)

```json
{
  "success": true,
  "message": "Project created successfully",
  "data": {
    "project": {
      "id": 123,
      "code": "PRJ-2024-001",
      "name": "New Project",
      "customer": "Customer Inc.",
      "company": "Company Ltd.",
      "noUrut": 45
    },
    "blueprint": {
      "id": 456,
      "status": "DRAFT",
      "pics": [
        {
          "id": 1,
          "name": "John Doe",
          "role": "Project Manager",
          "email": "john.doe@example.com",
          "phone": "081234567890"
        }
      ]
    },
    "team": [
      {
        "username": "john.doe",
        "name": "John Doe",
        "role": "PM",
        "jabatan": "PM"
      },
      {
        "username": "jane.smith",
        "name": "Jane Smith",
        "role": "PROGRAMMER",
        "jabatan": "PROGRAMMER"
      }
    ]
  }
}
```

### Error Response

```json
{
  "success": false,
  "error": "Error message describing what went wrong"
}
```

## Error Handling

### HTTP Status Codes

| Status Code | Description |
|-------------|-------------|
| 201 | Project created successfully |
| 400 | Bad request (missing required fields, invalid data) |
| 401 | Unauthorized (invalid or missing API key) |
| 409 | Conflict (project code already exists) |
| 500 | Internal server error |

### Common Error Messages

#### 401 Unauthorized
```json
{
  "success": false,
  "error": "Unauthorized: Invalid or missing API key"
}
```

#### 400 Bad Request - Missing Fields
```json
{
  "success": false,
  "error": "Missing required fields: projectCode, projectName, and customerName are required"
}
```

#### 400 Bad Request - Invalid Team Members
```json
{
  "success": false,
  "error": "Team members not found: user1, user2"
}
```

#### 400 Bad Request - Invalid PIC Structure
```json
{
  "success": false,
  "error": "Each PIC must have id, name, role, email, and phone fields"
}
```

#### 409 Conflict - Duplicate Project Code
```json
{
  "success": false,
  "error": "Project with code 'PRJ-001' already exists"
}
```

## Usage Examples

### Example 1: Minimal Request (Required Fields Only)

```bash
curl -X POST http://localhost:3000/api/external/project \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your-api-key-here" \
  -d '{
    "projectCode": "PRJ-2024-001",
    "projectName": "Website Redesign",
    "customerName": "Acme Corporation"
  }'
```

### Example 2: Full Request with Team and PICs

```bash
curl -X POST http://localhost:3000/api/external/project \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your-api-key-here" \
  -d '{
    "projectCode": "PRJ-2024-002",
    "projectName": "Mobile App Development",
    "customerName": "Tech Startup Inc.",
    "companyName": "Tech Solutions Ltd.",
    "pics": [
      {
        "id": 1,
        "name": "John Doe",
        "role": "Project Manager",
        "email": "john.doe@example.com",
        "phone": "081234567890"
      },
      {
        "id": 2,
        "name": "Jane Smith",
        "role": "Technical Lead",
        "email": "jane.smith@example.com",
        "phone": "081234567891"
      }
    ],
    "team": ["john.doe", "jane.smith", "bob.wilson"]
  }'
```

### Example 3: JavaScript/Node.js

```javascript
const fetch = require('node-fetch');

async function createProject() {
  const response = await fetch('http://localhost:3000/api/external/project', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': 'your-api-key-here'
    },
    body: JSON.stringify({
      projectCode: 'PRJ-2024-003',
      projectName: 'E-commerce Platform',
      customerName: 'Retail Company',
      companyName: 'Digital Solutions',
      pics: [{
        id: 1,
        name: 'Admin User',
        role: 'Administrator',
        email: 'admin@example.com',
        phone: '081234567890'
      }],
      team: ['admin', 'developer1']
    })
  });

  const data = await response.json();
  
  if (response.ok) {
    console.log('Project created:', data.data.project);
    console.log('Blueprint ID:', data.data.blueprint.id);
  } else {
    console.error('Error:', data.error);
  }
}

createProject();
```

### Example 4: Python

```python
import requests
import json

url = 'http://localhost:3000/api/external/project'
headers = {
    'Content-Type': 'application/json',
    'X-API-Key': 'your-api-key-here'
}
data = {
    'projectCode': 'PRJ-2024-004',
    'projectName': 'Data Analytics Dashboard',
    'customerName': 'Analytics Corp',
    'pics': [{
        'id': 5,
        'name': 'Data Analyst',
        'role': 'Data Analyst',
        'email': 'analyst@example.com',
        'phone': '081234567890'
    }],
    'team': ['data.analyst', 'developer2']
}

response = requests.post(url, headers=headers, json=data)
result = response.json()

if response.status_code == 201:
    print(f"Project created: {result['data']['project']['code']}")
    print(f"Blueprint ID: {result['data']['blueprint']['id']}")
else:
    print(f"Error: {result['error']}")
```

## Testing

### Using the Test Script

A test script is provided to verify the API functionality:

```bash
node test-external-api.js
```

The test script will:
1. Validate API key authentication
2. Test invalid API key rejection
3. Test missing required fields validation
4. Create a test project with team and PICs

### Manual Testing with curl

Test API key validation:
```bash
curl -X GET http://localhost:3000/api/external/project \
  -H "X-API-Key: your-api-key-here"
```

Test project creation:
```bash
curl -X POST http://localhost:3000/api/external/project \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your-api-key-here" \
  -d '{
    "projectCode": "TEST-001",
    "projectName": "Test Project",
    "customerName": "Test Customer"
  }'
```

## Best Practices

1. **API Key Security**
   - Never hardcode API keys in your application code
   - Use environment variables or secure configuration management
   - Rotate API keys periodically
   - Use different API keys for different environments (dev, staging, production)

2. **Error Handling**
   - Always check the HTTP status code
   - Parse and handle error messages appropriately
   - Implement retry logic for transient failures (5xx errors)
   - Log all API interactions for debugging

3. **Data Validation**
   - Validate project codes are unique before calling the API
   - Ensure usernames exist in your system before including them
   - Trim whitespace from all string inputs
   - Use consistent naming conventions for project codes

4. **Performance**
   - Batch project creation if possible
   - Implement rate limiting on your side to avoid overwhelming the server
   - Cache team member information to reduce validation overhead

## Troubleshooting

### "Unauthorized: Invalid or missing API key"
- Check that the `X-API-Key` header is included in your request
- Verify the API key matches the value in the environment file
- Ensure the environment file is loaded (restart the server if needed)

### "Team members not found: username"
- Verify the username exists in the Pegawai table
- Check for typos in the username
- Ensure the username field is populated (not null) in the database

### "Project with code 'XXX' already exists"
- The project code must be unique
- Check if the project was already created
- Use a different project code

### "Missing required fields"
- Ensure `projectCode`, `projectName`, and `customerName` are all provided
- Check that the fields are not empty strings
- Verify the JSON structure is correct

## Support

For issues or questions about the External Project API, please contact the development team or refer to the main project documentation.

## Changelog

### Version 1.0.0 (2025-01-04)
- Initial release
- Support for project creation with automatic blueprint generation
- Team member assignment
- PIC assignment for blueprints
- API key authentication
