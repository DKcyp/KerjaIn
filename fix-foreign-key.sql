-- Cek data proyek_team yang pegawaiId tidak ada di pegawai
SELECT pt.* FROM proyek_team pt 
LEFT JOIN pegawai p ON pt."pegawaiId" = p.id 
WHERE p.id IS NULL;

-- Hapus data yang invalid (backup dulu jika perlu)
DELETE FROM proyek_team 
WHERE "pegawaiId" NOT IN (SELECT id FROM pegawai);
