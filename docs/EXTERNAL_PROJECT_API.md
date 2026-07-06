# External Project API Documentation

API CRUD untuk manajemen Project (Proyek) tanpa autentikasi.

## Base URL

```
Development: http://localhost:3000/api/external/projects
Production: https://your-domain.com/api/external/projects
```

## Endpoints

### 1. List Projects

**GET** `/api/external/projects`

Mengambil daftar project dengan pagination dan filter.

**Query Parameters:**
- `q` (string, optional) - Search by project code, name, or client
- `type` (string, optional) - Filter by type: `BLUEPRINT`, `DEVELOPMENT`, `SUPPORT`
- `isActive` (string, optional) - Filter by status: `true` or `false`
- `page` (number, optional) - Page number (default: 1)
- `size` (number, optional) - Items per page (default: 50, max: 100)

**Response:**
```json
{
  "success": true,
  "data": {
    "projects": [
      {
        "id": 1,
        "noUrut": 1,
        "projectCode": "PRJ-001",
        "projectName": "Sistem Logbook",
        "crmId": "CRM-12345",
        "department": {
          "id": "DEP-001",
          "name": "IT Department"
        },
        "projectNameCrm": "Logbook System",
        "isActive": true,
        "client": "PT. ABC Indonesia",
        "pic": "John Manager",
        "type": "DEVELOPMENT",
        "createdAt": "2025-01-01T00:00:00.000Z",
        "updatedAt": "2025-03-26T10:00:00.000Z"
      }
    ],
    "pagination": {
      "total": 50,
      "page": 1,
      "size": 50,
      "totalPages": 1
    }
  }
}
```

**Example:**
```bash
curl -X GET "http://localhost:3000/api/external/projects?type=DEVELOPMENT&page=1&size=20"
```

---

### 2. Get Project by ID

**GET** `/api/external/projects/{id}`

Mengambil detail project berdasarkan ID.

**Path Parameters:**
- `id` (number, required) - Project ID

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "noUrut": 1,
    "projectCode": "PRJ-001",
    "projectName": "Sistem Logbook",
    "crmId": "CRM-12345",
    "department": {
      "id": "DEP-001",
      "name": "IT Department"
    },
    "projectNameCrm": "Logbook System",
    "isActive": true,
    "client": "PT. ABC Indonesia",
    "pic": "John Manager",
    "type": "DEVELOPMENT",
    "createdAt": "2025-01-01T00:00:00.000Z",
    "updatedAt": "2025-03-26T10:00:00.000Z"
  }
}
```

**Example:**
```bash
curl -X GET "http://localhost:3000/api/external/projects/1"
```

---

### 3. Create Project

**POST** `/api/external/projects`

Membuat project baru.

**Request Body:**
```json
{
  "projectCode": "PRJ-002",
  "projectName": "New Project",
  "client": "PT. XYZ Indonesia",
  "pic": "Jane Manager",
  "type": "DEVELOPMENT",
  "crmId": "CRM-67890",
  "departmentId": "DEP-002",
  "departmentName": "Marketing Department",
  "projectNameCrm": "Marketing System",
  "isActive": true
}
```

**Fields:**
- `projectCode` (string, required) - Unique project code
- `projectName` (string, required) - Project name
- `client` (string, optional) - Client/company name
- `pic` (string, optional) - Person In Charge
- `type` (string, optional) - Project type (default: `DEVELOPMENT`)
  - Valid values: `BLUEPRINT`, `DEVELOPMENT`, `SUPPORT`
- `crmId` (string, optional) - CRM system ID
- `departmentId` (string, optional) - Department ID
- `departmentName` (string, optional) - Department name
- `projectNameCrm` (string, optional) - Project name in CRM
- `isActive` (boolean, optional) - Active status (default: `true`)

**Response:**
```json
{
  "success": true,
  "message": "Project created successfully",
  "data": {
    "id": 2,
    "noUrut": 2,
    "projectCode": "PRJ-002",
    "projectName": "New Project",
    "crmId": "CRM-67890",
    "department": {
      "id": "DEP-002",
      "name": "Marketing Department"
    },
    "projectNameCrm": "Marketing System",
    "isActive": true,
    "client": "PT. XYZ Indonesia",
    "pic": "Jane Manager",
    "type": "DEVELOPMENT",
    "createdAt": "2025-03-26T10:00:00.000Z",
    "updatedAt": "2025-03-26T10:00:00.000Z"
  }
}
```

**Example:**
```bash
curl -X POST "http://localhost:3000/api/external/projects" \
  -H "Content-Type: application/json" \
  -d '{
    "projectCode": "PRJ-002",
    "projectName": "New Project",
    "client": "PT. XYZ Indonesia",
    "type": "DEVELOPMENT"
  }'
