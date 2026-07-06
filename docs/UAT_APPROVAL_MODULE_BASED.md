# UAT Approval - Module Based

## Overview

Sistem UAT Approval telah diubah dari approval per tasklist menjadi approval per modul/sub-modul.

## Perubahan Utama

### Sebelumnya (Tasklist-based)
- Approval dilakukan per tasklist individual
- Status approve/reject ada di setiap tasklist

### Sekarang (Module-based)
- Approval dilakukan per modul/sub-modul
- Jika modul tidak punya sub-modul: Approve di level Modul
- Jika modul punya sub-modul: Approve di level Sub-Modul
- Tasklist ditampilkan sebagai referensi
- Support multiple attachments

## Database Schema

### Tabel uat_approval
- id, projectId, moduleId
- status: PENDING, APPROVED, REJECTED
- approvedBy, approvedAt, rejectedBy, rejectedAt
- notes, createdAt, updatedAt

### Tabel uat_attachment
- id, uatApprovalId
- fileName, originalName, filePath
- fileType, fileSize
- uploadedBy, uploadedAt

## API Endpoints

### GET /api/uat-approval
Mendapatkan daftar modul dengan status approval

Query Parameters:
- projectId (optional)
- status (optional)

### POST /api/uat-approval
Membuat atau update approval

Body:
- projectId, moduleId, status, notes

### POST /api/uat-approval/[id]/attachments
Upload multiple files

Form Data:
- files (multiple)

### DELETE /api/uat-approval/attachments/[id]
Hapus attachment

## Frontend

### Halaman: /uat-approval

Fitur:
- Filter by project dan status
- Hierarchical tree view modul/sub-modul
- Expand/collapse untuk melihat tasklist
- Tombol Approve/Reject untuk leaf nodes
- Modal approval dengan notes dan upload attachments
- Badge status (Pending, Approved, Rejected)

### Permission
- SUPER_ADMIN, ADMIN, dan PM bisa akses dan approve
- PROGRAMMER tidak bisa akses UAT Approval

## Cara Pakai

1. Pilih proyek dari dropdown
2. Sistem menampilkan tree modul/sub-modul
3. Untuk modul tanpa sub-modul: langsung ada tombol Approve/Reject
4. Untuk modul dengan sub-modul: expand untuk lihat sub-modul, approve per sub-modul
5. Klik Approve/Reject untuk buka modal
6. Isi notes dan upload attachments jika perlu
7. Klik tombol Approve atau Reject untuk submit

## Migration

Jalankan migration:
```bash
npx prisma migrate deploy
```

Atau manual:
```bash
npx prisma db push
```

## Notes

- Error Prisma (uatApproval/uatAttachment not found) akan hilang setelah generate Prisma client
- Jalankan: npx prisma generate
- Attachment disimpan di: public/uploads/uat-attachments/
