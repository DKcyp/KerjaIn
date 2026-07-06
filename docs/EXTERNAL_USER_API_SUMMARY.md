# External User API - Summary

API CRUD untuk manajemen User (Pegawai) dan User Roles tanpa autentikasi.

## 📍 Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/external/users` | List users dengan pagination & filter |
| GET | `/api/external/users/{id}` | Get user detail by ID |
| POST | `/api/external/users` | Create new user |
| PUT | `/api/external/users/{id}` | Update user |
| DELETE | `/api/external/users/{id}` | Delete user |

## 🚀 Quick Start

### List Users
```bash
curl http://localhost:3000/api/external/users?page=1&size=20
```

### Create User
```bash
curl -X POST http://localhost:3000/api/external/users \
  -H "Content-Type: application/json" \
  -d '{"name":"John Doe","phone":"08123456789"}'
```

### Update User
```bash
curl -X PUT http://localhost:3000/api/external/users/5 \
  -H "Content-Type: application/json" \
  -d '{"name":"John Updated","role":"PM"}'
```

### Delete User
```bash
curl -X DELETE http://localhost:3000/api/external/users/5
```

## 📊 Response Format

### Success
```json
{
  "success": true,
  "message": "Operation successful",
  "data": { ... }
}
```

### Error
```json
{
  "success": false,
  "error": "Error message",
  "details": "Additional details"
}
```

## 🔑 Features

✅ CRUD operations untuk User (Pegawai)  
✅ UserRole management (additional roles)  
✅ Password hashing dengan bcrypt  
✅ Pagination & search  
✅ Filter by role  
✅ Relation checking untuk delete  
✅ CORS enabled  
✅ No authentication required  

## 📦 Request Body Examples

### Create User (Minimal)
```json
{
  "name": "John Doe",
  "phone": "08123456789"
}
```

### Create User (Full)
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

### Update User
```json
{
  "name": "Jane Updated",
  "phone": "08199999999",
  "role": "PM",
  "additionalRoles": [1, 3]
}
```

## 🎯 Available Roles

- `SUPER_ADMIN` - Full system access
- `ADMIN` - Administrative access
- `PM` - Project Manager
- `PROGRAMMER` - Developer (default)

## ⚠️ Delete Restrictions

User tidak dapat dihapus jika memiliki relasi:
- EUT tests (approved/as tester)
- Go-lives created
- UAT tests
- Regions as PIC

## 🔗 Relations

### Pegawai (User) Table Relations:
- `UserRole` - Additional roles
- `UserPermission` - Custom permissions
- `EutTest` - EUT testing
- `UatTest` - UAT testing
- `GoLive` - Go-live management
- `Region` - Region management
- `Tasklist` - Task assignments
- `ProgrammerStatus` - Availability status

## 📝 Files Created

```
src/app/api/external/users/
├── route.ts                    # GET (list), POST (create)
└── [id]/
    └── route.ts                # GET (detail), PUT (update), DELETE

docs/
├── EXTERNAL_USER_API.md        # Full documentation
├── EXTERNAL_USER_API_QUICK_START.md  # Quick reference
└── EXTERNAL_USER_API_SUMMARY.md      # This file

test-external-user-api.js       # Test script
```

## 🧪 Testing

```bash
# Run test script
node test-external-user-api.js

# Manual test
curl http://localhost:3000/api/external/users?page=1&size=5
```

## 📚 Documentation

- **Full API Docs**: `docs/EXTERNAL_USER_API.md`
- **Quick Start**: `docs/EXTERNAL_USER_API_QUICK_START.md`
- **Test Script**: `test-external-user-api.js`

## 🔒 Security Notes

⚠️ **No Authentication Required**
- API dapat diakses tanpa API key
- Gunakan firewall/network security untuk production
- Implementasikan IP whitelisting
- Gunakan HTTPS di production

## ✅ What's Implemented

1. ✅ List users dengan pagination
2. ✅ Search & filter by role
3. ✅ Get user detail dengan roles & permissions
4. ✅ Create user dengan password hashing
5. ✅ Update user (partial updates)
6. ✅ Delete user dengan relation checking
7. ✅ UserRole management (additional roles)
8. ✅ CORS support
9. ✅ Error handling & validation
10. ✅ Complete documentation

---

**Built for Logbook Management System** 🚀
