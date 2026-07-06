-- Tambahkan kolom dep_id bertipe INTEGER dan bersifat nullable
ALTER TABLE "tasklist" ADD COLUMN IF NOT EXISTS "dep_id" INTEGER;

-- Tambahkan index opsional untuk mempercepat query pencarian berdasarkan dep_id
CREATE INDEX IF NOT EXISTS "idx_tasklist_dep_id" ON "tasklist"("dep_id");
