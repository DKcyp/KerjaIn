# Postman Collection - Logbook External API

Collection Postman untuk testing User API dan Project API.

## 📦 Files

```
postman/
├── External-API-Collection.postman_collection.json    # Main collection
├── External-API-Environment.postman_environment.json  # Development environment
├── External-API-Production.postman_environment.json   # Production environment
└── README.md                                          # This file
```

## 🚀 Quick Start

### 1. Import Collection ke Postman

**Cara 1: Import File**
1. Buka Postman
2. Klik **Import** (tombol di kiri atas)
3. Pilih **File** tab
4. Drag & drop file `External-API-Collection.postman_collection.json`
5. Klik **Import**

**Cara 2: Import dari Folder**
1. Buka Postman
2. Klik **Import**
3. Pilih **Folder** tab
4. Pilih folder `postman/`
5. Klik **Import**

### 2. Import Environment

1. Klik **Import** lagi
2. Pilih file environment:
   - `External-API-Environment.postman_environment.json` (untuk development)
   - `External-API-Production.postman_environment.json` (untuk production)
3. Klik **Import**

### 3. Set Active Environment

1. Klik dropdown environment di kanan atas (biasanya tertulis "No Environment")
2. Pilih **Logbook External API - Development**

### 4. Test API

1. Expand collection **Logbook External API**
2. Pilih request yang ingin di-test
3. Klik **Send**

---

## 📚 Collection Structure

### **User API** (7 requests)
```
├── List Users              GET    /api/external/users
├── Get User by ID          GET    /api/external/users/{id}
├── Create User (Minimal)   POST   /api/external/users
├── Create User (Full)      POST   /api/external/users
├── Update User             PUT    /api/external/users/{id}
├── Update User Password    PUT    /api/external/users/{id}
└── Delete User             DELETE /api/external/users/{id}
```

### **Project API** (7 requests)
```
├── List Projects              GET    /api/external/projects
├── Get Project by ID          GET    /api/external/projects/{id}
├── Create Project (Minimal)   POST   /api/external/projects
├── Create Project (Full)      POST   /api/external/projects
├── Update Project             PUT    /api/external/projects/{id}
├── Update Project Status Only PUT    /api/external/projects/{id}
└── Delete Project             DELETE /api/external/projects/{id}
```

### **Health Check** (1 request)
```
└── Check API Status        GET    /api/external/users?page=1&size=1
```

---

## 🔧 Environment Variables

### Development Environment
```json
{
  "base_url": "http://localhost:3000",
  "user_id": "",
  "project_id": ""
}
```

### Production Environment
```json
{
  "base_url": "https://your-domain.com",
  "user_id": "",
  "project_id": ""
}
```

**Cara menggunakan variable:**
- Di URL: `{{base_url}}/api/external/users`
- Di Body: `"userId": {{user_id}}`

---

## 📝 Request Examples

### 1. List Users dengan Filter

**Request:**
```
GET {{base_url}}/api/external/users?page=1&size=20&role=PROGRAMMER
```

**Query Parameters:**
- `page` = 1
- `size` = 20
- `role` = PROGRAMMER (optional)
- `q` = search term (optional)

### 2. Create User

**Request:**
```
POST {{base_url}}/api/external/users
Content-Type: application/json
```

**Body:**
```json
{
  "name": "John Doe",
  "phone": "08123456789",
  "username": "john.doe",
  "password": "password123",
  "role": "PROGRAMMER"
}
```

### 3. Update User

**Request:**
```
PUT {{base_url}}/api/external/users/5
Content-Type: application/json
```

**Body:**
```json
{
  "name": "John Doe Updated",
  "role": "PM"
}
```

### 4. Create Project

**Request:**
```
POST {{base_url}}/api/external/projects
Content-Type: application/json
```

**Body:**
```json
{
  "projectCode": "PRJ-002",
  "projectName": "New Project",
  "client": "PT. ABC",
  "type": "DEVELOPMENT",
  "departmentId": "DEP-001",
  "departmentName": "IT Department"
}
```

---

## 🎯 Testing Workflow

### Test User API (Complete Flow)

1. **List Users** - Lihat user yang ada
2. **Create User (Full)** - Buat user baru
3. **Get User by ID** - Ambil detail user yang baru dibuat
4. **Update User** - Update data user
5. **Delete User** - Hapus user (jika tidak ada relasi)

