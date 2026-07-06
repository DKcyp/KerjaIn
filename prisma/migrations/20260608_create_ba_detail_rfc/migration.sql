-- Create ba_detail_rfc table for per-sub-module RFC comments and images
CREATE TABLE IF NOT EXISTS "ba_detail_rfc" (
    "id" SERIAL PRIMARY KEY,
    "ba_id" INTEGER NOT NULL REFERENCES "bacara"(id) ON DELETE CASCADE,
    "module_id" INTEGER NOT NULL REFERENCES "bacara_module"(id) ON DELETE CASCADE,
    "keterangan" TEXT,
    "gambar" TEXT,
    "file_path" TEXT,
    "file_name" TEXT,
    "created_by" INTEGER,
    "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_ba_detail_rfc_ba_id ON "ba_detail_rfc"("ba_id");
CREATE INDEX IF NOT EXISTS idx_ba_detail_rfc_module_id ON "ba_detail_rfc"("module_id");
