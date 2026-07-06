# External API JSON Structure

## POST /api/external/project

### Request Headers
```json
{
  "Content-Type": "application/json",
  "X-API-Key": "your-api-key-here"
}
```

### Request Body Structure

```json
{
  "projectCode": "string (required)",
  "projectName": "string (required)", 
  "customerName": "string (required)",
  "companyName": "string (optional)",
  "pics": [
    {
      "id": "number (required)",
      "name": "string (required)",
      "role": "string (required)",
      "email": "string (required)",
      "phone": "string (required)"
    }
  ],
  "team": ["string (username)", "string (username)"]
}
```

### Request Body Example

```json
{
  "projectCode": "PRJ-2024-001",
  "projectName": "E-Commerce Platform Development",
  "customerName": "ABC Corporation",
  "companyName": "ABC Corp Ltd",
  "pics": [
    {
      "id": 1,
      "name": "John Doe",
      "role": "Project Manager",
      "email": "john.doe@abccorp.com",
      "phone": "081234567890"
    },
    {
      "id": 2,
      "name": "Jane Smith",
      "role": "Technical Lead",
      "email": "jane.smith@abccorp.com",
      "phone": "081234567891"
    }
  ],
  "team": ["admin", "developer1", "tester1", "pm_user"]
}
```

### Success Response (201 Created)

```json
{
  "project": {
    "id": 123,
    "kodeProyek": "PRJ-2024-001",
    "namaProyek": "E-Commerce Platform Development",
    "client": "ABC Corporation",
    "pic": "ABC Corp Ltd",
    "createdAt": "2024-10-06T12:23:26.000Z",
    "updatedAt": "2024-10-06T12:23:26.000Z"
  },
  "blueprint": {
    "id": 456,
    "proyekId": "PRJ-2024-001",
    "status": "DRAFT",
    "picsData": [
      {
        "id": 1,
        "name": "John Doe",
        "role": "Project Manager",
        "email": "john.doe@abccorp.com",
        "phone": "081234567890"
      },
      {
        "id": 2,
        "name": "Jane Smith",
        "role": "Technical Lead",
        "email": "jane.smith@abccorp.com",
        "phone": "081234567891"
      }
    ],
    "createdAt": "2024-10-06T12:23:26.000Z",
    "updatedAt": "2024-10-06T12:23:26.000Z"
  },
  "team": [
    {
      "id": 1,
      "proyekId": "PRJ-2024-001",
      "username": "admin",
      "role": "ADMIN",
      "jabatan": "ADMIN",
      "createdAt": "2024-10-06T12:23:26.000Z"
    },
    {
      "id": 2,
      "proyekId": "PRJ-2024-001",
      "username": "developer1",
      "role": "PROGRAMMER",
      "jabatan": "PROGRAMMER",
      "createdAt": "2024-10-06T12:23:26.000Z"
    },
    {
      "id": 3,
      "proyekId": "PRJ-2024-001",
      "username": "tester1",
      "role": "TESTER",
      "jabatan": "TESTER",
      "createdAt": "2024-10-06T12:23:26.000Z"
    },
    {
      "id": 4,
      "proyekId": "PRJ-2024-001",
      "username": "pm_user",
      "role": "PM",
      "jabatan": "PM",
      "createdAt": "2024-10-06T12:23:26.000Z"
    }
  ]
}
```

### Error Responses

#### 401 Unauthorized (Invalid API Key)
```json
{
  "error": "Unauthorized: Invalid API key"
}
```

#### 400 Bad Request (Missing Required Fields)
```json
{
  "error": "Missing required fields: projectCode, projectName, customerName"
}
```

#### 400 Bad Request (Invalid PICs Structure)
```json
{
  "error": "Invalid PICs data: Each PIC must have id, name, role, email, and phone"
}
```

#### 400 Bad Request (Invalid Team Member)
```json
{
  "error": "User not found: invalid_username"
}
```

#### 409 Conflict (Duplicate Project Code)
```json
{
  "error": "Project with code 'PRJ-2024-001' already exists"
}
```

#### 500 Internal Server Error
```json
{
  "error": "Internal server error: [error details]"
}
```

## Field Descriptions

### Required Fields
- **projectCode**: Unique identifier for the project (must be unique across all projects)
- **projectName**: Display name for the project
- **customerName**: Name of the customer/client

### Optional Fields
- **companyName**: Company name (stored in `pic` field of project)
- **pics**: Array of Person In Charge contacts (stored as JSON in blueprint)
- **team**: Array of usernames to assign to the project team

### PICs Structure
- **id**: Any numeric identifier (doesn't need to match database records)
- **name**: Full name of the contact person
- **role**: Position/role (e.g., "Project Manager", "Technical Lead")
- **email**: Email address
- **phone**: Phone number

### Team Assignment
- Usernames must exist in the Pegawai table
- `jabatan` is automatically derived from the user's role in Pegawai
- Supported roles: ADMIN, PM, PROGRAMMER, TESTER, etc.

## Important Notes

1. **API Key Authentication**: Must include `X-API-Key` header with valid API key
2. **PICs are External Data**: PICs don't need to exist in the database - they're stored as JSON
3. **Team Members Must Exist**: All team usernames must exist in the Pegawai table
4. **Automatic Blueprint Creation**: Blueprint is automatically created in DRAFT status
5. **Transaction Safety**: All operations are performed in a single database transaction
6. **Unique Project Codes**: Project codes must be unique across the entire system
