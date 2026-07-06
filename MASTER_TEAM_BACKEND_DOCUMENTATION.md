# Master Team Backend Documentation

## 📋 Overview
Backend API untuk mengelola Master Team dengan fitur merge project. Sistem ini memungkinkan penggabungan multiple project dengan nama custom yang tersimpan di database.

## 🗄️ Database Schema

### Tables Created

#### 1. `master_team`
```sql
CREATE TABLE "master_team" (
    "id" SERIAL PRIMARY KEY,
    "nama" VARCHAR(255) NOT NULL,
    "deskripsi" TEXT,
    "type" "TeamType" NOT NULL DEFAULT 'PRODUCT',
    "parent_id" INTEGER,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
```

#### 2. `master_team_member`
```sql
CREATE TABLE "master_team_member" (
    "id" SERIAL PRIMARY KEY,
    "team_id" INTEGER NOT NULL,
    "pegawai_id" INTEGER NOT NULL,
    "role" VARCHAR(100) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
```

#### 3. `project_group` (untuk merge project)
```sql
CREATE TABLE "project_group" (
    "id" SERIAL PRIMARY KEY,
    "nama" VARCHAR(255) NOT NULL,        -- Nama custom untuk project gabungan
    "deskripsi" TEXT,
    "team_id" INTEGER NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
```

#### 4. `project_group_item` (relasi project dalam group)
```sql
CREATE TABLE "project_group_item" (
    "id" SERIAL PRIMARY KEY,
    "group_id" INTEGER NOT NULL,
    "project_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
```

#### 5. Modified `proyek` table
```sql
-- Added columns:
ALTER TABLE "proyek" ADD COLUMN "team_id" INTEGER;
ALTER TABLE "proyek" ADD COLUMN "isActive" BOOLEAN NOT NULL DEFAULT true;
```

## 🚀 API Endpoints

### 1. GET `/api/master-team`
**Deskripsi:** Mendapatkan semua tim dengan project yang dibawahinya

**Response:**
```json
{
  "success": true,
  "items": [
    {
      "id": 1,
      "noUrut": 1,
      "namaTeam": "Frontend Team",
      "deskripsi": "Tim frontend development",
      "projects": [
        {
          "id": "single_1",
          "namaDisplay": "E-Commerce Platform",
          "originalProjects": [
            {
              "id": 1,
              "kodeProyek": "PRJ001",
              "namaProyek": "E-Commerce Platform"
            }
          ],
          "isMerged": false
        },
        {
          "id": "merged_1",
          "namaDisplay": "Mobile Development Suite",
          "originalProjects": [
            {
              "id": 2,
              "kodeProyek": "PRJ002", 
              "namaProyek": "Mobile App"
            },
            {
              "id": 3,
              "kodeProyek": "PRJ003",
              "namaProyek": "Mobile API"
            }
          ],
          "isMerged": true
        }
      ]
    }
  ]
}
```

### 2. POST `/api/master-team`
**Deskripsi:** Membuat tim baru

**Request Body:**
```json
{
  "namaTeam": "New Team",
  "deskripsi": "Deskripsi tim",
  "projects": [
    {
      "id": "single_1",
      "namaDisplay": "Individual Project",
      "originalProjects": [
        {
          "id": 1,
          "kodeProyek": "PRJ001",
          "namaProyek": "Project Name"
        }
      ],
      "isMerged": false
    },
    {
      "id": "merged_123",
      "namaDisplay": "Custom Merged Name",
      "originalProjects": [
        {
          "id": 2,
          "kodeProyek": "PRJ002",
          "namaProyek": "Project A"
        },
        {
          "id": 3,
          "kodeProyek": "PRJ003", 
          "namaProyek": "Project B"
        }
      ],
      "isMerged": true
    }
  ]
}
```

### 3. PUT `/api/master-team/[id]`
**Deskripsi:** Update tim yang sudah ada

**Request Body:** Same as POST

### 4. DELETE `/api/master-team/[id]`
**Deskripsi:** Soft delete tim (set isActive = false)

### 5. GET `/api/master-team/available-projects`
**Deskripsi:** Mendapatkan semua project yang tersedia

**Response:**
```json
{
  "success": true,
  "items": [
    {
      "id": 1,
      "kodeProyek": "PRJ001",
      "namaProyek": "E-Commerce Platform",
      "teamId": null
    }
  ]
}
```

## 🔧 How Merge Project Works

### 1. Individual Project
- Project langsung di-assign ke team (`proyek.team_id = team.id`)
- Ditampilkan dengan `isMerged: false`

### 2. Merged Project
- Dibuat record di `project_group` dengan nama custom
- Project-project asli disimpan di `project_group_item`
- Ditampilkan dengan `isMerged: true`
- Nama custom disimpan di `project_group.nama`

### Database Flow untuk Merge:
```sql
-- 1. Buat project group
INSERT INTO project_group (nama, deskripsi, team_id) 
VALUES ('Mobile Development Suite', 'Gabungan Mobile App + API', 1);

-- 2. Tambahkan project ke group
INSERT INTO project_group_item (group_id, project_id) VALUES (1, 2);
INSERT INTO project_group_item (group_id, project_id) VALUES (1, 3);
```

## 🛠️ Setup Instructions

### 1. Run SQL Script
```bash
psql -h 202.152.141.18 -p 9494 -U svc_pg3xp -d log_prod -f create-master-team-tables.sql
```

### 2. Environment Variables
Pastikan `.env` sudah benar:
```env
DATABASE_URL="postgresql://svc_pg3xp:PgP4ss_9494!@202.152.141.18:9494/log_prod"
```

### 3. Test API
```bash
node test-master-team-api.js
```

## 🔍 Key Features

### ✅ Merge Project Functionality
- Gabungkan 2+ project dengan nama custom
- Tetap menyimpan referensi ke project asli
- Database integrity terjaga

### ✅ CRUD Operations
- Create, Read, Update, Delete tim
- Soft delete (isActive flag)
- Error handling yang robust

### ✅ Data Relationships
- Team → Projects (individual)
- Team → Project Groups → Projects (merged)
- Proper foreign key constraints

### ✅ Frontend Integration Ready
- API response format sesuai dengan frontend interface
- Support untuk merge project UI
- Real-time data updates

## 🚨 Error Handling

### Common Errors:
1. **Duplicate team name** → HTTP 400
2. **Team not found** → HTTP 404  
3. **Database connection** → HTTP 500
4. **Transaction timeout** → Removed transaction, use sequential operations

### Error Response Format:
```json
{
  "success": false,
  "error": "Error message here"
}
```

## 📊 Performance Considerations

1. **Indexes** pada semua foreign keys
2. **Soft delete** untuk audit trail
3. **Connection pooling** dengan Prisma
4. **Sequential operations** instead of transactions untuk stability

## 🔮 Future Enhancements

1. **Team Hierarchy** (parent-child teams)
2. **Team Members Management** 
3. **Project Assignment History**
4. **Bulk Operations**
5. **Advanced Search & Filtering**