# CRM Tasklist Version Sync - Fix Documentation

## Masalah
Ketika tasklist di-create dari CRM (bukan dari blueprint UI), `ba_version` tidak sesuai dengan blueprint version. Tasklist masih menggunakan default `0.0.1` atau versi lama.

## Root Cause
1. CRM route (`/api/tasklistcrm`) auto-detect version dari blueprint terbesar
2. Tapi modul yang digunakan tidak ter-link ke bacara (`ba_id = null`)
3. Ketika `getNextVersionForModule()` dipanggil, tidak bisa load relasi `bacara`
4. Fallback ke `module.baVersion` yang lama atau default

## Solusi

### 1. Track Bacara ID saat Resolve Version
```typescript
// Sebelumnya: hanya track version string
let resolvedVersion = '0.0.1';

// Sekarang: track version + bacara ID
let resolvedVersion = '0.0.1';
let resolvedBaId: number | null = null;

// Saat cari blueprint terbesar:
const sorted = blueprints
  .map((b) => ({ id: b.id, version: b.version || '0.0.1' }))
  .sort(...);
resolvedVersion = sorted[0].version;
resolvedBaId = sorted[0].id;  // ← BARU: Track bacara ID
```

### 2. Link Modul ke Bacara saat Create/Update
```typescript
// Saat create modul baru:
modul = await prisma.proyekModule.create({
  data: {
    projectId: proyek.id,
    nama: 'tasklist_crm',
    baId: resolvedBaId || undefined,  // ← LINK KE BACARA
    baVersion: resolvedVersion,
    ...
  }
});

// Saat update modul existing:
if (modul && !modul.baId && resolvedBaId) {
  modul = await prisma.proyekModule.update({
    where: { id: modul.id },
    data: { 
      baId: resolvedBaId,  // ← LINK KE BACARA
      baVersion: resolvedVersion 
    }
  });
}
```

### 3. Update Mapped Module jika Belum Ter-link
```typescript
// Jika user kirim id_modul_logbook (mapped module):
if (idModulLogbook !== null) {
  const found = await prisma.proyekModule.findUnique({ where: { id: idModulLogbook } });
  if (found && found.projectId === proyek.id) {
    modul = found;
    
    // Update ba_id jika belum ter-set
    if (!modul.baId && resolvedBaId) {
      modul = await prisma.proyekModule.update({
        where: { id: modul.id },
        data: { 
          baId: resolvedBaId,
          baVersion: resolvedVersion 
        }
      });
    }
  }
}
```

---

## Flow Lengkap (CRM → Tasklist)

