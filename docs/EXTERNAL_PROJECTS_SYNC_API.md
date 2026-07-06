# External Projects Synchronization API

## Overview

The External Projects Synchronization API provides a comprehensive endpoint for synchronizing all project data from the LogBook system to external applications. This API returns complete project information including teams, modules, and tasks in a structured format suitable for data synchronization.

## Authentication

**API Key Required**: All requests must include a valid API key in the `X-API-Key` header.

```bash
X-API-Key: your-external-api-key
```

The API key should be configured in the `CRM_API_KEY` environment variable.

## Endpoint

### GET /api/external/projects/sync

Retrieves all projects with their complete data structure for synchronization purposes.

**URL**: `/api/external/projects/sync`  
**Method**: `GET`  
**Authentication**: Required (API Key)

#### Request Headers

```
X-API-Key: your-external-api-key
Content-Type: application/json
```

#### Response Format

```json
{
  "success": true,
  "message": "Projects synchronized successfully",
  "timestamp": "2024-10-22T12:30:00.000Z",
  "totalProjects": 5,
  "projects": [
    {
      "id": 1,
      "noUrut": 1,
      "kodeProyek": "PRJ-001",
      "namaProyek": "E-Commerce System",
      "createdAt": "2024-01-15T08:00:00.000Z",
      "updatedAt": "2024-10-22T10:00:00.000Z",
      "team": [
        {
          "jabatan": "PM",
          "username": "johndoe",
          "namaLengkap": "John Doe"
        }
      ],
      "modules": [
        {
          "id": 1,
          "projectId": 1,
          "parentId": null,
          "nama": "User Management",
          "kode": "01",
          "order": 1,
          "depth": 0,
          "isLeaf": false,
          "createdAt": "2024-01-15T09:00:00.000Z",
          "updatedAt": "2024-01-15T09:00:00.000Z",
          "children": [
            {
              "id": 2,
              "projectId": 1,
              "parentId": 1,
              "nama": "User Registration",
              "kode": "01.01",
              "order": 1,
              "depth": 1,
              "isLeaf": true,
              "createdAt": "2024-01-15T09:15:00.000Z",
              "updatedAt": "2024-01-15T09:15:00.000Z",
              "children": []
            }
          ]
        }
      ],
      "stats": {
        "teamCount": 3,
        "moduleCount": 5
      }
    }
  ]
}
```

## Data Structure

### Project Object

| Field | Type | Description |
|-------|------|-------------|
| `id` | number | Unique project identifier |
| `noUrut` | number | Project sequence number |
| `kodeProyek` | string | Unique project code |
| `namaProyek` | string | Project name |
| `createdAt` | string | ISO timestamp of creation |
| `updatedAt` | string | ISO timestamp of last update |
| `team` | array | Array of simplified team member objects |
| `modules` | array | Hierarchical array of project modules |
| `stats` | object | Project statistics |

### Team Member Object (Simplified)

| Field | Type | Description |
|-------|------|-------------|
| `jabatan` | string | Role in project (PM, PROGRAMMER, etc.) |
| `username` | string\|null | Employee username |
| `namaLengkap` | string\|null | Employee full name |

### Module Object (Hierarchical)

| Field | Type | Description |
|-------|------|-------------|
| `id` | number | Module ID |
| `projectId` | number | Project ID |
| `parentId` | number\|null | Parent module ID (null for root) |
| `nama` | string | Module name |
| `kode` | string | Module code |
| `order` | number | Sort order |
| `depth` | number | Hierarchy depth (0 = root) |
| `isLeaf` | boolean | Whether module is a leaf node |
| `children` | array | Array of child modules |

### Statistics Object

| Field | Type | Description |
|-------|------|-------------|
| `teamCount` | number | Number of team members |
| `moduleCount` | number | Total number of modules |

## Usage Examples

### cURL

```bash
curl -X GET \
  -H "X-API-Key: your-external-api-key" \
  -H "Content-Type: application/json" \
  "http://localhost:3000/api/external/projects/sync"
```

### JavaScript/Node.js

```javascript
const response = await fetch('http://localhost:3000/api/external/projects/sync', {
  method: 'GET',
  headers: {
    'X-API-Key': 'your-external-api-key',
    'Content-Type': 'application/json'
  }
});

const data = await response.json();
console.log(`Synchronized ${data.totalProjects} projects`);
```

### Python

```python
import requests

headers = {
    'X-API-Key': 'your-external-api-key',
    'Content-Type': 'application/json'
}

response = requests.get(
    'http://localhost:3000/api/external/projects/sync',
    headers=headers
)

data = response.json()
print(f"Synchronized {data['totalProjects']} projects")
```

### PHP

```php
<?php
$headers = [
    'X-API-Key: your-external-api-key',
    'Content-Type: application/json'
];

$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, 'http://localhost:3000/api/external/projects/sync');
curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);

$response = curl_exec($ch);
$data = json_decode($response, true);

echo "Synchronized " . $data['totalProjects'] . " projects\n";
curl_close($ch);
?>
```

## Error Responses

### 401 Unauthorized

```json
{
  "error": "Unauthorized",
  "message": "Valid API key required in X-API-Key header"
}
```

### 500 Internal Server Error

```json
{
  "error": "Internal server error",
  "message": "Failed to sync projects data"
}
```

## Environment Configuration

Add the following to your `.env` file:

```env
CRM_API_KEY=your-secure-api-key-here
```

## Security Considerations

1. **API Key Protection**: Store the API key securely and never expose it in client-side code
2. **HTTPS**: Use HTTPS in production to encrypt API key transmission
3. **Rate Limiting**: Consider implementing rate limiting for production use
4. **IP Whitelisting**: Restrict access to specific IP addresses if needed
5. **Monitoring**: Log all API access for security monitoring

## Integration Patterns

### Scheduled Synchronization

```javascript
// Run every 15 minutes
setInterval(async () => {
  try {
    const data = await syncProjects();
    console.log(`Synced ${data.totalProjects} projects at ${new Date()}`);
  } catch (error) {
    console.error('Sync failed:', error);
  }
}, 15 * 60 * 1000);
```

### Webhook-Based Sync

```javascript
// Trigger sync when receiving webhook
app.post('/webhook/project-updated', async (req, res) => {
  try {
    await syncProjects();
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
```

### Incremental Sync

```javascript
// Store last sync timestamp and filter by updatedAt
const lastSync = localStorage.getItem('lastProjectSync');
const projects = data.projects.filter(p => 
  new Date(p.updatedAt) > new Date(lastSync)
);
localStorage.setItem('lastProjectSync', data.timestamp);
```

## Support

For technical support or questions about this API, please refer to the project documentation or contact the development team.
