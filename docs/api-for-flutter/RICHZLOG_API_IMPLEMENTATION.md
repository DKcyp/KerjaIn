# RichzLog Tasklist Timeline & Chat API - Implementation Guide

## Overview
Dokumentasi ini menjelaskan implementasi API yang telah dibuat untuk fitur **Activity Timeline** dan **Chat** pada Tasklist Detail di aplikasi mobile RichzSpot.

---

## Base URL
```
http://localhost:3000/api/richzlog
```

---

## 1. TASKLIST ACTIVITY TIMELINE API

### 1.1 Get Tasklist Activity Timeline

**Endpoint:**
```
GET /api/richzlog/tasklist/{tasklistId}/timeline
```

**Description:**
Mengambil history/timeline aktivitas dari sebuah tasklist berdasarkan data dari tabel `task_activity`.

**Query Parameters:**
| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| page | integer | No | 1 | Halaman data |
| size | integer | No | 20 | Jumlah data per halaman (max 100) |
| sortDir | string | No | desc | Urutan data (asc/desc) |

**Example Request:**
```bash
curl -X GET "http://localhost:3000/api/richzlog/tasklist/123/timeline?page=1&size=20&sortDir=desc"
```

**Response Success (200):**
```json
{
  "success": true,
  "message": "Timeline retrieved successfully",
  "data": {
    "items": [
      {
        "id": 1,
        "tasklistId": 123,
        "activityType": "status_change",
        "activityCode": "WORK_STARTED",
        "title": "Work Started",
        "description": "Task work has been started",
        "icon": "play_circle",
        "color": "#1976D2",
        "userId": 45,
        "userName": "John Doe",
        "userPhoto": null,
        "metadata": {
          "oldStatus": null,
          "newStatus": "SEDANG_DIPROSES_USER",
          "additionalInfo": "Initial setup completed"
        },
        "createdAt": "2024-03-28T18:10:00.000Z",
        "formattedTime": "18:10"
      }
    ],
    "pagination": {
      "page": 1,
      "size": 20,
      "total": 4,
      "totalPages": 1,
      "hasNextPage": false,
      "hasPrevPage": false
    }
  }
}
```

**Activity Type Mapping:**

| Action/Status | Activity Type | Activity Code | Icon | Color |
|---------------|---------------|---------------|------|-------|
| Start/SEDANG_DIPROSES_USER | status_change | WORK_STARTED | play_circle | #1976D2 |
| Pause/PAUSED | status_change | WORK_PAUSED | pause_circle | #F57C00 |
| Resume | status_change | WORK_RESUMED | play_circle | #1976D2 |
| Complete/MENUNGGU_REVIEW_PM | status_change | WORK_COMPLETED | check_circle | #2E7D32 |
| Approve/SELESAI | review_approved | REVIEW_APPROVED | check_circle | #2E7D32 |
| Reject/REVISI | review_rejected | REVIEW_REJECTED | cancel | #C62828 |
| Assign | assignee_changed | ASSIGNEE_CHANGED | person | #7B1FA2 |
| Priority | priority_changed | PRIORITY_CHANGED | priority_high | #F57C00 |
| Deadline | deadline_changed | DEADLINE_CHANGED | calendar_today | #1976D2 |
| Comment | comment_added | COMMENT_ADDED | comment | #616161 |

---

## 2. TASKLIST CHAT API

### 2.1 Get Tasklist Chat Messages

**Endpoint:**
```
GET /api/richzlog/tasklist/{tasklistId}/chat
```

**Query Parameters:**
| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| page | integer | No | 1 | Halaman data |
| size | integer | No | 50 | Jumlah pesan per halaman (max 100) |
| before | string | No | null | Ambil pesan sebelum timestamp ini (ISO 8601) |
| after | string | No | null | Ambil pesan setelah timestamp ini (ISO 8601) |

**Example Request:**
```bash
curl -X GET "http://localhost:3000/api/richzlog/tasklist/123/chat?page=1&size=50"
```

**Response Success (200):**
```json
{
  "success": true,
  "message": "Chat messages retrieved successfully",
  "data": {
    "items": [
      {
        "id": 1,
        "tasklistId": 123,
        "userId": 45,
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
        "createdAt": "2024-03-28T18:15:00.000Z",
        "updatedAt": "2024-03-28T18:15:00.000Z",
        "formattedTime": "18:15"
      }
    ],
    "pagination": {
      "page": 1,
      "size": 50,
      "total": 3,
      "totalPages": 1,
      "hasNextPage": false,
      "hasPrevPage": false
    },
    "unreadCount": 0
  }
}
```

---

### 2.2 Send Chat Message

**Endpoint:**
```
POST /api/richzlog/tasklist/{tasklistId}/chat
```