```

---

### 4. Update Project

**PUT** `/api/external/projects/{id}`

Update project data. Semua field bersifat optional.

**Path Parameters:**
- `id` (number, required) - Project ID

**Request Body:**
```json
{
  "projectName": "Updated Project Name",
  "client": "PT. ABC Updated",
  "pic": "New Manager",
  "type": "SUPPORT",
  "isActive": false
}
```

**Response:**
```json
{
  "success": true,
  "message": "Project updated successfully",
  "data": {
    "id": 2,
    "noUrut": 2,
    "projectCode": "PRJ-002",
    "projectName": "Updated Project Name",
    "crmId": "CRM-67890",
    "department": {
      "id": "DEP-002",
      "name": "Marketing Department"
    },
    "projectNameCrm": "Marketing System",
    "isActive": false,
    "client": "PT. ABC Updated",
    "pic": "New Manager",
    "type": "SUPPORT",
    "createdAt": "2025-03-26T10:00:00.000Z",
    "updatedAt": "2025-03-26T10:30:00.000Z"
  }
}
```

**Example:**
```bash
curl -X PUT "http://localhost:3000/api/external/projects/2" \
  -H "Content-Type: application/json" \
  -d '{
    "projectName": "Updated Project Name",
    "type": "SUPPORT"
  }'
```

---

### 5. Delete Project

**DELETE** `/api/external/projects/{id}`

Menghapus project. Akan gagal jika project memiliki relasi dengan data lain.

**Path Parameters:**
- `id` (number, required) - Project ID

**Response (Success):**
```json
{
  "success": true,
  "message": "Project deleted successfully",
  "data": {
    "id": 2,
    "projectCode": "PRJ-002",
    "projectName": "New Project"
  }
}
```

**Response (Failed - Has Relations):**
```json
{
  "success": false,
  "error": "Cannot delete project with existing relations",
  "details": "Project has: 3 blueprints, 5 EUT tests, 2 UAT tests",
  "suggestion": "Please remove these relations before deleting the project"
}
```

**Example:**
```bash
curl -X DELETE "http://localhost:3000/api/external/projects/2"
```

---

## Error Responses

### 400 Bad Request
```json
{
  "success": false,
  "error": "Missing required fields: projectCode and projectName are required"
}
```

### 404 Not Found
```json
{
  "success": false,
  "error": "Project not found"
}
```

### 409 Conflict
```json
{
  "success": false,
  "error": "Project code 'PRJ-001' already exists"
}
```

### 500 Internal Server Error
```json
{
  "success": false,
  "error": "Failed to create project",
  "details": "Database connection error"
}
```

---

## Project Types

- `BLUEPRINT` - Tahap perencanaan/blueprint
- `DEVELOPMENT` - Tahap development (default)
- `SUPPORT` - Maintenance/support

---

## Complete Examples

### JavaScript/Node.js

```javascript
const API_BASE = 'http://localhost:3000/api/external/projects';

// List projects
const response = await fetch(`${API_BASE}?page=1&size=20`);
const { data } = await response.json();
console.log(data.projects);

// Create project
const newProject = await fetch(API_BASE, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    projectCode: 'PRJ-002',
    projectName: 'New Project',
    client: 'PT. ABC',
    type: 'DEVELOPMENT'
  })
});
const result = await newProject.json();
console.log(result.data);

// Update project
const updated = await fetch(`${API_BASE}/2`, {
  method: 'PUT',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    projectName: 'Updated Name',
    isActive: false
  })
});

// Delete project
const deleted = await fetch(`${API_BASE}/2`, {
  method: 'DELETE'
});
```

### Python

```python
import requests

API_BASE = 'http://localhost:3000/api/external/projects'

# List projects
response = requests.get(f'{API_BASE}?page=1&size=20')
projects = response.json()['data']['projects']

# Create project
new_project = requests.post(
    API_BASE,
    headers={'Content-Type': 'application/json'},
    json={
        'projectCode': 'PRJ-002',
        'projectName': 'New Project',
        'client': 'PT. ABC',
        'type': 'DEVELOPMENT'
    }
)
result = new_project.json()

# Update project
updated = requests.put(
    f'{API_BASE}/2',
    headers={'Content-Type': 'application/json'},
    json={'projectName': 'Updated Name'}
)

# Delete project
deleted = requests.delete(f'{API_BASE}/2')
```

---

## Security Notes

⚠️ API tidak memerlukan autentikasi. Untuk production:
- Gunakan firewall/network security
- Implementasikan IP whitelisting
- Gunakan HTTPS

---

**Built for Logbook Management System** 🚀
