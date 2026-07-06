# RichzLog Timeline & Chat API - Implementation Guide

## 📋 Overview

Dokumentasi ini adalah panduan implementasi lengkap untuk **Timeline** dan **Chat** API RichzLog yang digunakan oleh aplikasi mobile Flutter RichzSpot.

**Base URL**: `http://your-domain.com` atau `http://localhost:3000` (development)

**Authentication**: Bearer Token (JWT) - akan ditambahkan di header `Authorization`

---

## 🎯 API Endpoints Summary

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/richzlog/tasklist/{id}/timeline` | Get activity timeline |
| GET | `/api/richzlog/tasklist/{id}/chat` | Get chat messages |
| POST | `/api/richzlog/tasklist/{id}/chat` | Send chat message |
| GET | `/api/richzlog/tasklist/{id}/chat/unread-count` | Get unread message count |
| POST | `/api/richzlog/tasklist/{id}/chat/read` | Mark messages as read |

---

## 📱 1. TIMELINE API

### 1.1 Get Tasklist Timeline

Mengambil history aktivitas dari sebuah tasklist.

**Endpoint:**
```
GET /api/richzlog/tasklist/{tasklistId}/timeline
```

**Headers:**
```
Authorization: Bearer {your_jwt_token}
Content-Type: application/json
```

**Path Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| tasklistId | integer | Yes | ID dari tasklist |

**Query Parameters:**
| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| page | integer | No | 1 | Halaman data |
| size | integer | No | 20 | Jumlah data per halaman (max 100) |
| sortDir | string | No | desc | Urutan data: `asc` atau `desc` |

**Example Request:**
```bash
curl -X GET "http://localhost:3000/api/richzlog/tasklist/1/timeline?page=1&size=20&sortDir=desc" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json"
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Timeline retrieved successfully",
  "data": {
    "items": [
      {
        "id": 1,
        "tasklistId": 1,
        "activityType": "status_change",
        "activityCode": "WORK_STARTED",
        "title": "Work Started",
        "description": "Task work has been started",
        "icon": "play_circle",
        "color": "#1976D2",
        "userId": 1,
        "userName": "John Doe",
        "userPhoto": null,
        "metadata": {
          "oldStatus": null,
          "newStatus": "SEDANG_DIPROSES_USER",
          "additionalInfo": "Started working on the task"
        },
        "createdAt": "2024-03-28T10:30:00.000Z",
        "formattedTime": "10:30"
      },
      {
        "id": 2,
        "tasklistId": 1,
        "activityType": "status_change",
        "activityCode": "WORK_COMPLETED",
        "title": "Work Completed",
        "description": "Task work has been completed and submitted for review",
        "icon": "check_circle",
        "color": "#2E7D32",
        "userId": 1,
        "userName": "John Doe",
        "userPhoto": null,
        "metadata": {
          "oldStatus": "SEDANG_DIPROSES_USER",
          "newStatus": "MENUNGGU_REVIEW_PM",
          "additionalInfo": "Completed all requirements"
        },
        "createdAt": "2024-03-28T15:45:00.000Z",
        "formattedTime": "15:45"
      }
    ],
    "pagination": {
      "page": 1,
      "size": 20,
      "total": 2,
      "totalPages": 1,
      "hasNextPage": false,
      "hasPrevPage": false
    }
  }
}
```

**Error Response (404):**
```json
{
  "success": false,
  "message": "Tasklist not found",
  "error": {
    "code": "TASKLIST_NOT_FOUND",
    "details": "Tasklist with ID 1 does not exist"
  }
}
```

**Error Response (400):**
```json
{
  "success": false,
  "message": "Invalid tasklist ID",
  "error": {
    "code": "INVALID_ID",
    "details": "Tasklist ID must be a valid number"
  }
}
```

### 1.2 Activity Types Reference

| Activity Code | Icon | Color | Description |
|---------------|------|-------|-------------|
| WORK_STARTED | play_circle | #1976D2 | Task dimulai |
| WORK_PAUSED | pause_circle | #F57C00 | Task di-pause |
| WORK_RESUMED | play_circle | #1976D2 | Task dilanjutkan |
| WORK_COMPLETED | check_circle | #2E7D32 | Task selesai |
| REVIEW_APPROVED | check_circle | #2E7D32 | Review disetujui |
| REVIEW_REJECTED | cancel | #C62828 | Review ditolak |
| ASSIGNEE_CHANGED | person | #7B1FA2 | Assignee diubah |
| PRIORITY_CHANGED | priority_high | #F57C00 | Priority diubah |
| DEADLINE_CHANGED | calendar_today | #1976D2 | Deadline diubah |
| COMMENT_ADDED | comment | #616161 | Komentar ditambahkan |

---

## 💬 2. CHAT API

### 2.1 Get Chat Messages

Mengambil daftar pesan chat untuk sebuah tasklist.

**Endpoint:**
```
GET /api/richzlog/tasklist/{tasklistId}/chat
```

**Headers:**
```
Authorization: Bearer {your_jwt_token}
Content-Type: application/json
```

**Path Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| tasklistId | integer | Yes | ID dari tasklist |

**Query Parameters:**
| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| page | integer | No | 1 | Halaman data |
| size | integer | No | 50 | Jumlah pesan per halaman (max 100) |
| before | string | No | null | Ambil pesan sebelum timestamp (ISO 8601) |
| after | string | No | null | Ambil pesan setelah timestamp (ISO 8601) |

**Example Request:**
```bash
curl -X GET "http://localhost:3000/api/richzlog/tasklist/1/chat?page=1&size=50" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json"
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Chat messages retrieved successfully",
  "data": {
    "items": [
      {
        "id": 1,
        "tasklistId": 1,
        "userId": 1,
        "userName": "John Doe",
        "userPhoto": null,
        "userRole": "PROGRAMMER",
        "message": "I've completed the initial setup",
        "messageType": "text",
        "attachments": [],
        "replyTo": null,
        "isEdited": false,
        "isDeleted": false,
        "reactions": [],
        "createdAt": "2024-03-28T10:30:00.000Z",
        "updatedAt": "2024-03-28T10:30:00.000Z",
        "formattedTime": "10:30"
      },
      {
        "id": 2,
        "tasklistId": 1,
        "userId": 2,
        "userName": "Jane Smith",
        "userPhoto": null,
        "userRole": "PM",
        "message": "Here's the documentation",
        "messageType": "file",
        "attachments": [
          {
            "id": 2,
            "fileName": "documentation.pdf",
            "fileSize": 1024000,
            "fileType": "application/pdf",
            "fileUrl": "https://example.com/files/documentation.pdf",
            "thumbnailUrl": null
          }
        ],
        "replyTo": null,
        "isEdited": false,
        "isDeleted": false,
        "reactions": [],
        "createdAt": "2024-03-28T11:00:00.000Z",
        "updatedAt": "2024-03-28T11:00:00.000Z",
        "formattedTime": "11:00"
      }
    ],
    "pagination": {
      "page": 1,
      "size": 50,
      "total": 2,
      "totalPages": 1,
      "hasNextPage": false,
      "hasPrevPage": false
    },
    "unreadCount": 0
  }
}
```

### 2.2 Send Chat Message

Mengirim pesan chat baru ke tasklist.

**Endpoint:**
```
POST /api/richzlog/tasklist/{tasklistId}/chat
```

**Headers:**
```
Authorization: Bearer {your_jwt_token}
Content-Type: application/json
```

**Request Body (Text Message):**
```json
{
  "message": "This is a test message",
  "messageType": "text"
}
```

**Request Body (File Message):**
```json
{
  "message": "Here's the file you requested",
  "messageType": "file",
  "attachments": [
    {
      "fileName": "document.pdf",
      "fileSize": 1024000,
      "fileType": "application/pdf",
      "fileUrl": "https://example.com/uploads/document.pdf"
    }
  ]
}
```

**Example Request:**
```bash
curl -X POST "http://localhost:3000/api/richzlog/tasklist/1/chat" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "message": "This is a test message",
    "messageType": "text"
  }'
