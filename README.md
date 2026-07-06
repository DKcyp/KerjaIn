# Sistem Manajemen Tasklist
# test 123
Sistem manajemen berbasis web yang komprehensif dibangun dengan **Next.js 15**, **React 19**, **TypeScript**, dan **Tailwind CSS V4**. Sistem ini menyediakan manajemen tugas, pelacakan proyek, integrasi kalender, dan kemampuan pelaporan dengan kontrol akses berbasis peran.
/ update
## 📖 Dokumentasi

- **[Panduan Cepat](./QUICK_START.md)** - Mulai dalam 5 menit
- **[Referensi API](./API_REFERENCE_ID.md)** - Dokumentasi API lengkap
- **[Dokumentasi Modul](./docs/)** - Dokumentasi detail per modul

## 🚀 Teknologi yang Digunakan

- **Framework:** Next.js 15.2.3 (App Router)
- **Library UI:** React 19
- **Bahasa:** TypeScript 5
- **Styling:** Tailwind CSS V4
- **Database:** PostgreSQL dengan Prisma ORM
- **Grafik:** ApexCharts
- **Kalender:** FullCalendar
- **Ikon:** Lucide React
- **Autentikasi:** Custom auth dengan dukungan SSO

## 📋 Prasyarat

Sebelum instalasi, pastikan Anda memiliki:

- **Node.js** 18.x atau lebih baru (direkomendasikan: Node.js 20.x atau lebih baru)
- **PostgreSQL** database (versi 12 atau lebih baru)
- **npm** atau **yarn** package manager
- **Git** untuk version control

## 🔧 Instalasi

### 1. Clone Repository

```bash
git clone <repository-url>
cd logbook
```

> **Pengguna Windows:** Letakkan repository dekat dengan root drive Anda jika mengalami masalah saat cloning.

### 2. Install Dependencies

```bash
npm install
# atau
yarn install
```

> **Catatan:** Gunakan flag `--legacy-peer-deps` jika mengalami error peer-dependency saat instalasi.

### 3. Setup Database

#### Buat Database PostgreSQL

Buat database PostgreSQL baru untuk aplikasi:

```sql
CREATE DATABASE logbook_db;
```

#### Konfigurasi Koneksi Database

Buat file `.env` di root directory dengan kredensial database Anda:

```env
# Konfigurasi Database
DATABASE_URL="postgresql://username:password@localhost:5432/logbook_db"

# Konfigurasi SSO (Opsional)
SSO_ENABLED="false"
SSO_BYPASS_FOR_DEV="true"

# Konfigurasi Aplikasi
NODE_ENV="development"
```

Ganti `username`, `password`, dan `logbook_db` dengan kredensial PostgreSQL Anda yang sebenarnya.

### 4. Jalankan Database Migrations

Generate Prisma Client dan jalankan migrations:

```bash
# Generate Prisma Client
npm run prisma:generate

# Jalankan migrations untuk membuat tabel database
npx prisma migrate deploy

# (Opsional) Seed data master
npm run seed:master
```

### 5. Jalankan Development Server

```bash
npm run dev
```

Aplikasi akan tersedia di `http://localhost:3000`

## 🎯 Perintah yang Tersedia

| Perintah | Deskripsi |
|---------|-------------|
| `npm run dev` | Jalankan development server di port 3000 |
| `npm run build` | Build aplikasi untuk production |
| `npm run start` | Jalankan production server |
| `npm run start:with-cron` | Jalankan server dengan cron jobs untuk ringkasan harian |
| `npm run start:bare` | Jalankan server di port 3001 |
| `npm run lint` | Jalankan ESLint untuk kualitas kode |
| `npm run test` | Jalankan Jest tests |
| `npm run test:watch` | Jalankan tests dalam watch mode |
| `npm run test:coverage` | Generate laporan test coverage |
| `npm run prisma:generate` | Generate Prisma Client |
| `npm run prisma:regenerate` | Regenerate Prisma Client |
| `npm run seed:master` | Seed data master ke database |
| `npm run calculate:due-dates` | Hitung due dates untuk task yang sudah ada |

## 🗄️ Skema Database

Sistem menggunakan model utama berikut:

