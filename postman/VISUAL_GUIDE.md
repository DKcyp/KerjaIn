# Visual Guide - Import Postman Collection

Panduan visual step-by-step untuk import dan menggunakan Postman Collection.

## 📥 Step 1: Import Collection

### 1.1 Buka Postman
- Launch aplikasi Postman di komputer Anda

### 1.2 Klik Import Button
```
┌─────────────────────────────────────────┐
│  Postman                                │
│  ┌────────┐                             │
│  │ Import │  ← Klik tombol ini          │
│  └────────┘                             │
│                                         │
│  Collections                            │
│  └─ My Workspace                        │
└─────────────────────────────────────────┘
```

### 1.3 Drag & Drop File
```
┌─────────────────────────────────────────┐
│  Import                            [X]  │
│  ┌───────────────────────────────────┐  │
│  │                                   │  │
│  │   Drag & drop file here          │  │
│  │                                   │  │
│  │   External-API-Collection.       │  │
│  │   postman_collection.json        │  │
│  │                                   │  │
│  └───────────────────────────────────┘  │
│                                         │
│  [Import]                               │
└─────────────────────────────────────────┘
```

### 1.4 Confirm Import
```
✅ Collection imported successfully!
   "Logbook External API" (15 requests)
```

---

## 🌍 Step 2: Import Environment

### 2.1 Klik Import Lagi
```
┌─────────────────────────────────────────┐
│  Postman                                │
│  ┌────────┐                             │
│  │ Import │  ← Klik lagi                │
│  └────────┘                             │
└─────────────────────────────────────────┘
```

### 2.2 Drag Environment File
```
┌─────────────────────────────────────────┐
│  Import                            [X]  │
│  ┌───────────────────────────────────┐  │
│  │                                   │  │
│  │   External-API-Environment.      │  │
│  │   postman_environment.json       │  │
│  │                                   │  │
│  └───────────────────────────────────┘  │
│                                         │
│  [Import]                               │
└─────────────────────────────────────────┘
```

### 2.3 Confirm Import
```
✅ Environment imported successfully!
   "Logbook External API - Development"
```

---

## ⚙️ Step 3: Set Active Environment

### 3.1 Klik Environment Dropdown
```
┌─────────────────────────────────────────┐
│  Postman                                │
│                    ┌──────────────────┐ │
│                    │ No Environment ▼ │ │ ← Klik dropdown ini
│                    └──────────────────┘ │
└─────────────────────────────────────────┘
```

### 3.2 Pilih Environment
```
┌─────────────────────────────────────────┐
│  Select Environment                     │
│  ┌────────────────────────────────────┐ │
│  │ No Environment                     │ │
│  │ ────────────────────────────────── │ │
│  │ ✓ Logbook External API - Dev      │ │ ← Pilih ini
│  │   Logbook External API - Prod     │ │
│  └────────────────────────────────────┘ │
└─────────────────────────────────────────┘
```

### 3.3 Environment Active
```
┌─────────────────────────────────────────┐
│  Postman                                │
│              ┌────────────────────────┐ │
│              │ Logbook External... ▼ │ │ ✅ Active!
│              └────────────────────────┘ │
└─────────────────────────────────────────┘
```

---

## 🧪 Step 4: Test First Request

### 4.1 Expand Collection
```
Collections
└─ 📁 Logbook External API          ← Klik untuk expand
   ├─ 📁 User API
   ├─ 📁 Project API
   └─ 📁 Health Check
```

### 4.2 Select Request
```
Collections
└─ 📁 Logbook External API
   └─ 📁 Health Check               ← Expand ini
      └─ 📄 Check API Status        ← Klik ini
```

### 4.3 Send Request
```
┌─────────────────────────────────────────┐
│  GET {{base_url}}/api/external/users    │
│                                         │
│  Params  Authorization  Headers  Body  │
│  ┌────────────────────────────────────┐ │
│  │ Query Params                       │ │
│  │ page    1                          │ │
│  │ size    1                          │ │
│  └────────────────────────────────────┘ │
│                                         │
│  [Send] ← Klik tombol ini               │
└─────────────────────────────────────────┘
```