```

**Success Response (201):**
```json
{
  "success": true,
  "message": "Message sent successfully",
  "data": {
    "id": 10,
    "tasklistId": 1,
    "userId": 1,
    "userName": "John Doe",
    "userPhoto": null,
    "userRole": "PROGRAMMER",
    "message": "This is a test message",
    "messageType": "text",
    "attachments": [],
    "replyTo": null,
    "isEdited": false,
    "isDeleted": false,
    "reactions": [],
    "createdAt": "2024-03-28T12:00:00.000Z",
    "updatedAt": "2024-03-28T12:00:00.000Z",
    "formattedTime": "12:00"
  }
}
```

**Error Response (400):**
```json
{
  "success": false,
  "message": "Message is required",
  "error": {
    "code": "INVALID_INPUT",
    "details": "Message cannot be empty"
  }
}
```

### 2.3 Get Unread Count

Mendapatkan jumlah pesan yang belum dibaca.

**Endpoint:**
```
GET /api/richzlog/tasklist/{tasklistId}/chat/unread-count
```

**Example Request:**
```bash
curl -X GET "http://localhost:3000/api/richzlog/tasklist/1/chat/unread-count" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json"
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Unread count retrieved successfully",
  "data": {
    "tasklistId": 1,
    "unreadCount": 5,
    "lastMessageAt": "2024-03-28T12:00:00.000Z"
  }
}
```

### 2.4 Mark Messages as Read

Menandai pesan sebagai sudah dibaca.

**Endpoint:**
```
POST /api/richzlog/tasklist/{tasklistId}/chat/read
```

**Request Body:**
```json
{
  "messageIds": [1, 2, 3, 4, 5]
}
```

**Example Request:**
```bash
curl -X POST "http://localhost:3000/api/richzlog/tasklist/1/chat/read" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "messageIds": [1, 2, 3, 4, 5]
  }'
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Messages marked as read",
  "data": {
    "markedCount": 5,
    "unreadCount": 0
  }
}
```

---

## 🔧 3. FLUTTER IMPLEMENTATION EXAMPLES

### 3.1 Timeline Service

```dart
import 'package:http/http.dart' as http;
import 'dart:convert';