```
┌─────────────────────────────────────────────────────────────┐
│ STEP 1: CRM Kirim Request                                   │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  POST /api/tasklistcrm                                      │
│  {                                                          │
│    id_project: "CRM_PROJECT_123",                           │
│    id_crm: "CRM_TASK_456",                                  │
│    tanggal: "2026-05-31",                                   │
│    keterangan: "Task dari CRM",                             │
│    version: null  ← Tidak dikirim, auto-detect             │
│  }                                                          │
│                                                             │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ STEP 2: Backend Resolve Version                             │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  1. Cari project by crmId                                   │
│     proyek (id: 14, crmId: "CRM_PROJECT_123")               │
│                                                             │
│  2. Cari semua blueprint untuk project                      │
│     bacara (projectId: 14, type: BLUEPRINT)                 │
│     ├─ id: 45, version: "25.0.0"                            │
│     ├─ id: 44, version: "15.0.0"                            │
│     └─ id: 43, version: "20.0.0"                            │
│                                                             │
│  3. Sort descending, ambil terbesar                         │
│     resolvedVersion = "25.0.0"                              │
│     resolvedBaId = 45  ← BARU: Track bacara ID             │
│                                                             │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ STEP 3: Resolve/Create Module                               │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Opsi 1: Mapped module (id_modul_logbook dikirim)           │
│  ├─ Cari proyek_module by id                                │
│  └─ Update ba_id = 45 jika belum ter-set                    │
│                                                             │
│  Opsi 2: Fallback ke tasklist_crm                           │
│  ├─ Cari proyek_module WHERE nama = 'tasklist_crm'          │
│  ├─ Jika ada: Update ba_id = 45 jika belum ter-set          │
│  └─ Jika tidak ada: Create dengan ba_id = 45               │
│                                                             │
│  Hasil:                                                     │
│  proyek_module (id: 83517)                                  │
│  ├─ ba_id: 45  ← LINK KE BACARA (BARU)                     │
│  ├─ ba_version: "25.0.0"                                    │
│  ├─ nama: "tasklist_crm"                                    │
│  └─ projectId: 14                                           │
│                                                             │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ STEP 4: Create Tasklist                                     │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  CREATE tasklist:                                           │
│  ├─ ba_version: "25.0.0"  ← FROM RESOLVED VERSION           │
│  ├─ version: "25.0.0"                                       │
│  ├─ moduleId: 83517                                         │
│  ├─ id_crm: "CRM_TASK_456"                                  │
│  └─ projectId: 14                                           │
│                                                             │
│  tasklist (id: 2933)                                        │
│  ├─ ba_version: "25.0.0"  ← BENAR! Sesuai blueprint        │
│  ├─ version: "25.0.0"                                       │
│  ├─ moduleId: 83517                                         │
│  └─ id_crm: "CRM_TASK_456"                                  │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## Perubahan di `/api/tasklistcrm`

### A. Version Resolution (Line ~170)
```typescript
// SEBELUMNYA:
let resolvedVersion = '0.0.1';
if (versionRaw) {
  resolvedVersion = versionRaw;
} else {
  const blueprints = await prisma.bacara.findMany({
    where: { projectId: proyek.id, type: 'BLUEPRINT' },
    select: { version: true },  // ← Hanya version
  });
  // ... sort dan ambil terbesar
  resolvedVersion = sorted[0];
}

// SEKARANG:
let resolvedVersion = '0.0.1';
let resolvedBaId: number | null = null;  // ← BARU
if (versionRaw) {
  resolvedVersion = versionRaw;
} else {
  const blueprints = await prisma.bacara.findMany({
    where: { projectId: proyek.id, type: 'BLUEPRINT' },
    select: { id: true, version: true },  // ← Ambil id juga
  });
  // ... sort dan ambil terbesar
  resolvedVersion = sorted[0].version;
  resolvedBaId = sorted[0].id;  // ← BARU: Track bacara ID
}
```

### B. Mapped Module Update (Line ~220)
```typescript
// SEBELUMNYA:
if (idModulLogbook !== null) {
  const found = await prisma.proyekModule.findUnique({ where: { id: idModulLogbook } });
  if (found && found.projectId === proyek.id) {
    modul = found;
    console.log(`[CRM Task] Using mapped module...`);
  }
}

// SEKARANG:
if (idModulLogbook !== null) {
  const found = await prisma.proyekModule.findUnique({ where: { id: idModulLogbook } });
  if (found && found.projectId === proyek.id) {
    modul = found;
    
    // ← BARU: Update ba_id jika belum ter-set
    if (!modul.baId && resolvedBaId) {
      modul = await prisma.proyekModule.update({
        where: { id: modul.id },
        data: { 
          baId: resolvedBaId,
          baVersion: resolvedVersion 
        }
      });
      console.log(`[CRM Task] Updated module with baId=${resolvedBaId}...`);
    }
    
    console.log(`[CRM Task] Using mapped module...`);
  }
}
```

### C. Fallback Module Create/Update (Line ~250)
```typescript
// SEBELUMNYA:
if (!modul) {
  modul = await prisma.proyekModule.findFirst({
    where: { projectId: proyek.id, nama: 'tasklist_crm', parentId: null }
  });
  
  if (!modul) {
    modul = await prisma.proyekModule.create({
      data: {
        projectId: proyek.id,
        nama: 'tasklist_crm',
        // ... tanpa ba_id
      }
    });
  }
}

