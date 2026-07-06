# External User API Documentation

API eksternal untuk manajemen User (Pegawai) dan User Roles dalam sistem Logbook.

## Base URL

```
Development: http://localhost:3000/api/external/users
Production: https://your-domain.com/api/external/users
```

## Authentication

API ini tidak memerlukan autentikasi. Semua endpoint dapat diakses secara langsung.

## Endpoints

### 1. List Users

**GET** `/api/external/users`

Mengambil daftar user dengan pagination dan filter.

**Query Parameters:**
- `q` (string, optional) - Search by name or username
- `role` (string, optional) - Filter by role: `SUPER_ADMIN`, `PM`, `PROGRAMMER`, `ADMIN`
- `page` (number, optional) - Page number (default: 1)
- `size` (number, optional) - Items per page (default: 50, max: 100)

**Response:**
```json
{
  "success": true,
  "data": {
    "users": [
      {
        "id": 1,
        "noUrut": 1,
        "name": "John Doe",
        "phone": "08123456789",
        "username": "john.doe",
        "role": "PROGRAMMER",
        "sso": {
          "companyId": null,
          "roleId": null,
          "userId": null
        },
        "additionalRoles": [
          {
            "id": 1,
            "name": "developer",
            "displayName": "Developer"
          }
        ],
        "createdAt": "2025-01-01T00:00:00.000Z",
        "updatedAt": "2025-01-01T00:00:00.000Z"
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
curl -X GET "http://localhost:3000/api/external/users?role=PROGRAMMER&page=1&size=20"
```

---

### 2. Get User by ID

**GET** `/api/external/users/{id}`

Mengambil detail user berdasarkan ID, termasuk roles dan permissions.

**Path Parameters:**
- `id` (number, required) - User ID

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "noUrut": 1,
    "name": "John Doe",
    "phone": "08123456789",
    "username": "john.doe",
    "role": "PROGRAMMER",
    "sso": {
      "companyId": null,
      "roleId": null,
      "userId": null
    },
    "additionalRoles": [
      {
        "id": 1,
        "name": "developer",
        "displayName": "Developer",
        "description": "Developer role with code access"
      }
    ],
    "permissions": [
      {
        "id": 1,
        "name": "task.create",
        "displayName": "Create Task",
        "module": "task",
        "action": "create",
        "granted": true
      }
    ],
    "createdAt": "2025-01-01T00:00:00.000Z",
    "updatedAt": "2025-01-01T00:00:00.000Z"
  }
}
```

**Example:**
```bash
curl -X GET "http://localhost:3000/api/external/users/1"
```

---

### 3. Create User

**POST** `/api/external/users`

Membuat user baru dengan optional additional roles.

**Request Body:**
```json
{
  "name": "Jane Smith",
  "phone": "08198765432",
  "username": "jane.smith",
  "password": "securePassword123",
  "role": "PROGRAMMER",
  "additionalRoles": [1, 2]
}
```

**Fields:**
- `name` (string, required) - Full name
- `phone` (string, required) - Phone number
- `username` (string, optional) - Username for login
- `password` (string, optional) - Password (will be hashed)
- `role` (string, optional) - Primary role (default: `PROGRAMMER`)
  - Valid values: `SUPER_ADMIN`, `PM`, `PROGRAMMER`, `ADMIN`
- `additionalRoles` (array of numbers, optional) - Array of MasterRole IDs

**Response:**
```json
{
  "success": true,
  "message": "User created successfully",
  "data": {
    "id": 5,
    "noUrut": 5,
    "name": "Jane Smith",
    "phone": "08198765432",
    "username": "jane.smith",
    "role": "PROGRAMMER",
    "additionalRoles": [
      {
        "id": 1,
        "name": "developer",
        "displayName": "Developer"
      }
    ],
    "createdAt": "2025-03-26T10:00:00.000Z",
    "updatedAt": "2025-03-26T10:00:00.000Z"
  }
}
```

**Example:**
```bash
curl -X POST "http://localhost:3000/api/external/users" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Jane Smith",
    "phone": "08198765432",
    "username": "jane.smith",
    "password": "securePassword123",
    "role": "PROGRAMMER",
    "additionalRoles": [1]
  }'
