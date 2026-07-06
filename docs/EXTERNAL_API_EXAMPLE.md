# External API - Request/Response Examples

## Complete Request Example

```json
POST /api/external/project
Headers:
  Content-Type: application/json
  X-API-Key: your-secure-api-key-here-change-in-production

Body:
{
  "projectCode": "PRJ-2024-001",
  "projectName": "Customer Portal Development",
  "customerName": "Acme Corporation",
  "companyName": "Acme Tech Division",
  "pics": [
    {
      "id": 1,
      "name": "John Doe",
      "role": "Project Manager",
      "email": "john.doe@example.com",
      "phone": "081234567890"
    },
    {
      "id": 5,
      "name": "Jane Smith",
      "role": "Technical Lead",
      "email": "jane.smith@example.com",
      "phone": "081234567891"
    }
  ],
  "team": ["john.doe", "jane.smith", "developer1", "tester1"]
}
```

## Complete Response Example

```json
{
  "success": true,
  "message": "Project created successfully",
  "data": {
    "project": {
      "id": 123,
      "code": "PRJ-2024-001",
      "name": "Customer Portal Development",
      "customer": "Acme Corporation",
      "company": "Acme Tech Division",
      "noUrut": 45
    },
    "blueprint": {
      "id": 456,
      "status": "DRAFT",
      "pics": [
        {
          "id": 1,
          "name": "John Doe",
          "role": "Project Manager",
          "email": "john.doe@example.com",
          "phone": "081234567890"
        },
        {
          "id": 5,
          "name": "Jane Smith",
          "role": "Technical Lead",
          "email": "jane.smith@example.com",
          "phone": "081234567891"
        }
      ]
    },
    "team": [
      {
        "username": "john.doe",
        "name": "John Doe",
        "role": "PM",
        "jabatan": "PM"
      },
      {
        "username": "jane.smith",
        "name": "Jane Smith",
        "role": "PROGRAMMER",
        "jabatan": "PROGRAMMER"
      },
      {
        "username": "developer1",
        "name": "Developer One",
        "role": "PROGRAMMER",
        "jabatan": "PROGRAMMER"
      },
      {
        "username": "tester1",
        "name": "Tester One",
        "role": "ADMIN",
        "jabatan": "ADMIN"
      }
    ]
  }
}
```

## Key Points

### PICs Format
- **Structure**: Array of objects with `id`, `name`, `role`, `email`, and `phone`
- **Purpose**: Stored as JSON in blueprint's `picsData` field (no database validation)
- **Validation**: Only validates structure (all 5 fields present)
- **Note**: PICs are external data and don't need to match Pegawai records
- **Example**: `[{id: 1, name: "John Doe", role: "PM", email: "john@example.com", phone: "081234567890"}]`

### Team Format
- **Structure**: Simple array of usernames (strings)
- **Purpose**: Creates entries in `ProyekTeam` table
- **Jabatan**: Automatically derived from user's `role` in Pegawai table
- **Validation**: System verifies all usernames exist in Pegawai table
- **Example**: `["admin", "developer1", "tester1"]`

### Role to Jabatan Mapping
The system automatically maps user roles to jabatan:
- `PM` → `PM`
- `PROGRAMMER` → `PROGRAMMER`
- `ADMIN` → `ADMIN`
- `SUPER_ADMIN` → `ADMIN`

### What Gets Created

1. **Proyek (Project)**
   - Unique `kodeProyek` (project code)
   - Auto-incremented `noUrut`
   - Customer and company information

2. **Blueprint**
   - Automatically created in `DRAFT` status
   - PICs stored in `picsData` JSON field
   - Activity log entry for creation via external API

3. **ProyekTeam (Team Members)**
   - One entry per team member
   - Links `projectId` and `pegawaiId`
   - `jabatan` derived from user's role

## Minimal Request Example

```json
{
  "projectCode": "PRJ-MIN-001",
  "projectName": "Minimal Project",
  "customerName": "Customer Inc."
}
```

This creates:
- Project with no company name
- Blueprint with no PICs
- No team members

## Error Examples

### Invalid PIC Structure
```json
Request:
{
  "projectCode": "PRJ-001",
  "projectName": "Test",
  "customerName": "Customer",
  "pics": [{"id": 1, "name": "John"}]  // Missing role, email, phone
}

Response (400):
{
  "success": false,
  "error": "Each PIC must have id, name, role, email, and phone fields"
}
```

### Non-existent Team Member
```json
Request:
{
  "projectCode": "PRJ-001",
  "projectName": "Test",
  "customerName": "Customer",
  "team": ["nonexistent_user"]
}

Response (400):
{
  "success": false,
  "error": "Team members not found: nonexistent_user"
}
```

### Duplicate Project Code
```json
Request:
{
  "projectCode": "EXISTING-CODE",
  "projectName": "Test",
  "customerName": "Customer"
}

Response (409):
{
  "success": false,
  "error": "Project with code 'EXISTING-CODE' already exists"
}
```

## Testing with curl

```bash
# Test API key
curl -X GET http://localhost:3000/api/external/project \
  -H "X-API-Key: your-secure-api-key-here-change-in-production"

# Create project with PICs and team
curl -X POST http://localhost:3000/api/external/project \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your-secure-api-key-here-change-in-production" \
  -d '{
    "projectCode": "TEST-001",
    "projectName": "Test Project",
    "customerName": "Test Customer",
    "pics": [{
      "id": 1,
      "name": "Admin User",
      "role": "Administrator",
      "email": "admin@example.com",
      "phone": "081234567890"
    }],
    "team": ["admin"]
  }'
```
