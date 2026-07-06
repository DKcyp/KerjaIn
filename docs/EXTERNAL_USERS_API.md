# External Users API

Fast external API for listing all users in the system with SSO integration data.

## Endpoint

```
GET /api/external/users
```

## Authentication

Requires `X-API-Key` header with valid API key (configured via `EXTERNAL_API_KEY` environment variable).

## Query Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `q` | string | No | Search query for name or username |
| `role` | string | No | Filter by role: `SUPER_ADMIN`, `PM`, `PROGRAMMER`, `ADMIN` |
| `page` | number | No | Page number (default: 1) |
| `size` | number | No | Page size (default: 50, max: 100) |

## Response Format

```json
{
  "success": true,
  "data": {
    "users": [
      {
        "id": 1,
        "noUrut": 1,
        "name": "John Doe",
        "phone": "081234567890",
        "username": "john.doe",
        "role": "PROGRAMMER",
        "sso": {
          "companyId": "company-123",
          "roleId": "role-456",
          "userId": "sso-user-789"
        },
        "createdAt": "2024-01-01T00:00:00.000Z",
        "updatedAt": "2024-01-01T00:00:00.000Z"
      }
    ],
    "pagination": {
      "total": 100,
      "page": 1,
      "size": 50,
      "totalPages": 2
    }
  }
}
```

## Example Usage

```bash
# List all users
curl -H "X-API-Key: your-api-key" \
  "https://your-domain.com/api/external/users"

# Search users by name
curl -H "X-API-Key: your-api-key" \
  "https://your-domain.com/api/external/users?q=john"

# Filter by role
curl -H "X-API-Key: your-api-key" \
  "https://your-domain.com/api/external/users?role=PROGRAMMER"

# Pagination
curl -H "X-API-Key: your-api-key" \
  "https://your-domain.com/api/external/users?page=2&size=25"
```

## Error Responses

### 401 Unauthorized
```json
{
  "success": false,
  "error": "Unauthorized: Invalid or missing API key"
}
```

### 500 Internal Server Error
```json
{
  "success": false,
  "error": "Failed to fetch users",
  "details": "Error details"
}
```