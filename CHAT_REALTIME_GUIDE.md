# 💬 Real-Time Chat Feature

## 📋 Overview

Fitur chat real-time menggunakan **Socket.IO** untuk komunikasi antar user dalam satu tasklist.

---

## ✨ Features

- ✅ **Real-time messaging** - Pesan muncul langsung tanpa refresh
- ✅ **File upload** - Support gambar dan dokumen
- ✅ **Room-based** - Chat terpisah per tasklist
- ✅ **Auto-reconnect** - Koneksi otomatis pulih jika terputus
- ✅ **Message history** - Semua pesan tersimpan di database

---

## 🗂️ File Structure

```
server-socket.js                              # Socket.IO server
src/
  ├── context/
  │   └── SocketContext.tsx                   # Socket connection management
  ├── components/
  │   └── tasklist/
  │       └── TaskChatPanel.tsx               # Chat UI component
  ├── app/
  │   ├── layout.tsx                          # Updated with SocketProvider
  │   ├── (admin)/
  │   │   └── tasklist/
  │   │       └── page.tsx                    # Updated with chat tab
  │   └── api/
  │       └── tasklist/
  │           └── [id]/
  │               └── chat/
  │                   └── route.ts            # Chat API endpoint
prisma/
  ├── schema.prisma                           # Updated with TasklistChat model
  └── migrations/
      └── 20251110040000_add_tasklist_chat/   # Database migration
```

---

## 🚀 Usage

### **Development:**
```bash
npm run dev
```

Server akan jalan di `http://localhost:3000` dengan Socket.IO enabled.

### **Testing:**
1. Buka 2 browser dengan user berbeda
2. Buka task yang sama
3. Klik tab "Chat"
4. Kirim pesan dari browser pertama
5. Pesan akan muncul real-time di browser kedua

---

## 🗄️ Database Schema

```prisma
model TasklistChat {
  id         Int      @id @default(autoincrement())
  tasklistId Int
  senderId   Int
  message    String
  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt
  isRead     Boolean  @default(false)
  fileUrl    String?
  fileName   String?
  fileType   String?
  fileSize   Int?
  
  tasklist   Tasklist @relation(fields: [tasklistId], references: [id], onDelete: Cascade)
  sender     Pegawai  @relation(fields: [senderId], references: [id])
}
```

---

## 🔌 Socket.IO Events

### **Client → Server:**
- `join-tasklist` - Join room untuk tasklist tertentu
- `leave-tasklist` - Leave room
- `new-message` - Broadcast pesan baru

### **Server → Client:**
- `message-received` - Terima pesan baru dari user lain

---

## 📦 Dependencies

```json
{
  "socket.io": "^4.8.1",
  "socket.io-client": "^4.8.1"
}
```

---

## 🚀 Deployment

### **VPS (Recommended untuk Real-Time):**
```bash
# Install dependencies
npm install

# Generate Prisma Client
npx prisma generate

# Run migration
npx prisma migrate deploy

# Start with PM2
pm2 start server-socket.js --name logbook-app
```

### **Vercel/Netlify (Tanpa Real-Time):**
WebSocket tidak support di serverless platform. Chat tetap berfungsi tapi perlu refresh manual.

---

## 📝 Notes

- File upload disimpan di `public/uploads/chat/`
- Max file size: 10MB (configurable)
- Support format: images, PDF, Word, Excel
- Chat history tersimpan permanent di database

---

**Created:** 10 November 2025  
**Version:** 1.0.0
