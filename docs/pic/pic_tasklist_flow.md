# PIC Tasklist Flow - Project Support

## Complete Flow: PIC Create Tasklist in SUPPORT Project

```mermaid
flowchart TD
    Start([PIC Login]) --> Dashboard[Dashboard]
    Dashboard --> SelectProject{Select Project}
    
    SelectProject -->|Type: DEVELOPMENT| DevFlow[Regular Flow<br/>assigns to ProyekTeam]
    SelectProject -->|Type: BLUEPRINT| DevFlow
    SelectProject -->|Type: SUPPORT| SupportFlow[Support Project Flow]
    
    SupportFlow --> ProjectInfo[Project Info:<br/>Type: SUPPORT<br/>Region: Jakarta<br/>Team: Auto from Region]
    
    ProjectInfo --> CreateTask[Click: Create Tasklist]
    
    CreateTask --> FetchUsers[Fetch Available Users]
    
    subgraph "Get Available Users Logic"
        FetchUsers --> GetRegion[Get Project.regionId]
        GetRegion --> FetchRegionMembers[GET /api/region/:id/members<br/>Returns Region Team]
        GetRegion --> FetchAllPMs[GET /api/pegawai?role=PM<br/>Returns All PMs]
        
        FetchRegionMembers --> RegionList[Region Team:<br/>👨‍💻 Programmer A<br/>👨‍💻 Programmer B<br/>👨‍💻 Programmer C]
        
        FetchAllPMs --> PMList[All PMs:<br/>👔 PM Jakarta<br/>👔 PM Bandung<br/>👔 PM Surabaya]
        
        RegionList --> Combine[Combine Lists]
        PMList --> Combine
    end
    
    Combine --> DisplayDropdown[Display User Dropdown]
    
    DisplayDropdown --> Dropdown["Assign to User:<br/>━━━━━━━━━━<br/>👨‍💻 Programmer A (Region)<br/>👨‍💻 Programmer B (Region)<br/>👨‍💻 Programmer C (Region)<br/>👔 PM Jakarta<br/>👔 PM Bandung<br/>👔 PM Surabaya"]
    
    Dropdown --> UserSelect[PIC Select User]
    UserSelect --> FillTask[Fill Task Details:<br/>- Project: Support Jakarta<br/>- Module: xxx<br/>- Schedule: xxx<br/>- Assigned: Programmer A]
    
    FillTask --> Submit[Submit Tasklist]
    Submit --> SaveDB[(Save to Database)]
    
    SaveDB --> NotifyUser[Notify Assigned User]
    NotifyUser --> Done([Task Created])
    
    style SupportFlow fill:#4CAF50
    style Combine fill:#2196F3
    style Dropdown fill:#FF9800
    style RegionList fill:#9C27B0
    style PMList fill:#FF5722
```

## Detailed User Assignment Logic

```mermaid
graph TB
    subgraph "Project Setup Phase"
        Admin[Admin/PM Create Project]
        Admin --> TypeSelect{Select Type}
        TypeSelect -->|SUPPORT| RegionSelect[Select Region: Jakarta]
        RegionSelect --> AutoTeam[Team Auto-Populated<br/>from RegionMember]
        
        TypeSelect -->|DEVELOPMENT| ManualTeam[Manual Team Selection]
        TypeSelect -->|BLUEPRINT| ManualTeam
    end
    
    subgraph "Region: Jakarta"
        R1[Region: Jakarta]
        R1 --> RM1[RegionMember 1:<br/>Programmer A]
        R1 --> RM2[RegionMember 2:<br/>Programmer B]
        R1 --> RM3[RegionMember 3:<br/>Programmer C]
    end
    
    subgraph "All PMs System-Wide"
        PM1[PM 1: Jakarta]
        PM2[PM 2: Bandung]
        PM3[PM 3: Surabaya]
    end
    
    subgraph "PIC Create Tasklist"
        PIC[PIC Login]
        PIC --> OpenSupport[Open Project: Support Jakarta]
        OpenSupport --> NewTask[Create New Tasklist]
        
        NewTask --> Query[Query Available Users]
        
        Query -->|From Project.regionId| Region[Get Region Team]
        Query -->|System-wide| GetPMs[Get All PMs]
        
        Region --> RM1
        Region --> RM2
        Region --> RM3
        
        GetPMs --> PM1
        GetPMs --> PM2
        GetPMs --> PM3
        
        RM1 --> Pool[User Pool]
        RM2 --> Pool
        RM3 --> Pool
        PM1 --> Pool
        PM2 --> Pool
        PM3 --> Pool
        
        Pool --> AssignDropdown[Assign to User Dropdown]
    end
    
    AssignDropdown --> TaskCreated[Tasklist Created<br/>Assigned to Selected User]
    
    style PIC fill:#4CAF50
    style Region fill:#2196F3
    style GetPMs fill:#FF5722
    style Pool fill:#FFC107
    style AssignDropdown fill:#FF9800
```

