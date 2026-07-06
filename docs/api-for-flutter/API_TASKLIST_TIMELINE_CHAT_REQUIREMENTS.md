# RichzLog Tasklist Timeline & Chat API Requirements

## Overview
Dokumentasi ini menjelaskan requirement API yang dibutuhkan untuk fitur **Activity Timeline** dan **Chat** pada Tasklist Detail di aplikasi mobile RichzSpot.

---

## 1. TASKLIST ACTIVITY TIMELINE API

### 1.1 Get Tasklist Activity Timeline

**Endpoint:**
```
GET /api/richzlog/tasklist/{tasklistId}/timeline
```

**Description:**
Mengambil history/timeline aktivitas dari sebuah tasklist, termasuk semua perubahan status, komentar, dan aksi yang dilakukan.

**Headers:**
```
Authorization: Bearer {jwt_token}
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
| size | integer | No | 20 | Jumlah data per halaman |
| sortDir | string | No | desc | Urutan data (asc/desc) |

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
        "description": "Task assigned to senior architect, initial environment setup and repository sync completed",
        "icon": "play_circle",
        "color": "#1976D2",
        "userId": 45,
        "userName": "John Doe",
        "userPhoto": "https://example.com/photos/john.jpg",
        "metadata": {
          "oldStatus": null,
          "newStatus": "SEDANG_DIPROSES_USER",
          "additionalInfo": "Initial setup completed"
        },
        "createdAt": "2024-03-28T18:10:00Z",
        "formattedTime": "18:10 AM"
      },
      {
        "id": 2,
        "tasklistId": 123,
        "activityType": "draft_created",
        "activityCode": "DRAFT_CREATED",
        "title": "Draft Created",
        "description": "First iteration of the technical documentation uploaded for internal validation",
        "icon": "edit_document",
        "color": "#2E7D32",
        "userId": 45,
        "userName": "John Doe",
        "userPhoto": "https://example.com/photos/john.jpg",
        "metadata": {
          "documentUrl": "https://example.com/docs/draft-v1.pdf",
          "version": "1.0"
        },
        "createdAt": "2024-03-28T15:11:00Z",
        "formattedTime": "15:11 AM"
      },
      {
        "id": 3,
        "tasklistId": 123,
        "activityType": "review_requested",
        "activityCode": "REVIEW_REQUESTED",
        "title": "Review Requested",
        "description": "Peer review triggered for System Architecture Team. Pending feedback on module 5",
        "icon": "rate_review",
        "color": "#F57C00",
        "userId": 45,
        "userName": "John Doe",
        "userPhoto": "https://example.com/photos/john.jpg",
        "metadata": {
          "reviewers": ["Jane Smith", "Bob Wilson"],
          "module": "Module 5"
        },
        "createdAt": "2024-03-28T13:43:00Z",
        "formattedTime": "01:43 PM"
      },
      {
        "id": 4,
        "tasklistId": 123,
        "activityType": "submission",
        "activityCode": "FINAL_SUBMISSION",
        "title": "Final Submission",
        "description": "All revisions merged. Final document submitted for stakeholder approval",
        "icon": "check_circle",
        "color": "#1565C0",
        "userId": 45,
        "userName": "John Doe",
        "userPhoto": "https://example.com/photos/john.jpg",
        "metadata": {
          "finalDocumentUrl": "https://example.com/docs/final.pdf",
          "approvers": ["Manager Name"]
        },
        "createdAt": "2024-03-28T16:03:00Z",
        "formattedTime": "16:03 PM"
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

**Response Error (404):**
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

**Response Error (403):**
```json
{
  "success": false,
  "message": "Access denied",
  "error": {
    "code": "ACCESS_DENIED",
    "details": "You don't have permission to view this tasklist timeline"
  }
}
```

---

### 1.2 Activity Types & Codes

Berikut adalah daftar activity types yang harus didukung:

| Activity Type | Activity Code | Icon | Color | Description |
|---------------|---------------|------|-------|-------------|
| status_change | WORK_STARTED | play_circle | #1976D2 (Blue) | Task dimulai |
| status_change | WORK_PAUSED | pause_circle | #F57C00 (Orange) | Task di-pause |
| status_change | WORK_RESUMED | play_circle | #1976D2 (Blue) | Task dilanjutkan |
| status_change | WORK_COMPLETED | check_circle | #2E7D32 (Green) | Task selesai dikerjakan |
| draft_created | DRAFT_CREATED | edit_document | #2E7D32 (Green) | Draft dibuat |
| review_requested | REVIEW_REQUESTED | rate_review | #F57C00 (Orange) | Review diminta |
| review_approved | REVIEW_APPROVED | check_circle | #2E7D32 (Green) | Review disetujui |
| review_rejected | REVIEW_REJECTED | cancel | #C62828 (Red) | Review ditolak |
| submission | FINAL_SUBMISSION | check_circle | #1565C0 (Dark Blue) | Submission final |
| comment_added | COMMENT_ADDED | comment | #616161 (Grey) | Komentar ditambahkan |
| assignee_changed | ASSIGNEE_CHANGED | person | #7B1FA2 (Purple) | Assignee diubah |
| priority_changed | PRIORITY_CHANGED | priority_high | #F57C00 (Orange) | Priority diubah |
| deadline_changed | DEADLINE_CHANGED | calendar_today | #1976D2 (Blue) | Deadline diubah |

---

### 1.3 Database Schema Recommendation

**Table: `richzlog_tasklist_timeline`**

```sql
CREATE TABLE richzlog_tasklist_timeline (
    id SERIAL PRIMARY KEY,
    tasklist_id INTEGER NOT NULL,
    activity_type VARCHAR(50) NOT NULL,
    activity_code VARCHAR(50) NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    icon VARCHAR(50),
    color VARCHAR(20),
    user_id INTEGER NOT NULL,
    metadata JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (tasklist_id) REFERENCES richzlog_tasklist(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

-- Indexes for performance
CREATE INDEX idx_timeline_tasklist ON richzlog_tasklist_timeline(tasklist_id);
CREATE INDEX idx_timeline_created ON richzlog_tasklist_timeline(created_at DESC);
CREATE INDEX idx_timeline_type ON richzlog_tasklist_timeline(activity_type);
```

---

## 2. TASKLIST CHAT API

### 2.1 Get Tasklist Chat Messages

**Endpoint:**
```
GET /api/richzlog/tasklist/{tasklistId}/chat
```

**Description:**
Mengambil daftar pesan chat untuk sebuah tasklist.

**Headers:**
```
Authorization: Bearer {jwt_token}
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
| size | integer | No | 50 | Jumlah pesan per halaman |
| before | string | No | null | Ambil pesan sebelum timestamp ini (ISO 8601) |
| after | string | No | null | Ambil pesan setelah timestamp ini (ISO 8601) |

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
        "userPhoto": "https://example.com/photos/john.jpg",
        "userRole": "Programmer",
        "message": "I've completed the initial setup. Ready for review.",
        "messageType": "text",
        "attachments": [],
        "replyTo": null,
        "isEdited": false,
        "isDeleted": false,
        "reactions": [
          {
            "emoji": "👍",
            "count": 2,
            "users": ["Jane Smith", "Bob Wilson"]
          }
        ],
        "createdAt": "2024-03-28T18:15:00Z",
        "updatedAt": "2024-03-28T18:15:00Z",
        "formattedTime": "18:15"
      },
      {
        "id": 2,
        "tasklistId": 123,
        "userId": 67,
        "userName": "Jane Smith",
        "userPhoto": "https://example.com/photos/jane.jpg",
        "userRole": "Manager",
        "message": "Great work! Please proceed with the next phase.",
        "messageType": "text",
        "attachments": [],
        "replyTo": {
          "messageId": 1,
          "userName": "John Doe",
          "messagePreview": "I've completed the initial setup..."
        },
        "isEdited": false,
        "isDeleted": false,
        "reactions": [],
        "createdAt": "2024-03-28T18:20:00Z",
        "updatedAt": "2024-03-28T18:20:00Z",
        "formattedTime": "18:20"
      },
      {
        "id": 3,
        "tasklistId": 123,
        "userId": 45,
        "userName": "John Doe",
        "userPhoto": "https://example.com/photos/john.jpg",
        "userRole": "Programmer",
        "message": "Here's the documentation draft",
        "messageType": "file",
        "attachments": [
          {
            "id": 1,
            "fileName": "technical-doc-v1.pdf",
            "fileSize": 2048576,
            "fileType": "application/pdf",
            "fileUrl": "https://example.com/files/doc.pdf",
            "thumbnailUrl": null
          }
        ],
        "replyTo": null,
        "isEdited": false,
        "isDeleted": false,
        "reactions": [],
        "createdAt": "2024-03-28T19:00:00Z",
        "updatedAt": "2024-03-28T19:00:00Z",
        "formattedTime": "19:00"
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

**Description:**
Mengirim pesan chat baru ke tasklist.

**Headers:**
```
Authorization: Bearer {jwt_token}
Content-Type: application/json
```

**Path Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| tasklistId | integer | Yes | ID dari tasklist |

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
  "replyToMessageId": 5,
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
    "userPhoto": "https://example.com/photos/john.jpg",
    "userRole": "Programmer",
    "message": "This is a test message",
    "messageType": "text",
    "attachments": [],
    "replyTo": null,
    "isEdited": false,
    "isDeleted": false,
    "reactions": [],
    "createdAt": "2024-03-28T20:00:00Z",
    "updatedAt": "2024-03-28T20:00:00Z",
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

**Description:**
Mengedit pesan chat yang sudah dikirim (hanya bisa edit pesan sendiri).

**Request Body:**
```json
{
  "message": "Updated message content"
}
```

**Response Success (200):**
```json
{
  "success": true,
  "message": "Message updated successfully",
  "data": {
    "id": 10,
    "message": "Updated message content",
    "isEdited": true,
    "updatedAt": "2024-03-28T20:05:00Z"
  }
}
```

---

### 2.4 Delete Chat Message

**Endpoint:**
```
DELETE /api/richzlog/tasklist/{tasklistId}/chat/{messageId}
```

**Description:**
Menghapus pesan chat (soft delete - hanya bisa delete pesan sendiri).

**Response Success (200):**
```json
{
  "success": true,
  "message": "Message deleted successfully",
  "data": {
    "id": 10,
    "isDeleted": true,
    "deletedAt": "2024-03-28T20:10:00Z"
  }
}
```

---

### 2.5 Add Reaction to Message

**Endpoint:**
```
POST /api/richzlog/tasklist/{tasklistId}/chat/{messageId}/reaction
```

**Description:**
Menambahkan emoji reaction ke pesan.

**Request Body:**
```json
{
  "emoji": "👍"
}
```

**Response Success (200):**
```json
{
  "success": true,
  "message": "Reaction added successfully",
  "data": {
    "messageId": 10,
    "emoji": "👍",
    "userId": 45,
    "userName": "John Doe"
  }
}
```

---

### 2.6 Upload Chat Attachment

**Endpoint:**
```
POST /api/richzlog/tasklist/{tasklistId}/chat/upload
```

**Description:**
Upload file untuk attachment chat.

**Headers:**
```
Authorization: Bearer {jwt_token}
Content-Type: multipart/form-data
```

**Request Body (multipart/form-data):**
```
file: [binary file data]
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
    "fileUrl": "https://example.com/uploads/richzlog/chat/document.pdf",
    "thumbnailUrl": null
  }
}
```

---

### 2.7 Mark Messages as Read

**Endpoint:**
```
POST /api/richzlog/tasklist/{tasklistId}/chat/read
```

**Description:**
Menandai pesan sebagai sudah dibaca.

**Request Body:**
```json
{
  "messageIds": [1, 2, 3, 4, 5]
}
```

**Response Success (200):**
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

### 2.8 Get Unread Count

**Endpoint:**
```
GET /api/richzlog/tasklist/{tasklistId}/chat/unread-count
```

**Description:**
Mendapatkan jumlah pesan yang belum dibaca.

**Response Success (200):**
```json
{
  "success": true,
  "message": "Unread count retrieved successfully",
  "data": {
    "tasklistId": 123,
    "unreadCount": 5,
    "lastMessageAt": "2024-03-28T20:00:00Z"
  }
}
```

---

### 2.9 Database Schema Recommendation

**Table: `richzlog_tasklist_chat`**

```sql
CREATE TABLE richzlog_tasklist_chat (
    id SERIAL PRIMARY KEY,
    tasklist_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    message TEXT NOT NULL,
    message_type VARCHAR(20) DEFAULT 'text',
    reply_to_message_id INTEGER,
    is_edited BOOLEAN DEFAULT FALSE,
    is_deleted BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP,
    
    FOREIGN KEY (tasklist_id) REFERENCES richzlog_tasklist(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    FOREIGN KEY (reply_to_message_id) REFERENCES richzlog_tasklist_chat(id) ON DELETE SET NULL
);

CREATE TABLE richzlog_tasklist_chat_attachments (
    id SERIAL PRIMARY KEY,
    message_id INTEGER NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    file_size BIGINT NOT NULL,
    file_type VARCHAR(100) NOT NULL,
    file_url TEXT NOT NULL,
    thumbnail_url TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (message_id) REFERENCES richzlog_tasklist_chat(id) ON DELETE CASCADE
);

CREATE TABLE richzlog_tasklist_chat_reactions (
    id SERIAL PRIMARY KEY,
    message_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    emoji VARCHAR(10) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (message_id) REFERENCES richzlog_tasklist_chat(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    UNIQUE(message_id, user_id, emoji)
);

CREATE TABLE richzlog_tasklist_chat_read_status (
    id SERIAL PRIMARY KEY,
    tasklist_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    last_read_message_id INTEGER NOT NULL,
    last_read_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (tasklist_id) REFERENCES richzlog_tasklist(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    FOREIGN KEY (last_read_message_id) REFERENCES richzlog_tasklist_chat(id) ON DELETE CASCADE,
    UNIQUE(tasklist_id, user_id)
);

-- Indexes for performance
CREATE INDEX idx_chat_tasklist ON richzlog_tasklist_chat(tasklist_id);
CREATE INDEX idx_chat_created ON richzlog_tasklist_chat(created_at DESC);
CREATE INDEX idx_chat_user ON richzlog_tasklist_chat(user_id);
CREATE INDEX idx_chat_deleted ON richzlog_tasklist_chat(is_deleted);
```

---

## 3. REAL-TIME UPDATES (OPTIONAL - WEBSOCKET)

### 3.1 WebSocket Connection

**Endpoint:**
```
ws://api.richzspot.com/ws/richzlog/tasklist/{tasklistId}
```

**Authentication:**
```
?token={jwt_token}
```

### 3.2 WebSocket Events

**Event: new_message**
```json
{
  "event": "new_message",
  "data": {
    "id": 15,
    "tasklistId": 123,
    "userId": 67,
    "userName": "Jane Smith",
    "message": "New message content",
    "createdAt": "2024-03-28T20:30:00Z"
  }
}
```

**Event: message_edited**
```json
{
  "event": "message_edited",
  "data": {
    "id": 15,
    "message": "Updated message content",
    "isEdited": true,
    "updatedAt": "2024-03-28T20:35:00Z"
  }
}
```

**Event: message_deleted**
```json
{
  "event": "message_deleted",
  "data": {
    "id": 15,
    "isDeleted": true,
    "deletedAt": "2024-03-28T20:40:00Z"
  }
}
```

**Event: new_activity**
```json
{
  "event": "new_activity",
  "data": {
    "id": 20,
    "tasklistId": 123,
    "activityType": "status_change",
    "title": "Work Completed",
    "description": "Task has been completed and submitted for review",
    "createdAt": "2024-03-28T20:45:00Z"
  }
}
```

**Event: user_typing**
```json
{
  "event": "user_typing",
  "data": {
    "userId": 67,
    "userName": "Jane Smith",
    "isTyping": true
  }
}
```

---

## 4. PERMISSION & ACCESS CONTROL

### 4.1 Timeline Access Rules
- User dapat melihat timeline jika:
  - User adalah assignee dari tasklist
  - User adalah creator dari tasklist
  - User adalah manager/PM dari project
  - User adalah director

### 4.2 Chat Access Rules
- User dapat melihat chat jika:
  - User memiliki akses ke tasklist (sama dengan timeline)
  
- User dapat mengirim pesan jika:
  - User memiliki akses ke tasklist
  
- User dapat edit/delete pesan jika:
  - User adalah pemilik pesan
  - Atau user adalah manager/director (untuk moderasi)

---

## 5. NOTIFICATION INTEGRATION

### 5.1 Push Notification Triggers

**Chat Notifications:**
- New message in tasklist chat (jika user di-mention atau reply)
- New message in tasklist yang user terlibat

**Timeline Notifications:**
- Status change yang mempengaruhi user
- Review request untuk user
- Task assignment ke user

**Notification Payload:**
```json
{
  "type": "richzlog_chat",
  "title": "New message from Jane Smith",
  "body": "Great work! Please proceed with the next phase.",
  "data": {
    "tasklistId": 123,
    "messageId": 2,
    "screen": "tasklist_detail",
    "tab": "chat"
  }
}
```

---

## 6. TESTING CHECKLIST

### Timeline API Testing:
- [ ] Get timeline dengan berbagai filter
- [ ] Timeline pagination
- [ ] Timeline dengan berbagai activity types
- [ ] Timeline access control
- [ ] Timeline performance dengan banyak data

### Chat API Testing:
- [ ] Send text message
- [ ] Send message with file attachment
- [ ] Reply to message
- [ ] Edit message
- [ ] Delete message
- [ ] Add reaction
- [ ] Remove reaction
- [ ] Mark as read
- [ ] Get unread count
- [ ] Chat pagination
- [ ] Chat access control
- [ ] File upload validation
- [ ] Real-time updates (if implemented)

---

## 7. PERFORMANCE CONSIDERATIONS

1. **Pagination**: Implementasi pagination untuk timeline dan chat
2. **Caching**: Cache timeline data untuk mengurangi database load
3. **Indexing**: Pastikan semua foreign keys dan frequently queried columns ter-index
4. **File Storage**: Gunakan cloud storage (S3, GCS) untuk file attachments
5. **Real-time**: Pertimbangkan WebSocket atau Server-Sent Events untuk real-time updates
6. **Rate Limiting**: Implementasi rate limiting untuk prevent spam

---

## 8. SECURITY CONSIDERATIONS

1. **Authentication**: Semua endpoint harus require valid JWT token
2. **Authorization**: Validasi user permission sebelum akses data
3. **File Upload**: Validasi file type, size, dan scan for malware
4. **XSS Prevention**: Sanitize message content sebelum disimpan
5. **SQL Injection**: Gunakan prepared statements
6. **Rate Limiting**: Limit jumlah request per user per time window

---

## CONTACT & SUPPORT

Untuk pertanyaan atau klarifikasi mengenai API requirements ini, silakan hubungi:
- **Mobile Team Lead**: [Contact Info]
- **Backend Team Lead**: [Contact Info]
- **Project Manager**: [Contact Info]

---

**Document Version**: 1.0  
**Last Updated**: 2024-03-28  
**Status**: Draft - Pending Review