- **Pegawai** - Manajemen user/karyawan dengan akses berbasis peran
- **Proyek** - Manajemen proyek
- **Tasklist** - Pelacakan tugas dengan alur status
- **Blueprint** - Modul blueprint untuk perencanaan proyek
- **EutTest** - Equipment Under Test/System Integration Testing
- **UatTest** - User Acceptance Testing
- **GoLive** - Command center go-live dan pelacakan deployment

## 👥 Peran Pengguna

Sistem mendukung peran berikut:

- **SUPER_ADMIN** - Akses penuh ke sistem
- **ADMIN** - Akses administratif ke semua tugas dan pengguna
- **PM** (Project Manager) - Mengelola tugas tim dan persetujuan
- **PROGRAMMER** - Mengerjakan tugas yang ditugaskan

## 🔐 Kredensial Login Default

Setelah seeding database, Anda dapat menggunakan kredensial berikut:

```
Username: admin
Password: admin
Role: SUPER_ADMIN
```

> **Penting:** Ubah password default di lingkungan production!

## 📁 Struktur Proyek

```
logbook/
├── app/                    # Halaman Next.js App Router
│   ├── api/               # Route API
│   ├── calendar/          # Modul kalender
│   ├── laporan/           # Modul laporan
│   ├── tasklist/          # Manajemen tugas
│   └── ...
├── components/            # Komponen React yang dapat digunakan kembali
├── prisma/               # Skema database dan migrations
│   ├── schema.prisma     # Definisi skema Prisma
│   └── migrations/       # Migrations database
├── public/               # Aset statis
├── scripts/              # Script utilitas
├── docs/                 # Dokumentasi modul
└── package.json          # Dependencies dan scripts
```

## ✨ Fitur Utama

### Manajemen Tugas
- **Pembuatan & Penugasan** - Buat tugas dengan deskripsi detail, deadline, dan penugasan
- **Alur Status** - Lacak tugas melalui berbagai status (Menunggu, Dalam Proses, Dijeda, Review, Selesai)
- **Deskripsi Programmer & PM** - Catat catatan dari programmer dan project manager
- **Lampiran File** - Upload gambar dan dokumen ke tugas
- **Pelacakan Riwayat** - Jejak audit lengkap dari semua perubahan tugas

### Integrasi Kalender
- **Tampilan FullCalendar** - Kalender visual dengan penjadwalan tugas
- **Multiple Filter** - Filter berdasarkan user, status, dan rentang tanggal
- **Drag & Drop** - Jadwal ulang tugas dengan antarmuka drag-and-drop
- **Kode Warna** - Tugas diberi kode warna berdasarkan status untuk identifikasi mudah

### Pelaporan & Analitik
- **Laporan Tugas** - Generate laporan tugas detail dengan ekspor Excel
- **Monitoring SLA** - Lacak deadline tugas dan item yang terlambat
- **Ringkasan Harian** - Notifikasi WhatsApp otomatis untuk status tugas
- **Metrik Performa** - Dashboard dengan grafik dan statistik

### Manajemen Proyek
- **Dukungan Multi-Proyek** - Kelola beberapa proyek secara bersamaan
- **Penugasan Tim** - Tugaskan anggota tim ke proyek tertentu
- **Modul Blueprint** - Perencanaan proyek dan manajemen blueprint
- **Modul Testing** - Alur kerja EUT/SIT dan UAT testing
- **Pelacakan Go-Live** - Checklist deployment dan command center go-live

### Kontrol Akses Berbasis Peran
- **SUPER_ADMIN** - Administrasi sistem lengkap
- **ADMIN** - Kelola semua tugas dan pengguna
- **PM** - Review dan setujui tugas tim
- **PROGRAMMER** - Kerjakan tugas yang ditugaskan

### Komponen UI
- Sidebar responsif dengan dukungan dark mode 🕶️
- Visualisasi data dengan ApexCharts
- Tabel interaktif dengan sorting dan filtering
- Dialog modal untuk detail tugas
- Menu dropdown dan elemen form
- Notifikasi alert dan toast messages
- Upload file dengan dukungan drag-and-drop

