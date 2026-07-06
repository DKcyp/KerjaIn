# Fix untuk Error "Failed to fetch projects"

Error ini terjadi karena Prisma client belum mengenali field `isActive` yang baru ditambahkan.

## Langkah-langkah:

1. **Stop development server** (tekan Ctrl+C di terminal yang menjalankan `npm run dev`)

2. **Regenerate Prisma client:**
   ```bash
   npx prisma generate
   ```

3. **Restart development server:**
   ```bash
   npm run dev
   ```

## Penjelasan:

- Field `isActive` sudah ditambahkan ke database (kolom `is_active` sudah ada)
- Prisma schema sudah diupdate dengan field `isActive`
- Tapi Prisma client masih menggunakan schema lama
- Setelah regenerate, Prisma client akan mengenali field baru

## Jika masih error setelah restart:

Cek apakah kolom `is_active` benar-benar ada di database dengan query:
```sql
SELECT column_name, data_type, column_default 
FROM information_schema.columns 
WHERE table_name = 'proyek' AND column_name = 'is_active';
```

Jika tidak ada, jalankan migration manual:
```bash
node run-isactive-migration.js
```
