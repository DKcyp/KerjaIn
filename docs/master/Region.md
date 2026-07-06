# Region Master API

## Endpoints

### 1. List All Regions
```http
GET /api/region
```

**Response:**
```json
{
  "items": [
    {
      "id": 1,
      "kode": "REG-001",
      "nama": "Region Barat",
      "picId": 5,
      "createdAt": "2025-11-26T02:46:26.000Z",
      "updatedAt": "2025-11-26T02:46:26.000Z",
      "pic": {
        "id": 5,
        "namaLengkap": "Ahmad"
      }
    }
  ]
}
```

---

### 2. Create Region
```http
POST /api/region
Content-Type: application/json
```

**Request Body:**
```json
{
  "kode": "REG-002",
  "nama": "Region Timur",
  "picId": 6
}
```

**Response:**
```json
{
  "item": {
    "id": 2,
    "kode": "REG-002",
    "nama": "Region Timur",
    "picId": 6,
    "createdAt": "2025-11-26T05:00:00.000Z",
    "updatedAt": "2025-11-26T05:00:00.000Z"
  }
}
```

---

### 3. Get Region by ID
```http
GET /api/region/{id}
```

**Response:**
```json
{
  "item": {
    "id": 1,
    "kode": "REG-001",
    "nama": "Region Barat",
    "picId": 5,
    "createdAt": "2025-11-26T02:46:26.000Z",
    "updatedAt": "2025-11-26T02:46:26.000Z",
    "pic": {
      "id": 5,
      "namaLengkap": "Ahmad"
    }
  }
}
```

---

### 4. Update Region
```http
PUT /api/region/{id}
Content-Type: application/json
```

**Request Body:**
```json
{
  "kode": "REG-002",
  "nama": "Region Timur Updated",
  "picId": 7
}
```

**Response:**
```json
{
  "item": {
    "id": 2,
    "kode": "REG-002",
    "nama": "Region Timur Updated",
    "picId": 7,
    "createdAt": "2025-11-26T05:00:00.000Z",
    "updatedAt": "2025-11-26T06:00:00.000Z"
  }
}
```

---

### 5. Delete Region
```http
DELETE /api/region/{id}
```

**Response:**
```json
{
  "message": "Region deleted successfully"
}
```

---

## Permissions Required

| Action | Permission Required |
|--------|-------------------|
| View regions | `region.read` |
| Create region | `region.create` |
| Update region | `region.update` |
| Delete region | `region.delete` |

---

## Field Descriptions

| Field | Type | Description |
|-------|------|-------------|
| `id` | Integer | Unique identifier (auto-increment) |
| `kode` | String | Region code (unique) |
| `nama` | String | Region name |
| `picId` | Integer | Person In Charge ID (FK to Pegawai) |
| `createdAt` | DateTime | Creation timestamp |
| `updatedAt` | DateTime | Last update timestamp |

---

## Business Rules

- `kode` must be unique
- `picId` must reference an existing Pegawai
- Cannot delete region if it has dependencies