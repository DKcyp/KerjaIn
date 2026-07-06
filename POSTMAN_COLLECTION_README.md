# Postman Collection - Logbook External API

Collection Postman untuk testing User API dan Project API dengan mudah.

## 📦 What's Included

```
postman/
├── External-API-Collection.postman_collection.json     # 15 API requests
├── External-API-Environment.postman_environment.json   # Development env
├── External-API-Production.postman_environment.json    # Production env
├── README.md                                           # Full documentation
└── QUICK_IMPORT_GUIDE.md                               # Quick start
```

## 🚀 Quick Start (3 Steps)

### 1. Import Collection
```
Postman → Import → Drag file: External-API-Collection.postman_collection.json
```

### 2. Import Environment
```
Postman → Import → Drag file: External-API-Environment.postman_environment.json
```

### 3. Set Environment
```
Dropdown (kanan atas) → Select: "Logbook External API - Development"
```

**Done!** 🎉

---

## 📋 Available Requests

### User API (7 requests)
- ✅ List Users (with pagination & filter)
- ✅ Get User by ID
- ✅ Create User (Minimal)
- ✅ Create User (Full)
- ✅ Update User
- ✅ Update User Password
- ✅ Delete User

### Project API (7 requests)
- ✅ List Projects (with pagination & filter)
- ✅ Get Project by ID
- ✅ Create Project (Minimal)
- ✅ Create Project (Full)
- ✅ Update Project
- ✅ Update Project Status Only
- ✅ Delete Project

### Health Check (1 request)
- ✅ Check API Status

**Total: 15 requests** ready to use!

---

## 🎯 Example Usage

### Test User API
```
1. Health Check → Check API Status
2. User API → List Users
3. User API → Create User (Minimal)
4. User API → Get User by ID (ganti ID dengan hasil create)
5. User API → Update User
6. User API → Delete User
```

### Test Project API
```
1. Project API → List Projects
2. Project API → Create Project (Full)
3. Project API → Get Project by ID
4. Project API → Update Project
5. Project API → Delete Project
```

---

## 🔧 Environment Variables

### Development
```json
{
  "base_url": "http://localhost:3000"
}
```

### Production
```json
{
  "base_url": "https://your-domain.com"
}
```

Ganti `your-domain.com` dengan domain production Anda.

---

## 📖 Documentation

- **Quick Import**: `postman/QUICK_IMPORT_GUIDE.md`
- **Full Guide**: `postman/README.md`
- **User API Docs**: `docs/EXTERNAL_USER_API.md`
- **Project API Docs**: `docs/EXTERNAL_PROJECT_API.md`

---

## ✅ Prerequisites

Sebelum testing:
- ✅ Next.js server running: `npm run dev`
- ✅ Database PostgreSQL running
- ✅ Prisma generated: `npm run prisma:generate`

---

## 💡 Tips

### Save Response ID
Tambahkan di **Tests** tab:
```javascript
const response = pm.response.json();
if (response.success && response.data.id) {
    pm.environment.set("user_id", response.data.id);
}
```

### Use Saved ID
Di request berikutnya:
```
GET {{base_url}}/api/external/users/{{user_id}}
```

### Run All Tests
```
Right-click collection → Run collection → Run
```

---

## 🐛 Troubleshooting

| Error | Solution |
|-------|----------|
| Could not get response | Check server: `npm run dev` |
| 404 Not Found | Check endpoint URL |
| 500 Server Error | Check server logs |
| Variable not replaced | Set environment (dropdown kanan atas) |

---

## 🎓 Learn More

- [Postman Learning Center](https://learning.postman.com/)
- [API Testing Guide](https://www.postman.com/api-platform/api-testing/)
- [Collection Runner](https://learning.postman.com/docs/running-collections/intro-to-collection-runs/)

---

**Ready to test!** 🚀

Import collection sekarang dan mulai testing API Anda.