## Step-by-Step Example

### Setup: Project Support Jakarta

```
Proyek:
  id: 100
  namaProyek: "Support Jakarta"
  type: "SUPPORT"
  regionId: 1  ← Linked to Region Jakarta

Region (id: 1 - Jakarta):
  members:
    - RegionMember { pegawaiId: 10, pegawai: "Programmer A" }
    - RegionMember { pegawaiId: 11, pegawai: "Programmer B" }
    - RegionMember { pegawaiId: 12, pegawai: "Programmer C" }

ProyekTeam (Auto-populated from Region):
  - { projectId: 100, pegawaiId: 10 }
  - { projectId: 100, pegawaiId: 11 }
  - { projectId: 100, pegawaiId: 12 }
```

### PIC Create Tasklist

**Step 1: PIC opens project**
```
Project: Support Jakarta (type: SUPPORT, regionId: 1)
```

**Step 2: Click "Create Tasklist"**

**Step 3: System fetches available users**
```typescript
// Backend logic
const project = await prisma.proyek.findUnique({
  where: { id: 100 },
  include: { region: { include: { members: { include: { pegawai: true } } } } }
});

if (project.type === 'SUPPORT' && project.regionId) {
  // Get region team
  const regionTeam = project.region.members.map(m => ({
    id: m.pegawai.id,
    namaLengkap: m.pegawai.namaLengkap,
    source: 'region'
  }));
  
  // Get all PMs
  const allPMs = await prisma.pegawai.findMany({
    where: { role: 'PM' },
    select: { id: true, namaLengkap: true }
  }).map(pm => ({ ...pm, source: 'pm' }));
  
  // Combine
  const availableUsers = [...regionTeam, ...allPMs];
}

// Response:
{
  "availableUsers": [
    { "id": 10, "namaLengkap": "Programmer A", "source": "region" },
    { "id": 11, "namaLengkap": "Programmer B", "source": "region" },
    { "id": 12, "namaLengkap": "Programmer C", "source": "region" },
    { "id": 5, "namaLengkap": "PM Jakarta", "source": "pm" },
    { "id": 6, "namaLengkap": "PM Bandung", "source": "pm" },
    { "id": 7, "namaLengkap": "PM Surabaya", "source": "pm" }
  ]
}
```

**Step 4: PIC selects user from dropdown**
```
Selected: Programmer A (id: 10)
```

**Step 5: Submit tasklist**
```
POST /api/tasklist
{
  "projectId": 100,
  "moduleId": 5,
  "pegawaiId": 10,  ← Selected user
  "scheduleAt": "2025-11-29",
  "keterangan": "Fix bug di modul XYZ"
}
```

**Step 6: Task created**
```
Tasklist created:
  id: 500
  projectId: 100
  pegawaiId: 10 (Programmer A)
  status: MENUNGGU_PROSES_USER
```

## Comparison: SUPPORT vs DEVELOPMENT

| Aspect | SUPPORT Project | DEVELOPMENT Project |
|--------|----------------|---------------------|
| **Team Source** | Auto from RegionMember | Manual selection |
| **Tasklist Assignment** | Region Team + All PMs | ProyekTeam only |
| **PIC Role** | Can assign to region team + PMs | N/A |
| **Region Link** | Required (`regionId` set) | NULL |

## Visual: User Pool Composition

```mermaid
pie title Available Users for Tasklist Assignment
    "Region Team (3)" : 50
    "All PMs (3)" : 50
```

## API Endpoint Design

### GET /api/tasklist/available-users

```typescript
// Request
GET /api/tasklist/available-users?projectId=100

// Response
{
  "projectId": 100,
  "projectType": "SUPPORT",
  "regionId": 1,
  "regionName": "Jakarta",
  "users": [
    {
      "id": 10,
      "namaLengkap": "Programmer A",
      "role": "PROGRAMMER",
      "source": "region",
      "noHp": "08111"
    },
    {
      "id": 11,
      "namaLengkap": "Programmer B",
      "role": "PROGRAMMER",
      "source": "region",
      "noHp": "08222"
    },
    {
      "id": 5,
      "namaLengkap": "PM Jakarta",
      "role": "PM",
      "source": "all_pms",
      "noHp": "08999"
    }
  ]
}
```

## Summary

✅ **PIC di Project SUPPORT dapat assign tasklist ke:**
- ✅ Team dari Region (Programmer A, B, C)
- ✅ Semua PM yang ada di system

✅ **Auto-population:**
- ✅ ProyekTeam otomatis terisi dari RegionMember saat pilih type SUPPORT
- ✅ Dropdown user tasklist otomatis combine region team + all PMs

✅ **Validation:**
- ✅ Project type SUPPORT harus punya regionId
- ✅ User yang dipilih harus ada di available users list
