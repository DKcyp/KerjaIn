# Database ERD - Logbook System

## Core Entity Relationship Diagram

```mermaid
erDiagram
    Pegawai ||--o{ Region : "is PIC of"
    Pegawai ||--o{ RegionMember : "is member of"
    Region ||--o{ RegionMember : "has members"
    
    Pegawai ||--o{ ProyekTeam : "assigned to"
    Proyek ||--o{ ProyekTeam : "has team"
    
    Proyek ||--o{ ProyekModule : "has modules"
    ProyekModule ||--o{ ProyekModule : "parent-child"
    
    ProyekModule ||--o{ Tasklist : "contains tasks"
    Proyek ||--o{ Tasklist : "has tasks"
    Pegawai ||--o{ Tasklist : "assigned to (pegawaiId)"
    Pegawai ||--o{ Tasklist : "created by (createdBy)"
    
    Pegawai ||--o{ ProgrammerStatus : "has status"
    ProgrammerStatus ||--o{ ProgrammerStatusLog : "has logs"
    
    Pegawai ||--o{ UserRole : "has roles"
    MasterRole ||--o{ UserRole : "assigned to users"
    MasterRole ||--o{ RolePermission : "has permissions"
    MasterPermission ||--o{ RolePermission : "granted to roles"
    
    Tasklist ||--o{ TasklistChat : "has chats"
    Tasklist ||--o{ Notification : "generates notifications"
    Tasklist ||--o{ TaskActivity : "has activities"
    Tasklist ||--o{ TasklistImage : "has images"
    Tasklist ||--o{ TasklistLog : "has logs"
    
    Proyek ||--o{ Blueprint : "has blueprint"
    Blueprint ||--o{ ModulReview : "has reviews"
    ProyekModule ||--o{ ModulReview : "reviewed in"
    
    Pegawai {
        int id PK
        string namaLengkap
        string noHp
        string username
        enum role "SUPER_ADMIN,PM,PROGRAMMER,ADMIN"
    }
    
    Region {
        int id PK
        string kode
        string nama
        int picId FK "→ Pegawai.id"
    }
    
    RegionMember {
        int id PK
        int regionId FK "→ Region.id"
        int pegawaiId FK "→ Pegawai.id"
    }
    
    Proyek {
        int id PK
        string kodeProyek
        string namaProyek
        enum type "DEVELOPMENT,BLUEPRINT,SUPPORT"
    }
    
    ProyekTeam {
        int id PK
        int projectId FK "→ Proyek.id"
        int pegawaiId FK "→ Pegawai.id"
        string jabatan "PM,Programmer,etc"
    }
    
    ProyekModule {
        int id PK
        int projectId FK "→ Proyek.id"
        int parentId FK "→ ProyekModule.id"
        string nama
        int order
        boolean isLeaf
    }
    
    Tasklist {
        int id PK
        int projectId FK "→ Proyek.id"
        int moduleId FK "→ ProyekModule.id"
        int pegawaiId FK "→ Pegawai.id (assignee)"
        int createdBy FK "→ Pegawai.id"
        datetime scheduleAt
        enum status
        enum taskComplexity "EASY,MEDIUM,HARD"
        decimal customDurationHours
        datetime calculatedDueDate
    }
    
    ProgrammerStatus {
        int id PK
        int programmerId FK "→ Pegawai.id"
        string status "Free,Work"
        string notes
    }
```

## PIC Assignment Flow - Detailed View

```mermaid
graph TB
    subgraph "PIC Login & Region Assignment"
        PIC[👤 Pegawai: PIC]
        Region[🗺️ Region: Jakarta]
        PIC -->|picId| Region
    end
    
    subgraph "Region Members (Programmers)"
        RM1[RegionMember 1]
        RM2[RegionMember 2]
        RM3[RegionMember 3]
        
        Region -->|has members| RM1
        Region -->|has members| RM2
        Region -->|has members| RM3
        
        RM1 -->|pegawaiId| P1[👨‍💻 Programmer A]
        RM2 -->|pegawaiId| P2[👨‍💻 Programmer B]
        RM3 -->|pegawaiId| P3[👨‍💻 Programmer C]
    end
    
    subgraph "All PMs (No Region Filter)"
        PM1[👔 PM 1]
        PM2[👔 PM 2]
        PM3[👔 PM 3]
    end
    
    subgraph "Task Assignment Options for PIC"
        PIC -->|can assign to| PM1
        PIC -->|can assign to| PM2
        PIC -->|can assign to| PM3
        PIC -->|can assign to| P1
        PIC -->|can assign to| P2
        PIC -->|can assign to| P3
    end
    
    subgraph "Created Tasklist"
        Task[📋 Tasklist]
        Task -.->|pegawaiId can be| PM1
        Task -.->|pegawaiId can be| P1
    end
    
    style PIC fill:#4CAF50
    style Region fill:#2196F3
    style PM1 fill:#FF9800
    style PM2 fill:#FF9800
    style PM3 fill:#FF9800
    style P1 fill:#9C27B0
    style P2 fill:#9C27B0
    style P3 fill:#9C27B0
```

