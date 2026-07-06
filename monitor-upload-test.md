# Monitor Upload Test

## Langkah Test:

1. **Buka halaman tasklist**: http://localhost:3000/tasklist
2. **Pilih task** dengan status "Sedang Diproses" (Task 01 - 5 / ID: 2896)
3. **Klik tombol "Kirim Review"**
4. **JANGAN ISI KETERANGAN** (biarkan textarea kosong)
5. **Upload 1 gambar** (pilih file gambar)
6. **Klik tombol "Kirim Review"**

## Log yang Harus Muncul di Server Console:

```
🔥 ENTERED BRANCH 1B - MULTIPART STATUS UPDATE 🔥
🔥 nextStatusRaw: MENUNGGU_REVIEW_PM
🔥 hasFullFields: false
🔥 CONDITION MET - PROCESSING STATUS UPDATE 🔥
🔍 [BRANCH 1B] Checking note and images: {
  hasNote: false,
  hasImages: true,
  imagesCount: 1,
  statusAlreadyMatches: false
}
📸 [IMAGE UPLOAD] Received files from form: 1
✅ [IMAGE UPLOAD] File saved successfully
✅ [IMAGE UPLOAD] All files processed. Total uploaded: 1
✅ SAVING PROGRAMMER DESCRIPTION (default for images): dengan lampiran
💾 UPDATING DATABASE WITH: { status: 'MENUNGGU_REVIEW_PM', programmerDescription: 'dengan lampiran' }
✅ DATABASE UPDATE COMPLETED
📸 [LOG] No note provided, using default message for images
📸 [IMAGE SAVE] Starting to save 1 images to tasklist_image table
✅ [IMAGE SAVE] Successfully saved ALL 1 images to database
```

## Jika Tidak Ada Log:

Kemungkinan masalah:
1. Request tidak sampai ke server (cek Network tab di browser)
2. Request masuk ke branch yang salah
3. Ada error di frontend sebelum mengirim request

## Cek di Browser Console:

Buka Developer Tools (F12) > Console, cari log:
```
Updating task XXXX status to MENUNGGU_REVIEW_PM
Adding image 1 to FormData: [filename]
Sending PUT request to /api/tasklist/XXXX
PUT response status: 200 OK
```

## Verifikasi Setelah Test:

```bash
# Cek gambar terbaru
node check-recent-image-uploads.js

# Cek task dengan description "dengan lampiran"
node -e "const {PrismaClient} = require('@prisma/client'); const p = new PrismaClient(); p.tasklist.findMany({where:{programmerDescription:'dengan lampiran'},select:{id:true,kode:true,programmerDescription:true}}).then(r => {console.log('Tasks with default desc:', r); p.\$disconnect();});"
```
