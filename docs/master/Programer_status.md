# Programmer Status API

## Endpoints

### 1. List All Programmer Status
```http
GET /api/programmer-status
```

**Response:**
```json
{
  "items": [
    {
      "id": 1,
      "programmerId": 3,
      "status": "Free",
      "notes": null,
      "updatedBy": 1,
      "createdAt": "2025-11-26T03:00:00.000Z",
      "updatedAt": "2025-11-26T04:30:00.000Z",
      "programmer": {
        "id": 3,
        "namaLengkap": "Citra",
        "noHp": "081234567890",
        "role": "PROGRAMMER"
      },
      "updater": {
        "id": 1,
        "namaLengkap": "Admin"
      }
    }
  ]
}
```

---

### 2. Create/Update Programmer Status
```http
POST /api/programmer-status
Content-Type: application/json
```

**Request Body:**
```json
{
  "programmerId": 3,
  "status": "Work",
  "notes": "Sedang mengerjakan Project Master 1"
}
```

**Response:**
```json
{
  "item": {
    "id": 1,
    "programmerId": 3,
    "status": "Work",
    "notes": "Sedang mengerjakan Project Master 1",
    "updatedBy": 1,
    "createdAt": "2025-11-26T03:00:00.000Z",
    "updatedAt": "2025-11-26T05:00:00.000Z"
  }
}
```

**Note:** This endpoint automatically creates a log entry in `ProgrammerStatusLog`

---

### 3. Get Status Change History (All)
```http
GET /api/programmer-status/logs
```

**Response:**
```json
{
  "items": [
    {
      "id": 1,
      "programmerId": 3,
      "oldStatus": "Free",
      "newStatus": "Work",
      "notes": "Assigned to task",
      "changedBy": 1,
      "createdAt": "2025-11-26T04:30:00.000Z",
      "programmer": {
        "id": 3,
        "namaLengkap": "Citra"
      },
      "changer": {
        "id": 1,
        "namaLengkap": "Admin"
      }
    }
  ]
}
```

---

### 4. Get Status Change History (By Programmer)
```http
GET /api/programmer-status/logs?programmerId=3
```

**Response:** Same as above, but filtered for specific programmer

---

## Status Options

| Status | Color | Description |
|--------|-------|-------------|
| `Free` | 🟢 Green | Available for tasks |
| `Work` | 🟡 Yellow | Currently working on tasks |
---

## Permissions Required

| Action | Permission Required |
|--------|-------------------|
| View status | `programmer_status.read` |
| Create status | `programmer_status.create` |
| Update status | `programmer_status.update` |
| Delete status | `programmer_status.delete` |

---

## Field Descriptions

### ProgrammerStatus

| Field | Type | Description |
|-------|------|-------------|
| `id` | Integer | Unique identifier |
| `programmerId` | Integer | Programmer ID (FK to Pegawai) |
| `status` | String | Current status (Free/Work) |
| `notes` | String | Optional notes |
| `updatedBy` | Integer | User who updated (FK to Pegawai) |
| `createdAt` | DateTime | Creation timestamp |
| `updatedAt` | DateTime | Last update timestamp |

### ProgrammerStatusLog

| Field | Type | Description |
|-------|------|-------------|
| `id` | Integer | Unique identifier |
| `programmerId` | Integer | Programmer ID |
| `oldStatus` | String | Previous status (nullable) |
| `newStatus` | String | New status |
| `notes` | String | Reason for change |
| `changedBy` | Integer | User who made the change |
| `createdAt` | DateTime | Change timestamp |

---

## Business Rules

- `programmerId` must reference a Pegawai with role `PROGRAMMER`
- Status changes are automatically logged
- Each programmer can only have one active status record
- POST endpoint performs upsert (creates if not exists, updates if exists)
- Logs are never deleted (audit trail)

---

## Future Enhancement

**Auto-Update Logic:**
- When task assigned → Status automatically changes to "Work"
- When all tasks completed → Status automatically changes to "Free"
- Manual override available for sick leave, vacation, etc.