# External User API - README

API CRUD untuk User (Pegawai) dan User Roles - Tanpa Autentikasi

## 🎯 Endpoints

```
GET    /api/external/users          - List users
GET    /api/external/users/{id}     - Get user detail
POST   /api/external/users          - Create user
PUT    /api/external/users/{id}     - Update user
DELETE /api/external/users/{id}     - Delete user
```

## ⚡ Quick Examples

```bash
# List users
curl http://localhost:3000/api/external/users

# Create user
curl -X POST http://localhost:3000/api/external/users \
  -H "Content-Type: application/json" \
  -d '{"name":"John Doe","phone":"08123456789"}'

# Get user
curl http://localhost:3000/api/external/users/1

# Update user
curl -X PUT http://localhost:3000/api/external/users/1 \
  -H "Content-Type: application/json" \
  -d '{"name":"John Updated"}'

# Delete user
curl -X DELETE http://localhost:3000/api/external/users/1
```

## 📚 Documentation

- **📖 Full Documentation**: [docs/EXTERNAL_USER_API.md](docs/EXTERNAL_USER_API.md)
- **🚀 Quick Start**: [docs/EXTERNAL_USER_API_QUICK_START.md](docs/EXTERNAL_USER_API_QUICK_START.md)
- **📝 Summary**: [docs/EXTERNAL_USER_API_SUMMARY.md](docs/EXTERNAL_USER_API_SUMMARY.md)

## 🧪 Testing

```bash
node test-external-user-api.js
```

## ✨ Features

- ✅ CRUD operations
- ✅ Pagination & search
- ✅ Password hashing (bcrypt)
- ✅ UserRole management
- ✅ Relation checking
- ✅ No authentication required

## 🔒 Security

⚠️ API tidak memerlukan autentikasi. Untuk production:
- Gunakan firewall/network security
- Implementasikan IP whitelisting
- Gunakan HTTPS

---

**Ready to use!** 🚀