## Region-Based Access Control

```mermaid
graph LR
    subgraph "Region System"
        PIC[PIC]
        R1[Region A<br/>PIC: User X]
        R2[Region B<br/>PIC: User Y]
        
        PIC -->|manages| R1
        
        R1 -->|members| Prog1[Programmer 1]
        R1 -->|members| Prog2[Programmer 2]
        
        R2 -->|members| Prog3[Programmer 3]
        R2 -->|members| Prog4[Programmer 4]
    end
    
    subgraph "Task Assignment Rules"
        Rule1["✅ PIC can assign to:<br/>- All PMs<br/>- Own region programmers"]
        Rule2["❌ PIC cannot assign to:<br/>- Other region's programmers"]
    end
    
    PIC -.->|can assign| AllPM[All PMs]
    PIC -.->|can assign| Prog1
    PIC -.->|can assign| Prog2
    PIC -.x->|cannot assign| Prog3
    PIC -.x->|cannot assign| Prog4
    
    style PIC fill:#4CAF50
    style R1 fill:#2196F3
    style R2 fill:#E0E0E0
    style Prog1 fill:#9C27B0
    style Prog2 fill:#9C27B0
    style Prog3 fill:#BDBDBD
    style Prog4 fill:#BDBDBD
    style AllPM fill:#FF9800
    style Rule1 fill:#C8E6C9
    style Rule2 fill:#FFCDD2
```

## Key Relationships untuk PIC Feature

### 1. PIC → Region (One-to-One/Many)
- **Relasi**: `Region.picId` → `Pegawai.id`
- **Arti**: PIC yang bertanggung jawab atas region
- **Query**: `Region.findFirst({ where: { picId: session.id } })`

### 2. Region → RegionMember (One-to-Many)
- **Relasi**: `RegionMember.regionId` → `Region.id`
- **Arti**: Daftar member (programmer) di region tersebut

### 3. RegionMember → Pegawai (Many-to-One)
- **Relasi**: `RegionMember.pegawaiId` → `Pegawai.id`
- **Arti**: Programmer yang tergabung di region

### 4. Tasklist Assignment Logic

**Untuk PIC:**
```typescript
// Query available users for PIC to assign
const picRegion = await prisma.region.findFirst({
  where: { picId: session.id },
  include: {
    members: {
      include: { pegawai: true }
    }
  }
});

const allPMs = await prisma.pegawai.findMany({
  where: { role: 'PM' }
});

const picProgrammers = picRegion?.members.map(m => m.pegawai) || [];

// Combine: All PMs + Own Region Programmers
const availableUsers = [...allPMs, ...picProgrammers];
```

## Complete Schema Summary

| Table | Purpose | Key Relations |
|-------|---------|---------------|
| **Pegawai** | Users/Employees | Central entity, has role (SUPER_ADMIN/PM/PROGRAMMER/ADMIN) |
| **Region** | Regional divisions | Has PIC (Pegawai), contains RegionMembers |
| **RegionMember** | Region membership | Links Pegawai to Region |
| **ProyekTeam** | Project team assignments | Links Pegawai to Proyek with jabatan |
| **Tasklist** | Task items | Assigned to Pegawai, belongs to ProyekModule |
| **ProgrammerStatus** | Programmer availability | Tracks Free/Work status per programmer |
| **MasterRole** | RBAC roles | Linked to permissions via RolePermission |
| **MasterPermission** | RBAC permissions | Granular access control |

---

## Kesimpulan Relasi untuk PIC

✅ **Sudah Support**:
- PIC dapat di-link ke Region via `Region.picId`
- Region memiliki members (programmers) via `RegionMember`
- Query untuk get "All PMs + Own Region Programmers" sudah feasible

⚠️ **Yang Perlu Ditambah**:
1. Add `PIC` ke enum `Role` di Pegawai
2. Create API endpoint untuk get available users khusus PIC
3. Update permission/authorization logic untuk PIC role
