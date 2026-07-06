# RichzLog API - Quick Reference

## 🚀 Quick Start

**Base URL**: `http://localhost:3000` (development)

**Authentication**: `Authorization: Bearer {jwt_token}`

---

## 📋 Endpoints

### Timeline API

```
GET /api/richzlog/tasklist/{id}/timeline
```

**Query Params**: `page`, `size`, `sortDir`

**Response**:
```json
{
  "success": true,
  "data": {
    "items": [...],
    "pagination": {...}
  }
}
```

---

### Chat API

#### Get Messages
```
GET /api/richzlog/tasklist/{id}/chat
```

**Query Params**: `page`, `size`, `before`, `after`

#### Send Message
```
POST /api/richzlog/tasklist/{id}/chat
```

**Body**:
```json
{
  "message": "Your message",
  "messageType": "text"
}
```

#### Get Unread Count
```
GET /api/richzlog/tasklist/{id}/chat/unread-count
```

#### Mark as Read
```
POST /api/richzlog/tasklist/{id}/chat/read
```

**Body**:
```json
{
  "messageIds": [1, 2, 3]
}
```

---

## 🎨 Activity Types

| Code | Icon | Color |
|------|------|-------|
| WORK_STARTED | play_circle | #1976D2 |
| WORK_PAUSED | pause_circle | #F57C00 |
| WORK_COMPLETED | check_circle | #2E7D32 |
| REVIEW_APPROVED | check_circle | #2E7D32 |
| REVIEW_REJECTED | cancel | #C62828 |

---

## 💻 Flutter Example

```dart
// Get Timeline
final response = await http.get(
  Uri.parse('$baseUrl/api/richzlog/tasklist/$id/timeline'),
  headers: {'Authorization': 'Bearer $token'},
);

// Send Message
final response = await http.post(
  Uri.parse('$baseUrl/api/richzlog/tasklist/$id/chat'),
  headers: {
    'Authorization': 'Bearer $token',
    'Content-Type': 'application/json',
  },
  body: json.encode({
    'message': 'Hello',
    'messageType': 'text',
  }),
);
```

---

## 📦 Postman Collection

Import file: `RichzLog_Timeline_Chat_API.postman_collection.json`

Environment: `RichzLog_API_Environment.json`

---

## 🧪 Test Commands

**Bash**:
```bash
./test-richzlog-api.sh
```

**PowerShell**:
```powershell
.\test-richzlog-api.ps1
```

**cURL**:
```bash
curl -X GET "http://localhost:3000/api/richzlog/tasklist/1/timeline"
```

---

## 📞 Support

- Backend: backend@richzspot.com
- Mobile: mobile@richzspot.com

**Version**: 1.0 | **Updated**: 2024-03-30