### 4.4 View Response
```
┌─────────────────────────────────────────┐
│  Response                               │
│  Status: 200 OK  Time: 45ms  Size: 1KB │
│  ┌────────────────────────────────────┐ │
│  │ Body  Cookies  Headers  Test       │ │
│  │ {                                  │ │
│  │   "success": true,                 │ │
│  │   "data": {                        │ │
│  │     "users": [...],                │ │
│  │     "pagination": {...}            │ │
│  │   }                                │ │
│  │ }                                  │ │
│  └────────────────────────────────────┘ │
└─────────────────────────────────────────┘
```

✅ **Success!** API berjalan dengan baik.

---

## 📋 Step 5: Test User API

### 5.1 List Users
```
User API → List Users → Send
Response: 200 OK ✅
```

### 5.2 Create User
```
User API → Create User (Minimal) → Send

Body:
{
  "name": "John Doe",
  "phone": "08123456789"
}

Response: 201 Created ✅
{
  "success": true,
  "data": {
    "id": 5,  ← Save ID ini
    ...
  }
}
```

### 5.3 Get User by ID
```
User API → Get User by ID

URL: /api/external/users/5  ← Ganti dengan ID dari step 5.2

Response: 200 OK ✅
```

### 5.4 Update User
```
User API → Update User

URL: /api/external/users/5
Body:
{
  "name": "John Doe Updated",
  "role": "PM"
}

Response: 200 OK ✅
```

### 5.5 Delete User
```
User API → Delete User

URL: /api/external/users/5

Response: 200 OK ✅
```

---

## 📋 Step 6: Test Project API

### 6.1 List Projects
```
Project API → List Projects → Send
Response: 200 OK ✅
```

### 6.2 Create Project
```
Project API → Create Project (Full) → Send

Body:
{
  "projectCode": "PRJ-002",
  "projectName": "New Project",
  "client": "PT. ABC",
  "type": "DEVELOPMENT"
}

Response: 201 Created ✅
{
  "success": true,
  "data": {
    "id": 2,  ← Save ID ini
    ...
  }
}
```

### 6.3 Get Project by ID
```
Project API → Get Project by ID

URL: /api/external/projects/2

Response: 200 OK ✅
```

### 6.4 Update Project
```
Project API → Update Project

URL: /api/external/projects/2
Body:
{
  "projectName": "Updated Project",
  "type": "SUPPORT"
}

Response: 200 OK ✅
```

### 6.5 Delete Project
```
Project API → Delete Project

URL: /api/external/projects/2

Response: 200 OK ✅
```

---

## 🎯 Quick Reference

### Keyboard Shortcuts
```
Ctrl + Enter (Win) / Cmd + Enter (Mac)  = Send request
Ctrl + S                                = Save request
Ctrl + K                                = Search
```

### Status Codes
```
✅ 200 OK          = Success
✅ 201 Created     = Resource created
❌ 400 Bad Request = Invalid input
❌ 404 Not Found   = Resource not found
❌ 409 Conflict    = Duplicate data
❌ 500 Server Error = Server problem
```

### Common Errors
```
❌ Could not get response
   → Check: npm run dev

❌ 404 Not Found
   → Check: URL endpoint

❌ Variable not replaced
   → Check: Environment selected
```

---

## 💡 Pro Tips

### 1. Save Response to Variable
```javascript
// Tests tab
const response = pm.response.json();
pm.environment.set("user_id", response.data.id);
```

### 2. Use Variable in Next Request
```
GET {{base_url}}/api/external/users/{{user_id}}
```

### 3. Run All Requests
```
Right-click collection → Run collection
```

### 4. Export Collection
```
Collection → ... → Export → Collection v2.1
```

---

## ✅ Checklist

Sebelum testing:
- [ ] Postman installed
- [ ] Collection imported
- [ ] Environment imported
- [ ] Environment selected
- [ ] Server running (`npm run dev`)
- [ ] Database running

---

**Happy Testing!** 🚀

Jika ada masalah, cek: `postman/README.md` untuk troubleshooting lengkap.
