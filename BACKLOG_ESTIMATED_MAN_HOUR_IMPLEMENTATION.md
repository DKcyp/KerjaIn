# Implementasi Kolom Estimated Man Hour untuk Backlog

## Ringkasan
Telah berhasil mengimplementasikan kolom **Estimated Man Hour** untuk fitur Backlog. Kolom ini memungkinkan pengguna untuk mengestimasi jumlah jam kerja yang diperlukan untuk menyelesaikan setiap item backlog.

## Perubahan yang Dilakukan

### 1. Database Schema (Prisma)
**File:** `prisma/schema.prisma`

Model `Backlog` sudah memiliki kolom:
```prisma
estimatedManHour    Decimal?      @map("estimated_man_hour") @db.Decimal(8, 2)
```

Kolom ini:
- Tipe: `Decimal(8, 2)` - mendukung nilai hingga 999999.99
- Optional - dapat dikosongkan
- Disimpan sebagai `estimated_man_hour` di database

### 2. API Endpoints

#### POST /api/backlog (Create)
**File:** `src/app/api/backlog/route.ts`

Mendukung:
- FormData dengan files: `estimatedManHour` dari form field
- JSON: `estimatedManHour` dari request body
- Parsing: `parseFloat()` untuk konversi string ke number

#### PUT /api/backlog/[id] (Update)
**File:** `src/app/api/backlog/[id]/route.ts`

Mendukung:
- Update field `estimatedManHour`
- Conditional update: hanya update jika nilai dikirim
- Parsing: `parseFloat()` untuk konversi

#### POST /api/backlog/import (Import)
**File:** `src/app/api/backlog/import/route.ts`

Mendukung:
- Import dari Excel/CSV dengan kolom `estimatedManHour`
- Batch create dengan nilai `estimatedManHour`

### 3. Frontend Components

#### BacklogModal.tsx
**File:** `src/components/backlog/BacklogModal.tsx`

Perubahan:
- Tambah props: `formEstimatedManHour`, `setFormEstimatedManHour`
- Input field dengan:
  - Type: `number`
  - Step: `0.5` (increment 0.5 jam)
  - Min: `0`
  - Max: `999`
  - Placeholder: "Contoh: 8, 16, 24"
- Section: "Estimasi Jam Kerja" dengan icon dan deskripsi
- Styling: Gradient cyan-blue dengan icon jam kerja

#### BacklogTableView.tsx
**File:** `src/components/backlog/BacklogTableView.tsx`

Perubahan:
- Tambah kolom "Man Hour" di header table
- Tampilkan nilai: `{note.estimatedManHour ? \`${note.estimatedManHour}h\` : '-'}`
- Update colSpan dari 6 menjadi 7 untuk empty state
- Lebar kolom: `w-[100px]`

#### BacklogCardView.tsx
**File:** `src/components/backlog/BacklogCardView.tsx`

Perubahan:
- Tambah tampilan estimated man hour di card
- Conditional render: hanya tampil jika ada nilai
- Icon: jam kerja (money icon)
- Format: `{note.estimatedManHour}h`
- Styling: text-gray-700 dark:text-gray-300 font-medium

#### BacklogDetailModal.tsx
**File:** `src/components/backlog/BacklogDetailModal.tsx`

Perubahan:
- Tambah tampilan estimated man hour di section "Informasi Proyek"
- Conditional render: hanya tampil jika ada nilai
- Format: `{note.estimatedManHour}h`
- Styling: info card dengan border dan background

### 4. Page Component

#### backlog/page.tsx
**File:** `src/app/(admin)/backlog/page.tsx`

Perubahan:
- Tambah state: `formEstimatedManHour`
- Tambah setter: `setFormEstimatedManHour`
- Pass props ke BacklogModal
- Include di form data saat save (POST/PUT)
- Reset form saat create/edit

### 5. Import Modal

#### BacklogImportModal.tsx
**File:** `src/components/backlog/BacklogImportModal.tsx`

