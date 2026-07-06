-- Tambah kolom dep_id (integer, nullable) di table proyek
ALTER TABLE "proyek" ADD COLUMN "dep_id" INTEGER;

-- Tambah kolom dep_id (integer, nullable) di table master_team
ALTER TABLE "master_team" ADD COLUMN "dep_id" INTEGER;
