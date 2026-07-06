# Fitur Upload Attachment untuk Backlog

## 📋 Overview
Fitur ini menambahkan kemampuan upload file attachment pada form "Tambah Catatan Backlog" dengan dukungan drag & drop dan paste dari clipboard. **Ketika backlog di-assign menjadi task, semua lampiran file akan otomatis disalin ke tasklist.**

## ✨ Fitur yang Ditambahkan

### 1. **Upload Interface**
- **Drag & Drop**: Seret file langsung ke area upload
- **Click to Upload**: Klik area upload untuk memilih file
- **Paste Support**: Tekan Ctrl+V untuk paste file dari clipboard
- **Multiple Files**: Mendukung upload multiple files sekaligus

### 2. **File Validation**
- **Type Validation**: Mendukung berbagai jenis file (gambar, dokumen, spreadsheet, video, audio, dll)
- **Size Validation**: Limit ukuran berbeda per jenis file
- **Security**: Validasi ekstensi dan MIME type

### 3. **File Preview**
- **Image Preview**: Thumbnail untuk file gambar
- **File Icons**: Icon yang sesuai untuk setiap jenis file
- **File Info**: Nama, ukuran, dan kategori file
- **Remove Individual**: Hapus file individual sebelum submit

### 4. **File Storage & Access**
- **Secure Storage**: File disimpan di `/public/uploads/backlog/`
- **Database Tracking**: Metadata file disimpan di tabel `backlog_files`
- **Access Control**: Hanya user yang memiliki akses ke backlog yang bisa mengakses file

### 5. **🆕 Auto File Copy saat Assignment**
- **Automatic Copy**: Saat backlog di-assign menjadi task, semua file otomatis disalin
- **Duplicate Files**: File disalin dari `/uploads/backlog/` ke `/uploads/tasklist/`
- **Database Sync**: Metadata file disalin dari `backlog_files` ke `tasklist_image`
- **Visual Indicator**: UI menunjukkan berapa file yang akan disalin
- **Error Handling**: Jika copy gagal, assignment tetap berhasil dengan warning

## 🔧 Implementasi Teknis

### Frontend Components
1. **BacklogModal.tsx**: Form upload dengan drag & drop
2. **BacklogDetailModal.tsx**: Tampilan file yang sudah diupload + info file copy
3. **BacklogPage.tsx**: State management untuk files

### Backend APIs
1. **POST /api/backlog**: Mendukung FormData untuk file upload
2. **GET /api/backlog/[id]/files**: Mengambil daftar file per backlog
3. **GET /api/uploads/backlog/[filename]**: Serve file dengan access control
4. **🆕 POST /api/backlog/[id]/copy-files-to-task**: Copy files dari backlog ke task

### Database
- **Tabel `backlog_files`**: Menyimpan metadata file backlog
- **Tabel `tasklist_image`**: Menyimpan metadata file task (existing)
- **File Copy Process**: Physical file copy + database record duplication

## 🎯 User Experience

### Upload Process
1. User membuka form "Tambah Catatan Backlog"
2. Mengisi judul dan catatan
3. Upload file dengan cara:
   - Drag & drop file ke area upload
   - Klik area upload untuk browse file
   - Paste file dengan Ctrl+V
4. Preview file yang dipilih
5. Submit form untuk menyimpan backlog + files

### Assignment Process (🆕)
1. User membuka detail backlog yang memiliki file
2. Klik "Assign" untuk assign ke anggota tim
3. **UI menampilkan info**: "X file dari backlog ini akan otomatis disalin ke task"
4. Setelah assignment berhasil:
   - Task dibuat dengan semua data backlog
   - **File otomatis disalin** dari backlog ke task
   - User mendapat notifikasi sukses dengan info file copy
5. File sekarang tersedia di task dan backlog (duplikat)

### View Files
1. User membuka detail backlog
2. Melihat section "Lampiran File" di sidebar
3. Klik file untuk membuka/download
4. Melihat informasi file (nama, ukuran, tanggal upload)

