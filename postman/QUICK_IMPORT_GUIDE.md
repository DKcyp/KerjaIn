# Quick Import Guide - Postman Collection

Panduan cepat import Postman Collection dalam 3 langkah.

## 🚀 3 Langkah Import

### 1️⃣ Import Collection

1. Buka **Postman**
2. Klik tombol **Import** (kiri atas)
3. Drag & drop file: `External-API-Collection.postman_collection.json`
4. Klik **Import**

✅ Collection "Logbook External API" akan muncul di sidebar kiri

---

### 2️⃣ Import Environment

1. Klik **Import** lagi
2. Drag & drop file: `External-API-Environment.postman_environment.json`
3. Klik **Import**

✅ Environment "Logbook External API - Development" akan tersedia

---

### 3️⃣ Set Environment

1. Klik dropdown di **kanan atas** (biasanya tertulis "No Environment")
2. Pilih: **Logbook External API - Development**

✅ Sekarang `{{base_url}}` akan otomatis jadi `http://localhost:3000`

---

## 🎯 Test Pertama

1. Pastikan server berjalan: `npm run dev`
2. Di Postman, expand **Logbook External API**
3. Expand **Health Check**
4. Klik **Check API Status**
5. Klik tombol **Send**

✅ Jika berhasil, Anda akan melihat response dengan status 200

---

## 📁 File yang Perlu Di-Import

```
✅ External-API-Collection.postman_collection.json    (WAJIB)
✅ External-API-Environment.postman_environment.json  (WAJIB)
⭐ External-API-Production.postman_environment.json   (Optional)
```

---

## 🔧 Troubleshooting

### ❌ "Could not get response"

**Solusi:**
```bash
# Pastikan server berjalan
npm run dev

# Test di browser
http://localhost:3000/api/external/users
```

### ❌ Environment tidak muncul

**Solusi:**
1. Klik icon **⚙️ Settings** (kanan atas)
2. Pilih tab **Environments**
3. Check apakah environment sudah ada
4. Jika belum, import ulang file environment

### ❌ Variable {{base_url}} tidak ter-replace

**Solusi:**
1. Pastikan environment sudah di-set (dropdown kanan atas)
2. Pilih "Logbook External API - Development"
3. Refresh Postman jika perlu

---

## 📚 Next Steps

Setelah import berhasil:

1. ✅ Test **Health Check** → Check API Status
2. ✅ Test **User API** → List Users
3. ✅ Test **User API** → Create User (Minimal)
4. ✅ Test **Project API** → List Projects
5. ✅ Test **Project API** → Create Project (Minimal)

---

## 💡 Tips

### Shortcut Keyboard
- `Ctrl + Enter` (Windows) / `Cmd + Enter` (Mac) = Send request
- `Ctrl + S` = Save request
- `Ctrl + K` = Search collection

### Quick Test
Untuk test cepat semua endpoint:
1. Klik kanan pada collection "Logbook External API"
2. Pilih **Run collection**
3. Klik **Run Logbook External API**

---

**Selesai!** 🎉

Untuk dokumentasi lengkap, baca: `postman/README.md`