## 📚 Dokumentasi Modul

Dokumentasi komprehensif untuk setiap modul diorganisir dalam direktori `docs/`:

### Dokumentasi Modul
- **[Modul Blueprint](docs/blueprint/)** - Implementasi blueprint dan dokumentasi modul
- **[Modul EUT/SIT](docs/eut-sit/)** - Dokumentasi Equipment Under Test dan System Integration Testing
- **[Modul Go-Live](docs/go-live/)** - Command center go-live dan panduan deployment
- **[Dashboard Proyek](docs/project-dashboard/)** - Implementasi dashboard proyek dan panduan testing
- **[Modul Laporan](docs/reports/)** - Modul laporan dan implementasi tree view
- **[Modul UAT](docs/uat/)** - Dokumentasi modul User Acceptance Testing

Setiap direktori modul berisi:
- Panduan quick start
- Ringkasan implementasi
- Preview visual dan showcase komponen
- Panduan testing dan best practices

## 🌍 Variabel Environment

Buat file `.env` di root directory dengan variabel berikut:

```env
# Database
DATABASE_URL="postgresql://username:password@localhost:5432/logbook_db"

# Konfigurasi SSO (Opsional)
SSO_ENABLED="false"
SSO_BYPASS_FOR_DEV="true"
SSO_API_URL="https://your-sso-api.com"
SSO_CLIENT_ID="your-client-id"
SSO_CLIENT_SECRET="your-client-secret"

# Aplikasi
NODE_ENV="development"
NEXT_PUBLIC_APP_URL="http://localhost:3000"

# Integrasi WhatsApp (Opsional)
WHATSAPP_API_URL="https://your-whatsapp-api.com"
WHATSAPP_API_KEY="your-api-key"

# Upload File
MAX_FILE_SIZE="5242880"  # 5MB dalam bytes
UPLOAD_DIR="./public/uploads"
```

## 🚀 Deployment

### Build Production

1. **Build aplikasi:**
   ```bash
   npm run build
   ```

2. **Jalankan production server:**
   ```bash
   npm run start
   ```

3. **Dengan cron jobs (untuk ringkasan harian):**
   ```bash
   npm run start:with-cron
   ```

### Platform Deployment

#### Vercel (Direkomendasikan untuk Next.js)
1. Push kode Anda ke GitHub
2. Import proyek ke Vercel
3. Konfigurasi variabel environment
4. Deploy otomatis

#### Deployment Docker
```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . . 
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
```

#### Server Tradisional
1. Install Node.js dan PostgreSQL di server
2. Clone repository
3. Konfigurasi variabel environment
4. Jalankan database migrations
5. Build dan jalankan aplikasi
6. Gunakan PM2 untuk manajemen proses:
   ```bash
   npm install -g pm2
   pm2 start npm --name "logbook" -- start
   ```

## 🔧 Troubleshooting

### Masalah Umum

#### Error Koneksi Database
```
Error: Can't reach database server at `localhost:5432`
```
**Solusi:** 
- Pastikan PostgreSQL berjalan
- Verifikasi DATABASE_URL di file `.env`
- Periksa pengaturan firewall

#### Prisma Client Belum Di-generate
```
Error: @prisma/client did not initialize yet
```
**Solusi:**
```bash
npm run prisma:generate
```

#### Port Sudah Digunakan
```
Error: Port 3000 is already in use
```
**Solusi:**
- Matikan proses yang menggunakan port 3000
- Atau jalankan di port berbeda: `PORT=3001 npm run dev`

#### Error Build
```
Error: Module not found
```
**Solusi:**
```bash
# Hapus cache dan install ulang
rm -rf node_modules .next
npm install
npm run build
```

#### Masalah Session/Login
**Solusi:**
- Hapus cookies browser
- Periksa konfigurasi SSO di `.env`
- Verifikasi user ada di database

### Reset Database

Jika Anda perlu reset database:

```bash
# Reset database (PERINGATAN: Ini akan menghapus semua data)
npx prisma migrate reset

# Regenerate Prisma Client
npm run prisma:generate

# Seed data master
npm run seed:master
```

## 🔄 Update & Maintenance

### Update Dependencies