class TimelineService {
  final String baseUrl;
  final String token;

  TimelineService({required this.baseUrl, required this.token});

  Future<Map<String, dynamic>> getTimeline({
    required int tasklistId,
    int page = 1,
    int size = 20,
    String sortDir = 'desc',
  }) async {
    final url = Uri.parse(
      '$baseUrl/api/richzlog/tasklist/$tasklistId/timeline?page=$page&size=$size&sortDir=$sortDir'
    );

    final response = await http.get(
      url,
      headers: {
        'Authorization': 'Bearer $token',
        'Content-Type': 'application/json',
      },
    );

    if (response.statusCode == 200) {
      return json.decode(response.body);
    } else {
      throw Exception('Failed to load timeline: ${response.body}');
    }
  }
}
```

### 3.2 Chat Service

```dart
class ChatService {
  final String baseUrl;
  final String token;

  ChatService({required this.baseUrl, required this.token});

  // Get chat messages
  Future<Map<String, dynamic>> getChatMessages({
    required int tasklistId,
    int page = 1,
    int size = 50,
    String? before,
    String? after,
  }) async {
    var queryParams = 'page=$page&size=$size';
    if (before != null) queryParams += '&before=$before';
    if (after != null) queryParams += '&after=$after';

    final url = Uri.parse(
      '$baseUrl/api/richzlog/tasklist/$tasklistId/chat?$queryParams'
    );

    final response = await http.get(
      url,
      headers: {
        'Authorization': 'Bearer $token',
        'Content-Type': 'application/json',
      },
    );

    if (response.statusCode == 200) {
      return json.decode(response.body);
    } else {
      throw Exception('Failed to load chat messages: ${response.body}');
    }
  }

  // Send chat message
  Future<Map<String, dynamic>> sendMessage({
    required int tasklistId,
    required String message,
    String messageType = 'text',
    List<Map<String, dynamic>>? attachments,
  }) async {
    final url = Uri.parse(
      '$baseUrl/api/richzlog/tasklist/$tasklistId/chat'
    );

    final body = {
      'message': message,
      'messageType': messageType,
      if (attachments != null) 'attachments': attachments,
    };

    final response = await http.post(
      url,
      headers: {
        'Authorization': 'Bearer $token',
        'Content-Type': 'application/json',
      },
      body: json.encode(body),
    );

    if (response.statusCode == 201) {
      return json.decode(response.body);
    } else {
      throw Exception('Failed to send message: ${response.body}');
    }
  }

  // Get unread count
  Future<Map<String, dynamic>> getUnreadCount({
    required int tasklistId,
  }) async {
    final url = Uri.parse(
      '$baseUrl/api/richzlog/tasklist/$tasklistId/chat/unread-count'
    );

    final response = await http.get(
      url,
      headers: {
        'Authorization': 'Bearer $token',
        'Content-Type': 'application/json',
      },
    );

    if (response.statusCode == 200) {
      return json.decode(response.body);
    } else {
      throw Exception('Failed to get unread count: ${response.body}');
    }
  }

