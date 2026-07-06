# Panduan Setup Project Logbook

## Prerequisites
- Node.js v20.x atau lebih tinggi
- npm v10.x atau lebih tinggi
- PostgreSQL database (sudah dikonfigurasi)
- Git

## Langkah-langkah Setup

### 1. Clone Repository
```bash
git clone <repository-url>
cd logbook
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Konfigurasi Environment Variables
Copy file `.env.example` ke `.env` dan sesuaikan konfigurasi:

```bash
cp .env.example .env
```

Pastikan konfigurasi berikut sudah benar di file `.env`:
- `DATABASE_URL` - Connection string PostgreSQL
- `SSO_*` - Konfigurasi SSO (jika digunakan)
- `PUSHER_*` - Konfigurasi Pusher untuk real-time chat
- `CRM_API_*` - Konfigurasi integrasi CRM
- `MARKETING_API_*` - Konfigurasi integrasi Marketing API

### 4. Generate Prisma Client
```bash
npx prisma generate
```

### 5. Sinkronisasi Database Schema (Opsional)
Jika ingin pull schema terbaru dari database:
```bash
npx prisma db pull
```

### 6. Build Aplikasi
```bash
npm run build
```

## Menjalankan Aplikasi

### Development Mode (dengan Socket.io)
```bash
npm run dev
```

### Development Mode (tanpa Socket.io)
```bash
npm run dev:nosocket
```

### Production Mode
```bash
npm start
```

### Production dengan Cron Jobs
```bash
npm run start:with-cron
```

## Scripts Tambahan

### Seed Master Data
```bash
npm run seed:master
```

### Calculate Due Dates
```bash
npm run calculate:due-dates
```

### Regenerate Prisma
```bash
npm run prisma:regenerate
```

### Testing
```bash
npm test                # Run tests
npm run test:watch      # Run tests in watch mode
npm run test:coverage   # Run tests with coverage
```

## Struktur Folder Penting

- `/prisma` - Schema database dan migrations
- `/public/uploads` - Folder untuk file uploads
- `/pages` - Next.js pages
- `/components` - React components
- `/lib` - Utility functions dan helpers
- `/docs` - Dokumentasi modul

## Troubleshooting

### Port sudah digunakan
Jika port 3000 sudah digunakan, ubah di file `.env`:
```
PORT=3001
```

### Database connection error
Pastikan:
1. PostgreSQL server berjalan
2. Credentials di `DATABASE_URL` benar
3. Database sudah dibuat
4. Firewall tidak memblokir koneksi

### Prisma Client error
Regenerate Prisma Client:
```bash
npx prisma generate
```

## Fitur Utama

- Project Management & Tracking
- Task Management dengan kompleksitas
- Business Analyst Module
- Blueprint Management
- UAT (User Acceptance Testing)
- Go-Live Management
- Real-time Chat (Socket.io & Pusher)
- GitHub Integration
- CRM Integration
- Marketing API Integration
- SLA Monitoring
- Team & Department Management

## Port Default

- Development: 3000
- Production: 7001 (dapat diubah via environment variable)

## Support

Untuk bantuan lebih lanjut, lihat dokumentasi di folder `/docs` atau hubungi tim development.