// SEKARANG:
if (!modul) {
  modul = await prisma.proyekModule.findFirst({
    where: { projectId: proyek.id, nama: 'tasklist_crm', parentId: null }
  });
  
  // ← BARU: Update existing modul jika belum ter-link
  if (modul && !modul.baId && resolvedBaId) {
    modul = await prisma.proyekModule.update({
      where: { id: modul.id },
      data: { 
        baId: resolvedBaId,
        baVersion: resolvedVersion 
      }
    });
    console.log(`[CRM Task] Updated existing tasklist_crm with baId=${resolvedBaId}...`);
  }
  
  if (!modul) {
    modul = await prisma.proyekModule.create({
      data: {
        projectId: proyek.id,
        nama: 'tasklist_crm',
        baId: resolvedBaId || undefined,  // ← BARU: Link ke bacara
        baVersion: resolvedVersion,  // ← BARU: Set version
        // ...
      }
    });
  }
}
```

---

## Hasil Setelah Fix

### Sebelumnya (SALAH):
```
CRM Request → Auto-detect version "25.0.0"
           → Create tasklist_crm module (ba_id = null)
           → Create tasklist dengan ba_version = "25.0.0"
           
Tapi modul tidak ter-link ke bacara, jadi:
- getNextVersionForModule() tidak bisa load bacara.version
- Fallback ke module.baVersion yang lama
- Tasklist view menampilkan versi yang salah
```

### Sekarang (BENAR):
```
CRM Request → Auto-detect version "25.0.0" dari bacara id 45
           → Update/Create tasklist_crm module dengan ba_id = 45
           → Create tasklist dengan ba_version = "25.0.0"
           
Modul ter-link ke bacara, jadi:
- getNextVersionForModule() bisa load bacara.version langsung
- Tasklist view menampilkan versi yang benar
- Konsisten dengan blueprint flow
```

---

## Testing

### Test Case 1: CRM Create Tasklist (Auto-detect Version)
```
Request:
POST /api/tasklistcrm
{
  id_project: "CRM_123",
  id_crm: "TASK_456",
  tanggal: "2026-05-31",
  keterangan: "Test CRM"
  // version: null (auto-detect)
}

Expected:
✓ tasklist.ba_version = "25.0.0" (dari blueprint terbesar)
✓ proyek_module.ba_id = 45 (ter-link ke bacara)
✓ proyek_module.ba_version = "25.0.0"
```

### Test Case 2: CRM Create Tasklist (Explicit Version)
```
Request:
POST /api/tasklistcrm
{
  id_project: "CRM_123",
  id_crm: "TASK_789",
  tanggal: "2026-05-31",
  version: "15.0.0"  // Explicit version
}

Expected:
✓ tasklist.ba_version = "15.0.0" (dari request)
✓ tasklist.version = "15.0.0"
```

### Test Case 3: CRM Create Tasklist (Mapped Module)
```
Request:
POST /api/tasklistcrm
{
  id_project: "CRM_123",
  id_crm: "TASK_999",
  id_modul_logbook: 83517,  // Mapped module
  tanggal: "2026-05-31"
}

Expected:
✓ tasklist.moduleId = 83517 (mapped module)
✓ proyek_module(83517).ba_id = 45 (updated if was null)
✓ tasklist.ba_version = "25.0.0"
```

---

## Checklist

- [x] Track `resolvedBaId` saat resolve version
- [x] Update mapped module dengan `ba_id` jika belum ter-set
- [x] Update fallback `tasklist_crm` module dengan `ba_id`
- [x] Create new `tasklist_crm` dengan `ba_id` jika belum ada
- [ ] Test CRM flow end-to-end
- [ ] Verify tasklist.ba_version sesuai blueprint version
- [ ] Verify proyek_module.ba_id ter-set dengan benar

---

## Catatan

1. **Backward Compatible**: Fix ini tidak merusak existing tasklist, hanya update modul yang belum ter-link
2. **Auto-fix**: Modul yang sudah ada akan di-update otomatis saat CRM request berikutnya
3. **Konsisten**: CRM flow sekarang sama dengan blueprint flow dalam hal version sync