  // Mark messages as read
  Future<Map<String, dynamic>> markAsRead({
    required int tasklistId,
    required List<int> messageIds,
  }) async {
    final url = Uri.parse(
      '$baseUrl/api/richzlog/tasklist/$tasklistId/chat/read'
    );

    final body = {
      'messageIds': messageIds,
    };

    final response = await http.post(
      url,
      headers: {
        'Authorization': 'Bearer $token',
        'Content-Type': 'application/json',
      },
      body: json.encode(body),
    );

    if (response.statusCode == 200) {
      return json.decode(response.body);
    } else {
      throw Exception('Failed to mark as read: ${response.body}');
    }
  }
}
```

### 3.3 Usage Example

```dart
void main() async {
  final timelineService = TimelineService(
    baseUrl: 'http://your-domain.com',
    token: 'your_jwt_token_here',
  );

  final chatService = ChatService(
    baseUrl: 'http://your-domain.com',
    token: 'your_jwt_token_here',
  );

  // Get timeline
  try {
    final timeline = await timelineService.getTimeline(
      tasklistId: 1,
      page: 1,
      size: 20,
    );
    print('Timeline: ${timeline['data']['items']}');
  } catch (e) {
    print('Error: $e');
  }

  // Get chat messages
  try {
    final chat = await chatService.getChatMessages(
      tasklistId: 1,
      page: 1,
      size: 50,
    );
    print('Chat messages: ${chat['data']['items']}');
  } catch (e) {
    print('Error: $e');
  }

  // Send message
  try {
    final result = await chatService.sendMessage(
      tasklistId: 1,
      message: 'Hello from Flutter!',
      messageType: 'text',
    );
    print('Message sent: ${result['data']}');
  } catch (e) {
    print('Error: $e');
  }

  // Get unread count
  try {
    final unread = await chatService.getUnreadCount(tasklistId: 1);
    print('Unread count: ${unread['data']['unreadCount']}');
  } catch (e) {
    print('Error: $e');
  }

  // Mark as read
  try {
    final result = await chatService.markAsRead(
      tasklistId: 1,
      messageIds: [1, 2, 3],
    );
    print('Marked as read: ${result['data']['markedCount']} messages');
  } catch (e) {
    print('Error: $e');
  }
}
```

---

## 📊 4. RESPONSE STATUS CODES

| Status Code | Description |
|-------------|-------------|
| 200 | Success - Request berhasil |
| 201 | Created - Resource berhasil dibuat |
| 400 | Bad Request - Invalid input |
| 401 | Unauthorized - Token tidak valid |
| 403 | Forbidden - Tidak memiliki akses |
| 404 | Not Found - Resource tidak ditemukan |
| 500 | Internal Server Error - Server error |

---

## 🔐 5. AUTHENTICATION

Semua endpoint memerlukan JWT token yang valid. Token harus disertakan di header:

```
Authorization: Bearer {your_jwt_token}
```

Jika token tidak valid atau expired, API akan mengembalikan response 401 Unauthorized.

---

## ⚡ 6. BEST PRACTICES

### 6.1 Pagination
- Gunakan pagination untuk menghindari load data yang terlalu besar
- Default size untuk timeline: 20 items
- Default size untuk chat: 50 messages
- Maximum size: 100 items

### 6.2 Error Handling
- Selalu handle error response dengan proper try-catch
- Check status code sebelum parse response
- Display user-friendly error messages

### 6.3 Performance
- Cache timeline data untuk mengurangi API calls
- Implement pull-to-refresh untuk update data
- Use pagination untuk lazy loading

### 6.4 Real-time Updates (Future)
- Pertimbangkan WebSocket untuk real-time chat
- Implement polling untuk update timeline secara berkala
- Use push notifications untuk new messages

---

## 🧪 7. TESTING

### Test dengan cURL:

```bash
# Test Timeline
curl -X GET "http://localhost:3000/api/richzlog/tasklist/1/timeline" \
  -H "Content-Type: application/json"

# Test Chat
curl -X GET "http://localhost:3000/api/richzlog/tasklist/1/chat" \
  -H "Content-Type: application/json"

# Send Message
curl -X POST "http://localhost:3000/api/richzlog/tasklist/1/chat" \
  -H "Content-Type: application/json" \
  -d '{"message": "Test message", "messageType": "text"}'
```

### Test dengan PowerShell:

```powershell
# Test Timeline
Invoke-RestMethod -Uri "http://localhost:3000/api/richzlog/tasklist/1/timeline" `
  -Method Get -ContentType "application/json"

# Test Chat
Invoke-RestMethod -Uri "http://localhost:3000/api/richzlog/tasklist/1/chat" `
  -Method Get -ContentType "application/json"

# Send Message
$body = @{ message = "Test message"; messageType = "text" } | ConvertTo-Json
Invoke-RestMethod -Uri "http://localhost:3000/api/richzlog/tasklist/1/chat" `
  -Method Post -ContentType "application/json" -Body $body
```

---

## 📞 SUPPORT

Untuk pertanyaan atau issue, silakan hubungi:
- **Backend Team**: backend@richzspot.com
- **Mobile Team Lead**: mobile@richzspot.com
- **Project Manager**: pm@richzspot.com

---

**Document Version**: 1.0  
**Last Updated**: 2024-03-30  
**Status**: Ready for Implementation
