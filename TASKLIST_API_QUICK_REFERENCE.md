# Quick Reference - Tasklist API

## Base URL
```
http://192.168.1.10:3000/api/tasklist
```

## Authentication
```
Cookie: session=your-session-token
```

## Quick Commands

### Get Approval Queue (PM/Manager Only)
```bash
curl -X GET "http://192.168.1.10:3000/api/tasklist/approval-queue" \
  -H "Cookie: session=172dc4710ab54af8b1b405c89d6de9f0"
```

### Get Approval Statistics
```bash
curl -X GET "http://192.168.1.10:3000/api/tasklist/approval-stats?period=30" \
  -H "Cookie: session=172dc4710ab54af8b1b405c89d6de9f0"
```

### Get Tasks by User ID
```bash
curl -X GET "http://192.168.1.10:3000/api/tasklist?pegawaiId=3" \
  -H "Cookie: session=172dc4710ab54af8b1b405c89d6de9f0"
```

### Get Tasks by Project ID
```bash
curl -X GET "http://192.168.1.10:3000/api/tasklist?projectId=1" \
  -H "Cookie: session=172dc4710ab54af8b1b405c89d6de9f0"
```

### Get Tasks by User + Project
```bash
curl -X GET "http://192.168.1.10:3000/api/tasklist?pegawaiId=3&projectId=1" \
  -H "Cookie: session=172dc4710ab54af8b1b405c89d6de9f0"
```

### Approve Task
```bash
curl -X PUT "http://192.168.1.10:3000/api/tasklist/123" \
  -H "Content-Type: application/json" \
  -H "Cookie: session=172dc4710ab54af8b1b405c89d6de9f0" \
  -d '{"status": "SELESAI", "keterangan": "Approved!"}'
```

### Reject Task
```bash
curl -X PUT "http://192.168.1.10:3000/api/tasklist/123" \
  -H "Content-Type: application/json" \
  -H "Cookie: session=172dc4710ab54af8b1b405c89d6de9f0" \
  -d '{"status": "MENUNGGU_PROSES_USER", "keterangan": "Please fix issues"}'
```

## Status Codes
- `0` = MENUNGGU_PROSES_USER
- `1` = SEDANG_DIPROSES_USER  
- `2` = MENUNGGU_REVIEW_PM
- `3` = SELESAI
- `4` = SEDANG_DIPROSES_USER_PAUSED

## Common Filters
| Parameter | Example | Description |
|-----------|---------|-------------|
| `pegawaiId` | `?pegawaiId=3` | Filter by user ID |
| `projectId` | `?projectId=1` | Filter by project ID |
| `status` | `?status=SEDANG_DIPROSES_USER` | Filter by status |
| `status` | `?status=1,2` | Multiple statuses |
| `page` | `?page=1&size=20` | Pagination |
| `from` | `?from=2026-03-01` | Date range start |
| `to` | `?to=2026-03-31` | Date range end |

## Status Transitions
| From | To | Who Can Do |
|------|----|-----------| 
| MENUNGGU_PROSES_USER | SEDANG_DIPROSES_USER | Assignee |
| SEDANG_DIPROSES_USER | MENUNGGU_REVIEW_PM | Assignee |
| MENUNGGU_REVIEW_PM | SELESAI | PM/Creator |
| MENUNGGU_REVIEW_PM | MENUNGGU_PROSES_USER | PM/Creator |
| SEDANG_DIPROSES_USER | SEDANG_DIPROSES_USER_PAUSED | Assignee |
| SEDANG_DIPROSES_USER_PAUSED | SEDANG_DIPROSES_USER | Assignee |

## Response Structure
```json
{
  "items": [
    {
      "id": 1,
      "kode": "01.02 - 1",
      "projectId": 1,
      "pegawaiId": 3,
      "status": "SEDANG_DIPROSES_USER",
      "statusCode": 1,
      "availableActions": ["pause", "complete"]
    }
  ],
  "total": 100,
  "page": 1,
  "size": 10
}
```