```

---

### 4. Update User

**PUT** `/api/external/users/{id}`

Update user data. Semua field bersifat optional.

**Path Parameters:**
- `id` (number, required) - User ID

**Request Body:**
```json
{
  "name": "Jane Smith Updated",
  "phone": "08198765432",
  "username": "jane.smith.new",
  "password": "newPassword123",
  "role": "PM",
  "additionalRoles": [1, 2, 3]
}
```

**Fields:**
- `name` (string, optional) - Full name
- `phone` (string, optional) - Phone number
- `username` (string, optional) - Username
- `password` (string, optional) - New password (will be hashed)
- `role` (string, optional) - Primary role
- `additionalRoles` (array of numbers, optional) - Replace all additional roles with new ones

**Response:**
```json
{
  "success": true,
  "message": "User updated successfully",
  "data": {
    "id": 5,
    "noUrut": 5,
    "name": "Jane Smith Updated",
    "phone": "08198765432",
    "username": "jane.smith.new",
    "role": "PM",
    "additionalRoles": [
      {
        "id": 1,
        "name": "developer",
        "displayName": "Developer"
      },
      {
        "id": 2,
        "name": "reviewer",
        "displayName": "Code Reviewer"
      }
    ],
    "createdAt": "2025-03-26T10:00:00.000Z",
    "updatedAt": "2025-03-26T10:30:00.000Z"
  }
}
```

**Example:**
```bash
curl -X PUT "http://localhost:3000/api/external/users/5" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Jane Smith Updated",
    "role": "PM"
  }'
```

---

### 5. Delete User

**DELETE** `/api/external/users/{id}`

Menghapus user. Akan gagal jika user memiliki relasi penting dengan data lain.

**Path Parameters:**
- `id` (number, required) - User ID

**Response (Success):**
```json
{
  "success": true,
  "message": "User deleted successfully",
  "data": {
    "id": 5,
    "name": "Jane Smith"
  }
}
```

**Response (Failed - Has Relations):**
```json
{
  "success": false,
  "error": "Cannot delete user with existing relations",
  "details": "User has: 5 EUT tests approved, 3 UAT tests, 2 regions as PIC",
  "suggestion": "Please reassign or remove these relations before deleting the user"
}
```

**Example:**
```bash
curl -X DELETE "http://localhost:3000/api/external/users/5"
```

---

## Error Responses

### 400 Bad Request
```json
{
  "success": false,
  "error": "Missing required fields: name and phone are required"
}
```

### 404 Not Found
```json
{
  "success": false,
  "error": "User not found"
}
```

### 409 Conflict
```json
{
  "success": false,
  "error": "Username 'john.doe' already exists"
}
```

### 500 Internal Server Error
```json
{
  "success": false,
  "error": "Failed to create user",
  "details": "Database connection error"
}
```

---

## User Roles & Relations

### Primary Role (Enum)
User memiliki satu primary role yang tersimpan di field `role`:
- `SUPER_ADMIN` - Full system access
- `ADMIN` - Administrative access
- `PM` - Project Manager
- `PROGRAMMER` - Developer/Programmer

### Additional Roles (UserRole Table)
User dapat memiliki multiple additional roles dari table `MasterRole` melalui table `UserRole`.

**Relasi:**
- `Pegawai` → `UserRole` → `MasterRole`

### User Relations
User memiliki relasi ke banyak table:
- EUT Tests (as tester & approver)
- UAT Tests (as tester, approver, rejecter)
- Go-Live (as creator)
- Regions (as PIC & member)
- Tasks (as assignee & creator)
- Programmer Status
- Permissions (UserPermission)

**⚠️ Delete Restrictions:**
User tidak dapat dihapus jika memiliki relasi penting seperti:
- EUT tests approved/as tester
- Go-lives created
- UAT tests
- Regions as PIC

---

## Complete Examples

### JavaScript/Node.js

```javascript
const API_BASE = 'http://localhost:3000/api/external/users';

