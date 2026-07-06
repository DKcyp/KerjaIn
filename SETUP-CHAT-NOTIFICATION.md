# Setup Guide - Chat & Notification System

## 📋 Prerequisites

Pastikan sistem sudah memiliki:
- Node.js (v18 atau lebih tinggi)
- PostgreSQL database
- Git

## 🚀 Installation Steps

### 1. Clone Repository
```bash
git clone <repository-url>
cd logbook
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Environment Variables
Buat file `.env` di root directory dengan konfigurasi berikut:

```env
# Database
DATABASE_URL="postgresql://username:password@localhost:5432/database_name"

# App Configuration
NEXT_PUBLIC_APP_URL="http://localhost:3000"
NODE_ENV="development"

# Optional: Custom hostname and port
HOSTNAME="localhost"
PORT="3000"
```

### 4. Database Setup
```bash
# Generate Prisma client
npx prisma generate

# Run database migrations
npx prisma migrate dev

# Optional: Seed database (jika ada)
npm run seed:master
```

### 5. Start Development Server
```bash
# Start with Socket.IO support (recommended)
npm run dev

# Alternative: Start without Socket.IO
npm run dev:nosocket
```

## 🔧 Chat & Notification Features

### Database Tables
Sistem ini menggunakan 3 tabel utama:

1. **`tasklist_chat`** - Menyimpan pesan chat
2. **`notification`** - Menyimpan notifikasi sistem
3. **`task_activity`** - Log aktivitas task

### API Endpoints

#### Chat Endpoints:
- `GET /api/tasklist/[id]/chat` - Ambil semua pesan chat
- `POST /api/tasklist/[id]/chat` - Kirim pesan chat baru
- `GET /api/tasklist/[id]/chat/unread` - Hitung pesan belum dibaca
- `POST /api/tasklist/[id]/chat/unread` - Tandai semua pesan sebagai dibaca
- `GET /api/chat/unread-summary` - Ringkasan chat belum dibaca

#### Notification Endpoints:
- `GET /api/notifications` - Ambil notifikasi user
- `POST /api/notifications/mark-read/[id]` - Tandai notifikasi dibaca
- `POST /api/notifications/mark-all-read` - Tandai semua notifikasi dibaca

### Socket.IO Events

#### Client → Server:
- `join-tasklist` - Bergabung ke room task
- `leave-tasklist` - Keluar dari room task
- `new-message` - Kirim pesan baru
- `chat-notification` - Broadcast notifikasi chat
- `typing` - Indikator sedang mengetik
- `stop-typing` - Berhenti mengetik

#### Server → Client:
- `message-received` - Pesan baru diterima
- `chat-notification` - Notifikasi chat global
- `user-typing` - User sedang mengetik
- `user-stop-typing` - User berhenti mengetik

## 📁 File Structure

```
src/
├── app/api/
│   ├── chat/
│   │   └── unread-summary/route.ts
│   ├── notifications/
│   │   ├── route.ts
│   │   ├── mark-read/[id]/route.ts
│   │   └── mark-all-read/route.ts
│   └── tasklist/[id]/chat/
│       ├── route.ts
│       └── unread/route.ts
├── components/
│   ├── header/NotificationDropdown.tsx
│   └── tasklist/TaskChatPanel.tsx
├── context/
│   ├── NotificationContext.tsx
│   └── SocketContext.tsx
└── lib/
    ├── notificationHelper.ts
    └── pusher-server.ts
```

## 🔄 Migration Notes

### Dari sistem lama ke sistem baru:

1. **Database Schema**: Semua tabel sudah ada di `schema.prisma`
2. **Dependencies**: Semua package sudah ada di `package.json`
3. **No Breaking Changes**: Sistem chat dan notifikasi tidak mengubah fungsi existing

### Fitur yang ditambahkan:
- ✅ Real-time chat dengan Socket.IO
- ✅ File upload dalam chat
- ✅ Notifikasi sistem terpusat
- ✅ Unread message counter
- ✅ Typing indicators
- ✅ Chat history per task

## 🛠️ Troubleshooting

### Socket.IO Connection Issues:
```bash
# Jika ada masalah koneksi, coba start tanpa socket
npm run dev:nosocket
```

### Database Migration Issues:
```bash
# Reset database (HATI-HATI: akan menghapus data)
npx prisma migrate reset

# Atau push schema tanpa migration
npx prisma db push
```

### Permission Issues:
```bash
# Pastikan folder upload ada dan writable
mkdir -p public/uploads/chat
chmod 755 public/uploads/chat
```

## 📝 Production Deployment

### Build & Start:
```bash
npm run build
npm start
```

### Environment Variables untuk Production:
```env
NODE_ENV="production"
DATABASE_URL="postgresql://..."
NEXT_PUBLIC_APP_URL="https://your-domain.com"
```

### Nginx Configuration (optional):
```nginx
location /socket.io/ {
    proxy_pass http://localhost:3000;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}
```

## ✅ Verification

Setelah setup, pastikan:
1. Server berjalan di `http://localhost:3000`
2. Database terkoneksi
3. Chat panel muncul di task detail
4. Notifikasi dropdown berfungsi
5. Socket.IO connected (cek browser console)

## 🆘 Support

Jika ada masalah:
1. Cek console browser untuk error JavaScript
2. Cek terminal server untuk error backend
3. Pastikan database schema up-to-date
4. Verifikasi environment variables