Fitur:
- Support kolom: `EstimatedManHour`, `estimated_man_hour`, `Man Hour`
- Parse dari Excel dan CSV
- Tampilkan di preview table dengan format: `{row.estimatedManHour ? \`${row.estimatedManHour}h\` : '-'}\`

## Cara Penggunaan

### 1. Membuat Backlog dengan Estimated Man Hour
1. Buka halaman Backlog
2. Klik tombol "Tambah Catatan Backlog"
3. Isi form:
   - Judul (wajib)
   - Catatan (wajib)
   - Proyek (opsional)
   - Modul (opsional)
   - **Estimasi Man Hour** (opsional) - contoh: 8, 16, 24
4. Klik "Simpan"

### 2. Edit Estimated Man Hour
1. Buka detail backlog atau klik edit
2. Ubah nilai "Estimasi Man Hour"
3. Klik "Simpan"

### 3. Import Backlog dengan Estimated Man Hour
1. Siapkan file Excel/CSV dengan kolom:
   - `Title` - Judul backlog
   - `Note` - Catatan
   - `Project` - Nama proyek (opsional)
   - `EstimatedManHour` atau `Man Hour` - Estimasi jam kerja (opsional)

2. Contoh format Excel:
   ```
   Title                          | Note                    | Project    | EstimatedManHour
   Implementasi Login OAuth       | Fitur login dengan OAuth| Project A  | 16
   Fix Bug Dashboard              | Perbaiki bug di dashboard| Project B  | 8
   ```

3. Klik tombol "Import" di halaman Backlog
4. Pilih file
5. Review preview
6. Klik "Impor"

## Validasi

- **Input**: Hanya menerima angka positif (0-999)
- **Step**: Increment 0.5 jam (8, 8.5, 9, 9.5, dst)
- **Format**: Decimal(8, 2) di database
- **Display**: Format dengan suffix "h" (contoh: "16h")
- **Optional**: Dapat dikosongkan (null)

## Testing Checklist

- [x] Create backlog dengan estimated man hour
- [x] Update estimated man hour
- [x] Delete backlog (soft delete)
- [x] View estimated man hour di table view
- [x] View estimated man hour di card view
- [x] View estimated man hour di detail modal
- [x] Import backlog dengan estimated man hour dari Excel
- [x] Import backlog dengan estimated man hour dari CSV
- [x] Validasi input (hanya angka positif)
- [x] Display format dengan suffix "h"
- [x] Conditional render (hanya tampil jika ada nilai)

## File yang Dimodifikasi

1. `src/components/backlog/BacklogModal.tsx` - Tambah props dan input field
2. `src/components/backlog/BacklogTableView.tsx` - Tambah kolom di table
3. `src/components/backlog/BacklogCardView.tsx` - Tambah tampilan di card
4. `src/components/backlog/BacklogDetailModal.tsx` - Tambah tampilan di detail
5. `src/app/(admin)/backlog/page.tsx` - Tambah state dan pass props
6. `src/app/api/backlog/route.ts` - Sudah support (no changes needed)
7. `src/app/api/backlog/[id]/route.ts` - Sudah support (no changes needed)
8. `src/app/api/backlog/import/route.ts` - Sudah support (no changes needed)
9. `src/components/backlog/BacklogImportModal.tsx` - Sudah support (no changes needed)

## Database Migration

Kolom `estimated_man_hour` sudah ada di schema. Jika belum ada di database, jalankan:

```bash
npx prisma migrate dev --name add_estimated_man_hour_to_backlog
```

Atau jika menggunakan raw SQL:

```sql
ALTER TABLE backlog ADD COLUMN estimated_man_hour DECIMAL(8, 2);
```

## Notes

- Kolom ini opsional dan tidak mempengaruhi validasi backlog
- Nilai dapat diubah kapan saja
- Tidak ada kalkulasi otomatis berdasarkan estimated man hour
- Dapat digunakan untuk perencanaan resource dan estimasi timeline
- Format decimal memungkinkan estimasi dengan presisi 0.5 jam

## Future Enhancements

- [ ] Agregasi total estimated man hour per proyek
- [ ] Agregasi total estimated man hour per modul
- [ ] Agregasi total estimated man hour per assignee
- [ ] Report/dashboard untuk tracking estimated vs actual hours
- [ ] Integrasi dengan time tracking untuk perbandingan
- [ ] Notifikasi jika actual hours melebihi estimated hours