// List users
async function listUsers(role = null, page = 1) {
  const params = new URLSearchParams({ page, size: 20 });
  if (role) params.append('role', role);
  
  const response = await fetch(`${API_BASE}?${params}`);
  return response.json();
}

// Create user
async function createUser(userData) {
  const response = await fetch(API_BASE, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(userData)
  });
  return response.json();
}

// Update user
async function updateUser(userId, updates) {
  const response = await fetch(`${API_BASE}/${userId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(updates)
  });
  return response.json();
}

// Delete user
async function deleteUser(userId) {
  const response = await fetch(`${API_BASE}/${userId}`, {
    method: 'DELETE'
  });
  return response.json();
}

// Usage
const users = await listUsers('PROGRAMMER');
const newUser = await createUser({
  name: 'John Doe',
  phone: '08123456789',
  username: 'john.doe',
  password: 'password123',
  role: 'PROGRAMMER'
});
```

### Python

```python
import requests

API_BASE = 'http://localhost:3000/api/external/users'

# List users
def list_users(role=None, page=1):
    params = {'page': page, 'size': 20}
    if role:
        params['role'] = role
    
    response = requests.get(API_BASE, params=params)
    return response.json()

# Create user
def create_user(user_data):
    response = requests.post(
        API_BASE,
        headers={'Content-Type': 'application/json'},
        json=user_data
    )
    return response.json()

# Update user
def update_user(user_id, updates):
    response = requests.put(
        f'{API_BASE}/{user_id}',
        headers={'Content-Type': 'application/json'},
        json=updates
    )
    return response.json()

# Delete user
def delete_user(user_id):
    response = requests.delete(f'{API_BASE}/{user_id}')
    return response.json()

# Usage
users = list_users(role='PROGRAMMER')
new_user = create_user({
    'name': 'John Doe',
    'phone': '08123456789',
    'username': 'john.doe',
    'password': 'password123',
    'role': 'PROGRAMMER'
})
```

---

## Security Best Practices

1. **Password Handling**
   - Password di-hash menggunakan bcrypt (10 rounds)
   - Jangan log atau expose password dalam response

2. **Input Validation**
   - Semua input divalidasi sebelum diproses
   - Username harus unique
   - Role harus valid enum value

3. **CORS**
   - API menggunakan CORS headers untuk cross-origin requests
   - Sesuaikan `Access-Control-Allow-Origin` untuk production

4. **Rate Limiting**
   - Implementasikan rate limiting di production
   - Gunakan API gateway atau middleware

5. **Network Security**
   - Gunakan firewall untuk membatasi akses
   - Implementasikan IP whitelisting jika diperlukan
   - Gunakan HTTPS di production

---

## Testing

### Test List Users
```bash
curl -X GET "http://localhost:3000/api/external/users?page=1&size=1"
```

### Test Create User
```bash
curl -X POST "http://localhost:3000/api/external/users" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test User",
    "phone": "08123456789",
    "username": "test.user",
    "password": "test123",
    "role": "PROGRAMMER"
  }'
```

---

## Changelog

### Version 1.0.0 (2025-03-26)
- Initial release
- CRUD operations for User (Pegawai)
- UserRole management
- Relation checking for delete operations
- Password hashing with bcrypt
- Pagination support
- Search and filter capabilities

---

## Support

Untuk pertanyaan atau issue terkait External User API:
- Cek dokumentasi di `docs/EXTERNAL_USER_API.md`
- Review API Reference di `API_REFERENCE.md`
- Lihat contoh implementasi di file ini

---

**Built with ❤️ for Logbook Management System**