```bash
# Cek package yang outdated
npm outdated

# Update semua dependencies
npm update

# Update package tertentu
npm install package-name@latest
```

### Migrations Database

Ketika skema berubah:

```bash
# Buat migration
npx prisma migrate dev --name migration_name

# Terapkan migration ke production
npx prisma migrate deploy
```

## 📝 Changelog

### Versi 2.0.2 - [25 Maret 2025]
- Upgrade ke Next v15.2.3 untuk mengatasi [CVE-2025-29927](https://nextjs.org/blog/cve-2025-29927) security concerns
- Menambahkan overrides untuk package vectormap untuk mencegah peer dependency errors
- Migrasi dari react-flatpickr ke package flatpickr untuk dukungan React 19

### Versi 2.0.1 - [27 Februari 2025]
- Upgrade ke Tailwind CSS v4 untuk performa dan efisiensi yang lebih baik
- Update penggunaan class untuk menyesuaikan dengan sintaks dan fitur terbaru
- Mengganti class yang deprecated dan optimasi styles
- Lihat Tailwind CSS v4 [Migration Guide](https://tailwindcss.com/docs/upgrade-guide) jika diperlukan

### Versi 2.0.0 - [Februari 2025]
**Update besar yang fokus pada implementasi Next.js 15**

#### Peningkatan Utama
- Redesign lengkap menggunakan Next.js 15 App Router dan React Server Components
- User interface yang ditingkatkan dengan komponen yang dioptimalkan untuk Next.js
- Peningkatan responsiveness dan accessibility
- Fitur baru: collapsible sidebar, integrasi kalender, dan manajemen tugas
- Redesign autentikasi menggunakan Next.js App Router dan server actions
- Update visualisasi data menggunakan ApexCharts untuk React
- Menambahkan Prisma ORM untuk manajemen database
- Implementasi role-based access control

#### Breaking Changes
- Migrasi dari Next.js 14 ke Next.js 15
- Komponen chart sekarang menggunakan ApexCharts untuk React
- Alur autentikasi diupdate untuk menggunakan Server Actions dan middleware

## 🤝 Kontribusi

Kami menerima kontribusi untuk meningkatkan Sistem Manajemen Logbook!

### Cara Berkontribusi

1. **Fork repository**
2. **Buat feature branch**
   ```bash
   git checkout -b feature/nama-fitur-anda
   ```
3. **Buat perubahan Anda**
4. **Test secara menyeluruh**
   ```bash
   npm run test
   npm run lint
   ```
5. **Commit perubahan Anda**
   ```bash
   git commit -m "Add: deskripsi fitur anda"
   ```
6. **Push ke fork Anda**
   ```bash
   git push origin feature/nama-fitur-anda
   ```
7. **Buat Pull Request**

### Standar Coding

- Ikuti best practices TypeScript
- Gunakan konfigurasi ESLint yang disediakan
- Tulis commit message yang bermakna
- Tambahkan tests untuk fitur baru
- Update dokumentasi sesuai kebutuhan
- Pastikan semua tests pass sebelum submit PR

### Melaporkan Issues

Jika Anda menemukan bug atau memiliki feature request:

1. Cek apakah issue sudah ada
2. Buat issue baru dengan deskripsi detail
3. Sertakan langkah-langkah untuk reproduce (untuk bugs)
4. Tambahkan screenshot jika diperlukan

## 📄 License

This project is released under the **MIT License**.

```
MIT License

Copyright (c) 2025 Logbook Management System

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

## 💬 Dukungan

### Mendapatkan Bantuan

- **Dokumentasi:** Cek direktori `docs/` untuk panduan spesifik modul
- **Issues:** Laporkan bugs atau request fitur via GitHub Issues
- **Community:** Bergabung dalam diskusi di GitHub Discussions

### Kontak

Untuk pertanyaan atau dukungan:
- Buat issue di GitHub
- Cek dokumentasi yang ada
- Review bagian troubleshooting di atas

---

**Dibangun dengan ❤️ menggunakan Next.js, React, TypeScript, dan Tailwind CSS**

Jika proyek ini membantu Anda, mohon berikan ⭐ di GitHub!
