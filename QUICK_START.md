# Panduan Cepat

Panduan ini akan membantu Anda menjalankan Sistem Manajemen Logbook dalam hitungan menit.

## 🚀 Instalasi Cepat (5 Menit)

### Langkah 1: Cek Prasyarat
```bash
# Cek versi Node.js (harus 18.x atau lebih baru)
node --version

# Cek instalasi PostgreSQL
psql --version
```

### Langkah 2: Clone & Install
```bash
# Clone repository
git clone <repository-url>
cd logbook

# Install dependencies
npm install
```

### Langkah 3: Setup Database
```bash
# Buat database PostgreSQL
createdb logbook_db

# Atau menggunakan psql
psql -U postgres
CREATE DATABASE logbook_db;
\q
```

### Langkah 4: Konfigurasi Environment
Buat file `.env`:
```env
DATABASE_URL="postgresql://postgres:password@localhost:5432/logbook_db"
SSO_ENABLED="false"
SSO_BYPASS_FOR_DEV="true"
NODE_ENV="development"
```

### Langkah 5: Inisialisasi Database
```bash
# Generate Prisma Client
npm run prisma:generate

# Jalankan migrations
npx prisma migrate deploy

# Seed data awal
npm run seed:master
```

### Langkah 6: Jalankan Development Server
```bash
npm run dev
```

Kunjungi `http://localhost:3000` dan login dengan:
- **Username:** admin
- **Password:** admin

## 📋 Tugas Umum

### Membuat Task Baru
1. Login sebagai ADMIN atau PM
2. Navigasi ke halaman "Tasklist"
3. Klik tombol "Tambah Task"
4. Isi detail task:
   - Kode Task
   - Nama Task
   - Assign ke user
   - Set deadlines
5. Klik "Simpan"

### Menugaskan Task ke Programmer
1. Pilih proyek dari dropdown
2. Pilih programmer dari dropdown "Pegawai"
3. Set tanggal jadwal dan deadlines
4. Tambahkan deskripsi task
5. Upload lampiran (opsional)

### Review Task (PM)
1. Navigasi ke task dengan status "Menunggu Review PM"
2. Buka detail task
3. Review deskripsi dan lampiran dari programmer
4. Klik "Setujui" untuk approve atau "Tolak" untuk reject
5. Tambahkan catatan PM di field deskripsi

### Melihat Kalender
1. Navigasi ke halaman "Calendar"
2. Filter berdasarkan:
   - Bulan
   - User (Pegawai)
   - Status
3. Klik pada task untuk melihat detail
4. Drag & drop untuk reschedule (jika diizinkan)

### Generate Laporan
1. Navigasi ke halaman "Laporan"
2. Terapkan filter:
   - Rentang tanggal
   - Proyek
   - User
   - Status
3. Klik "Export Excel" untuk download laporan

## 🔑 Referensi Cepat Peran Pengguna

| Peran | Hak Akses |
|------|-------------|
| **SUPER_ADMIN** | Akses penuh sistem, kelola semua user dan task |
| **ADMIN** | Kelola semua task, lihat semua user, buat/assign task |
| **PM** | Review dan approve task, kelola task tim, lihat laporan |
| **PROGRAMMER** | Kerjakan task yang ditugaskan, kirim untuk review, lihat task sendiri |

## 🎯 Alur Status Task

```
MENUNGGU_PROSES_USER (Menunggu Dimulai)
    ↓ (Programmer klik "Mulai")
SEDANG_DIPROSES_USER (Sedang Dikerjakan)
    ↓ (Programmer klik "Kirim Review")
MENUNGGU_REVIEW_PM (Menunggu Review PM)
    ↓ (PM approve)
SELESAI (Selesai)

Catatan: Task bisa dijeda (SEDANG_DIPROSES_USER_PAUSED) atau ditolak kembali ke SEDANG_DIPROSES_USER
```

## 🛠️ Perintah Development

```bash
# Jalankan development server
npm run dev

# Build untuk production
npm run build

# Jalankan production server
npm run start

# Jalankan tests
npm run test

# Jalankan linter
npm run lint

# Perintah database
npm run prisma:generate        # Generate Prisma Client
npx prisma studio             # Buka Prisma Studio (DB GUI)
npx prisma migrate dev        # Buat migration baru
npx prisma migrate reset      # Reset database (PERINGATAN: menghapus data)

# Seed data
npm run seed:master           # Seed data master
npm run calculate:due-dates   # Hitung due dates untuk task yang ada
```

## 🐛 Troubleshooting Cepat

### Tidak bisa connect ke database?
```bash
# Cek apakah PostgreSQL berjalan
sudo service postgresql status  # Linux
brew services list              # macOS
# Windows: Cek Services app

# Test koneksi
psql -U postgres -d logbook_db
```

### Error Prisma?
```bash
# Regenerate Prisma Client
npm run prisma:generate

# Reset jika diperlukan
npx prisma migrate reset
npm run seed:master
```

### Port 3000 sudah digunakan?
```bash
# Cari dan matikan proses
lsof -ti:3000 | xargs kill -9  # macOS/Linux
netstat -ano | findstr :3000   # Windows

# Atau gunakan port berbeda
PORT=3001 npm run dev
```

### Login tidak berfungsi?
1. Hapus cookies browser
2. Cek file `.env` memiliki `SSO_BYPASS_FOR_DEV="true"`
3. Verifikasi user ada di database:
   ```bash
   npx prisma studio
   # Cek tabel pegawai
   ```

## 📚 Langkah Selanjutnya

- Baca [README.md](./README.md) lengkap untuk dokumentasi detail
- Jelajahi dokumentasi modul di direktori `docs/`
- Cek [dokumentasi API](./API_REFERENCE.md) untuk endpoint API
- Review [panduan deployment](./README.md#-deployment) untuk setup production

## 💡 Tips

1. **Gunakan Prisma Studio** untuk manajemen database yang mudah:
   ```bash
   npx prisma studio
   ```

2. **Aktifkan auto-save di editor Anda** untuk melihat hot-reload beraksi

3. **Cek browser console** untuk pesan error detail saat development

4. **Gunakan filter status** di Tasklist untuk cepat menemukan task berdasarkan status

5. **Export laporan secara berkala** untuk melacak performa tim

---

Butuh bantuan lebih? Cek [bagian Troubleshooting](./README.md#-troubleshooting) di README.md