**Request Body:**
```json
{
  "message": "This is a test message",
  "messageType": "text",
  "replyToMessageId": null,
  "attachments": []
}
```

**Request Body (with file):**
```json
{
  "message": "Here's the file you requested",
  "messageType": "file",
  "replyToMessageId": null,
  "attachments": [
    {
      "fileName": "document.pdf",
      "fileSize": 1024000,
      "fileType": "application/pdf",
      "fileUrl": "/uploads/richzlog/chat/1234567890-abc123.pdf"
    }
  ]
}
```

**Example Request:**
```bash
curl -X POST "http://localhost:3000/api/richzlog/tasklist/123/chat" \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Test message",
    "messageType": "text"
  }'
```

**Response Success (201):**
```json
{
  "success": true,
  "message": "Message sent successfully",
  "data": {
    "id": 10,
    "tasklistId": 123,
    "userId": 45,
    "userName": "John Doe",
    "userPhoto": null,
    "userRole": "PROGRAMMER",
    "message": "Test message",
    "messageType": "text",
    "attachments": [],
    "replyTo": null,
    "isEdited": false,
    "isDeleted": false,
    "reactions": [],
    "createdAt": "2024-03-28T20:00:00.000Z",
    "updatedAt": "2024-03-28T20:00:00.000Z",
    "formattedTime": "20:00"
  }
}
```

---

### 2.3 Edit Chat Message

**Endpoint:**
```
PUT /api/richzlog/tasklist/{tasklistId}/chat/{messageId}
```

**Request Body:**
```json
{
  "message": "Updated message content"
}
```

**Example Request:**
```bash
curl -X PUT "http://localhost:3000/api/richzlog/tasklist/123/chat/10" \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Updated message"
  }'
```

**Response Success (200):**
```json
{
  "success": true,
  "message": "Message updated successfully",
  "data": {
    "id": 10,
    "message": "Updated message",
    "isEdited": true,
    "updatedAt": "2024-03-28T20:05:00.000Z"
  }
}
```

---

### 2.4 Delete Chat Message

**Endpoint:**
```
DELETE /api/richzlog/tasklist/{tasklistId}/chat/{messageId}
```

**Example Request:**
```bash
curl -X DELETE "http://localhost:3000/api/richzlog/tasklist/123/chat/10"
```

**Response Success (200):**
```json
{
  "success": true,
  "message": "Message deleted successfully",
  "data": {
    "id": 10,
    "isDeleted": true,
    "deletedAt": "2024-03-28T20:10:00.000Z"
  }
}
```

**Note:** Pesan akan di-soft delete dengan mengubah content menjadi "[Message deleted]"

---

### 2.5 Upload Chat Attachment

**Endpoint:**
```
POST /api/richzlog/tasklist/{tasklistId}/chat/upload
```

**Headers:**
```
Content-Type: multipart/form-data
```

**Request Body (multipart/form-data):**
```
file: [binary file data]
```

**Example Request:**
```bash
curl -X POST "http://localhost:3000/api/richzlog/tasklist/123/chat/upload" \
  -F "file=@/path/to/document.pdf"
```

**Response Success (200):**
```json
{
  "success": true,
  "message": "File uploaded successfully",
  "data": {
    "fileName": "document.pdf",
    "fileSize": 1024000,
    "fileType": "application/pdf",
    "fileUrl": "/uploads/richzlog/chat/1234567890-abc123.pdf",
    "thumbnailUrl": null
  }
}
```

**File Restrictions:**
- Maximum file size: 10MB
- Allowed types:
  - Images: jpeg, png, gif, webp
  - Documents: pdf, doc, docx, xls, xlsx, txt
  - Archives: zip

---

### 2.6 Mark Messages as Read

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
curl -X POST "http://localhost:3000/api/richzlog/tasklist/123/chat/read" \
  -H "Content-Type: application/json" \
  -d '{
    "messageIds": [1, 2, 3]
  }'