### Test Project API (Complete Flow)

1. **List Projects** - Lihat project yang ada
2. **Create Project (Full)** - Buat project baru
3. **Get Project by ID** - Ambil detail project yang baru dibuat
4. **Update Project** - Update data project
5. **Delete Project** - Hapus project (jika tidak ada relasi)

---

## 🔍 Tips & Tricks

### 1. Save Response to Variable

Untuk menyimpan ID dari response ke variable:

**Tests Tab (di request Create User):**
```javascript
// Parse response
const response = pm.response.json();

// Save user ID to environment
if (response.success && response.data.id) {
    pm.environment.set("user_id", response.data.id);
    console.log("User ID saved:", response.data.id);
}
```

### 2. Use Variable in URL

Setelah save ID, gunakan di request berikutnya:
```
GET {{base_url}}/api/external/users/{{user_id}}
```

### 3. Pre-request Script

Untuk generate data dinamis:

**Pre-request Script:**
```javascript
// Generate random username
const timestamp = Date.now();
pm.environment.set("random_username", `user_${timestamp}`);

// Generate random project code
pm.environment.set("random_project_code", `PRJ-${timestamp}`);
```

**Body:**
```json
{
  "username": "{{random_username}}",
  "projectCode": "{{random_project_code}}"
}
```

### 4. Test Assertions

Tambahkan di **Tests** tab untuk validasi response:

```javascript
// Check status code
pm.test("Status code is 200", function () {
    pm.response.to.have.status(200);
});

// Check response structure
pm.test("Response has success field", function () {
    const response = pm.response.json();
    pm.expect(response).to.have.property('success');
    pm.expect(response.success).to.be.true;
});

// Check data exists
pm.test("Response has data", function () {
    const response = pm.response.json();
    pm.expect(response).to.have.property('data');
});
```

---

## 🐛 Troubleshooting

### Error: "Could not get response"

**Solusi:**
1. Pastikan server Next.js berjalan: `npm run dev`
2. Check URL di environment: `http://localhost:3000` (tanpa trailing slash)
3. Test di browser: `http://localhost:3000/api/external/users`

### Error: 404 Not Found

**Solusi:**
1. Pastikan endpoint URL benar
2. Check apakah file route.ts ada di folder yang benar
3. Restart Next.js server

### Error: 500 Internal Server Error

**Solusi:**
1. Check console log di terminal Next.js
2. Pastikan database connection berjalan
3. Check Prisma schema sudah di-generate: `npm run prisma:generate`

### Response Kosong

**Solusi:**
1. Check apakah ada data di database
2. Gunakan request "List Users" atau "List Projects" untuk cek data
3. Buat data baru dengan request "Create"

---

## 📖 Additional Resources

- **Full API Documentation**: 
  - User API: `docs/EXTERNAL_USER_API.md`
  - Project API: `docs/EXTERNAL_PROJECT_API.md`

- **Test Scripts**:
  - User API: `test-external-user-api.js`
  - Project API: `test-external-project-api.js`

- **Quick Start**:
  - User API: `docs/EXTERNAL_USER_API_QUICK_START.md`
  - Project API: `EXTERNAL_PROJECT_API_README.md`

---

## 🎓 Learning Resources

### Postman Basics
- [Postman Learning Center](https://learning.postman.com/)
- [Variables in Postman](https://learning.postman.com/docs/sending-requests/variables/)
- [Writing Tests](https://learning.postman.com/docs/writing-scripts/test-scripts/)

### API Testing
- [REST API Testing](https://www.postman.com/api-platform/api-testing/)
- [Collection Runner](https://learning.postman.com/docs/running-collections/intro-to-collection-runs/)

---

## ✅ Checklist

Sebelum testing, pastikan:

- [ ] Next.js server berjalan (`npm run dev`)
- [ ] Database PostgreSQL berjalan
- [ ] Prisma Client sudah di-generate (`npm run prisma:generate`)
- [ ] Collection sudah di-import ke Postman
- [ ] Environment sudah di-set (Development/Production)
- [ ] Base URL sudah benar di environment

---

**Happy Testing!** 🚀

Jika ada pertanyaan atau issue, silakan cek dokumentasi lengkap di folder `docs/`.