## 🔒 Security Features
- **Access Control**: Hanya user yang memiliki akses ke backlog yang bisa mengakses file
- **File Validation**: Validasi jenis dan ukuran file
- **Path Security**: Mencegah path traversal attack
- **Session Check**: Semua akses file memerlukan session valid
- **🆕 Copy Security**: File copy hanya dilakukan oleh user yang berhak assign

## 📝 File Type Support
- **Images**: JPG, PNG, GIF, WebP, BMP, SVG (max 5MB)
- **Documents**: PDF, DOC, DOCX, TXT, RTF, ODT (max 10MB)
- **Spreadsheets**: XLS, XLSX, CSV, ODS (max 15MB)
- **Presentations**: PPT, PPTX, ODP (max 20MB)
- **Archives**: ZIP, RAR, 7Z, TAR, GZ (max 25MB)
- **Videos**: MP4, AVI, MOV, WMV, FLV, WebM, MKV (max 50MB)
- **Audio**: MP3, WAV, FLAC, AAC, OGG, WMA, M4A (max 10MB)
- **Text Files**: TXT, MD, JSON, XML, YAML, LOG (max 2MB)
- **Code Files**: JS, TS, HTML, CSS, PHP, Python, Java, dll (max 5MB)

## 🚀 Usage Tips
1. **Drag & Drop**: Paling mudah untuk upload multiple files
2. **Paste**: Berguna untuk screenshot atau file dari clipboard
3. **File Organization**: Gunakan nama file yang deskriptif
4. **Size Optimization**: Kompres file besar sebelum upload
5. **File Types**: Pilih format yang sesuai dengan kebutuhan
6. **🆕 Assignment**: File akan otomatis tersedia di task setelah assignment

## 🔄 Integration dengan Existing Features
- **Assignment**: File otomatis disalin ke task saat assignment ✅
- **Task Creation**: File langsung tersedia di task yang dibuat dari backlog ✅
- **Search**: File metadata bisa digunakan untuk pencarian (future enhancement)
- **Audit Trail**: Upload dan copy file tercatat dengan user dan timestamp ✅

## 🔄 File Copy Process Flow

```
1. User assigns backlog to team member
   ↓
2. System creates new task from backlog data
   ↓
3. System calls copy-files-to-task API
   ↓
4. For each file in backlog_files:
   - Copy physical file from /uploads/backlog/ to /uploads/tasklist/
   - Generate new filename to avoid conflicts
   - Insert record to tasklist_image table
   ↓
5. Update backlog with assignment info
   ↓
6. Show success message with file copy count
```

## 🛠️ Technical Details

### File Copy API Endpoint
- **URL**: `POST /api/backlog/[id]/copy-files-to-task`
- **Body**: `{ taskId: number }`
- **Response**: `{ copiedFiles: number, totalFiles: number, files: Array }`
- **Error Handling**: Non-blocking - assignment succeeds even if file copy fails

### Database Schema Updates
```sql
-- Existing backlog_files table
CREATE TABLE backlog_files (
  id SERIAL PRIMARY KEY,
  "backlogId" INTEGER NOT NULL,
  "fileName" VARCHAR(255) NOT NULL,
  "originalName" VARCHAR(255) NOT NULL,
  "filePath" VARCHAR(500) NOT NULL,
  "fileType" VARCHAR(100) NOT NULL,
  "fileSize" INTEGER NOT NULL,
  "uploadedBy" INTEGER,
  "uploadedAt" TIMESTAMP DEFAULT NOW()
);

-- Files copied to existing tasklist_image table
-- (no schema changes needed)
```

### Error Scenarios
1. **Source file not found**: Skip file, continue with others
2. **Destination write failed**: Skip file, log error
3. **Database insert failed**: Skip file, log error
4. **Partial copy success**: Report actual copied count
5. **Complete copy failure**: Assignment still succeeds, user gets warning