```

**Response Success (200):**
```json
{
  "success": true,
  "message": "Messages marked as read",
  "data": {
    "markedCount": 3,
    "unreadCount": 2
  }
}
```

---

### 2.7 Get Unread Count

**Endpoint:**
```
GET /api/richzlog/tasklist/{tasklistId}/chat/unread-count
```

**Example Request:**
```bash
curl -X GET "http://localhost:3000/api/richzlog/tasklist/123/chat/unread-count"
```

**Response Success (200):**
```json
{
  "success": true,
  "message": "Unread count retrieved successfully",
  "data": {
    "tasklistId": 123,
    "unreadCount": 5,
    "lastMessageAt": "2024-03-28T20:00:00.000Z"
  }
}
```

---

## 3. ERROR RESPONSES

### Common Error Codes

**400 Bad Request:**
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

**404 Not Found:**
```json
{
  "success": false,
  "message": "Tasklist not found",
  "error": {
    "code": "TASKLIST_NOT_FOUND",
    "details": "Tasklist with ID 123 does not exist"
  }
}
```

**403 Forbidden:**
```json
{
  "success": false,
  "message": "Unauthorized",
  "error": {
    "code": "UNAUTHORIZED",
    "details": "You can only edit your own messages"
  }
}
```

**500 Internal Server Error:**
```json
{
  "success": false,
  "message": "Internal server error",
  "error": {
    "code": "SERVER_ERROR",
    "details": "Error message details"
  }
}
```

---

## 4. DATABASE SCHEMA

### Existing Tables Used

**task_activity** (Timeline)
```sql
CREATE TABLE task_activity (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  taskId INTEGER NOT NULL,
  userId INTEGER NOT NULL,
  action TEXT NOT NULL,
  fromStatus TEXT,
  toStatus TEXT,
  note TEXT,
  metadata TEXT, -- JSON
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (taskId) REFERENCES tasklist(id) ON DELETE CASCADE
);
```

**tasklist_chat** (Chat)
```sql
CREATE TABLE tasklist_chat (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tasklist_id INTEGER NOT NULL,
  sender_id INTEGER NOT NULL,
  message TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  is_read BOOLEAN DEFAULT 0,
  file_url TEXT,
  file_name TEXT,
  file_type TEXT,
  file_size INTEGER,
  FOREIGN KEY (tasklist_id) REFERENCES tasklist(id) ON DELETE CASCADE,
  FOREIGN KEY (sender_id) REFERENCES pegawai(id)
);
```

---

## 5. IMPLEMENTATION NOTES

### Authentication
- **TODO**: Saat ini userId di-hardcode sebagai `1` untuk testing
- Perlu implementasi authentication middleware untuk mendapatkan userId dari session/JWT token
- Tambahkan header `Authorization: Bearer {token}` setelah auth diimplementasikan

### Features Not Yet Implemented
1. **Reply to Message**: Field `replyTo` selalu null (perlu tambah kolom di database)
2. **Message Edit Tracking**: Field `isEdited` selalu false (perlu tambah kolom di database)
3. **Reactions**: Array `reactions` selalu kosong (perlu tabel baru)
4. **User Photos**: Field `userPhoto` selalu null (perlu tambah kolom di tabel pegawai)
5. **WebSocket**: Real-time updates belum diimplementasikan

### File Upload
- Files disimpan di: `public/uploads/richzlog/chat/`
- URL format: `/uploads/richzlog/chat/{timestamp}-{random}.{ext}`
- Folder akan dibuat otomatis jika belum ada

### Pagination
- Default page size: 20 untuk timeline, 50 untuk chat
- Maximum page size: 100
- Messages diurutkan descending (terbaru di atas)

---

## 6. TESTING

### Test Timeline API
```bash
# Get timeline
curl -X GET "http://localhost:3000/api/richzlog/tasklist/1/timeline?page=1&size=10"
```

### Test Chat API
```bash
# Get messages
curl -X GET "http://localhost:3000/api/richzlog/tasklist/1/chat?page=1&size=20"

# Send message
curl -X POST "http://localhost:3000/api/richzlog/tasklist/1/chat" \
  -H "Content-Type: application/json" \
  -d '{"message": "Hello from API test"}'

# Upload file
curl -X POST "http://localhost:3000/api/richzlog/tasklist/1/chat/upload" \
  -F "file=@test.pdf"

# Mark as read
curl -X POST "http://localhost:3000/api/richzlog/tasklist/1/chat/read" \
  -H "Content-Type: application/json" \
  -d '{"messageIds": [1, 2, 3]}'

# Get unread count
curl -X GET "http://localhost:3000/api/richzlog/tasklist/1/chat/unread-count"
```

---

## 7. NEXT STEPS

1. **Implementasi Authentication**: Tambahkan middleware untuk validasi JWT token
2. **Add Reply Feature**: Tambah kolom `reply_to_message_id` di tabel `tasklist_chat`
3. **Add Edit Tracking**: Tambah kolom `is_edited` di tabel `tasklist_chat`
4. **Add Reactions**: Buat tabel `tasklist_chat_reactions`
5. **Add User Photos**: Tambah kolom `photo_url` di tabel `pegawai`
6. **WebSocket Integration**: Implementasi real-time updates menggunakan Socket.IO
7. **Permission Check**: Validasi user permission untuk akses timeline dan chat

---

**Document Version**: 1.0  
**Last Updated**: 2024-03-30  
**Status**: Implemented - Ready for Testing
