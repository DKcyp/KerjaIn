# Version Logic Changes - BA-Driven Versioning

## Overview
Mengubah sistem versioning dari auto-increment saat tasklist dibuat menjadi versioning yang mengikuti BA (Berita Acara) yang sudah di-approve.

## Perubahan Logic

### Sebelumnya (Auto-Increment)
```
1. Tasklist dibuat → version auto-increment (0.0.1 → 0.0.2 → 0.0.3)
2. Setiap tasklist baru mendapat version baru
3. Module version selalu mengikuti tasklist terbaru
```

### Sekarang (BA-Driven)
```
1. Tasklist dibuat → mengambil version dari module.baVersion (dari BA terakhir yang approved)
2. Semua tasklist dalam 1 module pakai version yang sama
3. Version hanya naik saat BA di-approve
4. Contoh:
   - Module "Home" punya baVersion 0.0.4
   - Buat 2 tasklist baru → keduanya pakai version 0.0.4
   - BA di-approve → baVersion naik ke 0.0.5
   - Tasklist baru → otomatis pakai version 0.0.5
   - Seterusnya cycle berulang...
```

## File yang Diubah

### 1. `src/lib/versionService.ts`
**Fungsi baru:**
- `incrementModuleVersionOnBAApproval(moduleId)` - Increment version saat BA approved
  - Parse current version (e.g., 0.0.4)
  - Increment patch (0.0.4 → 0.0.5)
  - Update module baVersion
  - Update semua tasklist dalam module ke version baru

**Fungsi yang diubah:**
- `getNextVersionForModule(moduleId)` - Sekarang mengambil dari module.baVersion (bukan auto-increment)
  - Cek module.baVersion
  - Return baVersion jika ada, default 0.0.1

### 2. `src/app/api/tasklist/route.ts`
**Perubahan:**
- Tasklist creation: Ambil version dari `getNextVersionForModule()` (dari module.baVersion)
- Hapus `updateModuleVersion()` call saat tasklist dibuat
- Module version hanya update saat BA di-approve

### 3. `src/app/api/blueprint-baru/[id]/approve-ba/route.ts`
**Perubahan:**
- Saat BA di-approve, panggil `incrementModuleVersionOnBAApproval()` untuk setiap module
- Version increment otomatis (0.0.4 → 0.0.5)
- Update semua tasklist dalam module ke version baru
- Response include versionUpdates array

## Database Schema
Sudah ada field yang diperlukan:
- `ProyekModule.baVersion` - Menyimpan version dari BA terakhir yang approved
- `Tasklist.baVersion` - Version dari BA saat tasklist dibuat

## Workflow Contoh - Cycle Lengkap

### Scenario: Module "Home" dengan version history 0.0.1 → 0.0.2 → 0.0.3 → 0.0.4

**State Awal:**
```
Module "Home"
  - baVersion: 0.0.4 (dari BA terakhir yang approved)
  - Tasklist 1: baVersion 0.0.4
  - Tasklist 2: baVersion 0.0.4
```

**Step 1: PM buat tasklist baru**
```
POST /api/tasklist
{
  "moduleId": 456,
  "pegawaiId": 123,
  ...
}

Result:
Tasklist 3: baVersion 0.0.4 ← mengambil dari module.baVersion
```

**Step 2: Buat tasklist CRM baru**
```
POST /api/tasklist
{
  "moduleId": 456,
  "tasklistType": "DEVELOPMENT",
  ...
}

Result:
Tasklist 4: baVersion 0.0.4 ← tetap pakai version yang sama
```

**Step 3: Semua tasklist selesai, BA di-approve**
```
POST /api/blueprint-baru/[projectId]/approve-ba
{
  "baId": 123,
  "baName": "BA Home v4"
}

Response:
{
  "success": true,
  "data": {
    "updatedModules": 1,
    "versionUpdates": [
      { "moduleName": "Home", "newVersion": "0.0.5" }
    ]
  }
}

Result:
Module "Home"
  - baVersion: 0.0.5 ← incremented
  - Tasklist 1: baVersion 0.0.5 ← updated
  - Tasklist 2: baVersion 0.0.5 ← updated
  - Tasklist 3: baVersion 0.0.5 ← updated
  - Tasklist 4: baVersion 0.0.5 ← updated
```

**Step 4: Cycle berulang - PM buat tasklist baru lagi**
```
POST /api/tasklist
{
  "moduleId": 456,
  ...
}

Result:
Tasklist 5: baVersion 0.0.5 ← mengambil dari module.baVersion terbaru
```

**Step 5: BA di-approve lagi**
```
POST /api/blueprint-baru/[projectId]/approve-ba
{
  "baId": 124,
  "baName": "BA Home v5"
}

Result:
Module "Home"
  - baVersion: 0.0.6 ← incremented lagi
  - Semua tasklist update ke 0.0.6
```

## Benefits
1. ✅ Versioning lebih terstruktur (tied to BA approval)
2. ✅ Semua tasklist dalam 1 module punya version yang sama
3. ✅ Version increment hanya saat ada perubahan formal (BA approval)
4. ✅ Lebih mudah tracking perubahan per version
5. ✅ Mengurangi version fragmentation
6. ✅ Cycle dapat berulang tanpa batas

## Testing Checklist
- [ ] Tasklist baru mengambil version dari module.baVersion
- [ ] Semua tasklist dalam module punya version yang sama
- [ ] BA approval increment version (0.0.4 → 0.0.5)
- [ ] Tasklist existing update ke version baru saat BA approved
- [ ] Default version 0.0.1 jika belum ada BA approved
- [ ] Multiple modules increment version independently
- [ ] Cycle dapat berulang (0.0.5 → 0.0.6 → 0.0.7, dst)
- [ ] Tasklist CRM baru juga mengikuti version dari module
