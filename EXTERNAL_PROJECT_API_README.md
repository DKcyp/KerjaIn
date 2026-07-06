# External Project API - README

API CRUD untuk Project (Proyek) - Tanpa Autentikasi

## 🎯 Endpoints

```
GET    /api/external/projects          - List projects
GET    /api/external/projects/{id}     - Get project detail
POST   /api/external/projects          - Create project
PUT    /api/external/projects/{id}     - Update project
DELETE /api/external/projects/{id}     - Delete project
```

## ⚡ Quick Examples

```bash
# List projects
curl http://localhost:3000/api/external/projects

# Create project (minimal)
curl -X POST http://localhost:3000/api/external/projects \
  -H "Content-Type: application/json" \
  -d '{
    "projectCode":"PRJ-002",
    "projectName":"New Project"
  }'

# Create project (full)
curl -X POST http://localhost:3000/api/external/projects \
  -H "Content-Type: application/json" \
  -d '{
    "projectCode":"PRJ-002",
    "projectName":"New Project",
    "client":"PT. ABC",
    "pic":"John Manager",
    "type":"DEVELOPMENT",
    "crmId":"CRM-001",
    "departmentId":"DEP-001",
    "departmentName":"IT Department"
  }'

# Get project
curl http://localhost:3000/api/external/projects/1

# Update project
curl -X PUT http://localhost:3000/api/external/projects/1 \
  -H "Content-Type: application/json" \
  -d '{"projectName":"Updated Name","type":"SUPPORT"}'

# Delete project
curl -X DELETE http://localhost:3000/api/external/projects/1
```

## 📚 Documentation

- **📖 Full Documentation**: [docs/EXTERNAL_PROJECT_API.md](docs/EXTERNAL_PROJECT_API.md)

## 🧪 Testing

```bash
node test-external-project-api.js
```

## ✨ Features

- ✅ CRUD operations
- ✅ Pagination & search
- ✅ Filter by type & status
- ✅ Department info (idDep, depNama)
- ✅ CRM integration fields
- ✅ Relation checking
- ✅ No authentication required

## 📊 Project Types

- `BLUEPRINT` - Tahap perencanaan
- `DEVELOPMENT` - Tahap development (default)
- `SUPPORT` - Maintenance/support

## 🗂️ Fields

### Required
- `projectCode` - Kode proyek (unique)
- `projectName` - Nama proyek

### Optional
- `client` - Nama client
- `pic` - Person In Charge
- `type` - Tipe proyek (default: DEVELOPMENT)
- `crmId` - ID dari CRM
- `departmentId` - ID departemen
- `departmentName` - Nama departemen
- `projectNameCrm` - Nama proyek di CRM
- `isActive` - Status aktif (default: true)

## 🔒 Security

⚠️ API tidak memerlukan autentikasi. Untuk production:
- Gunakan firewall/network security
- Implementasikan IP whitelisting
- Gunakan HTTPS

---

**Ready to use!** 🚀
