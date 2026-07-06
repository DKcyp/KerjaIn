-- CreateTable MasterBreakTime
CREATE TABLE "master_break_time" (
    "id" SERIAL NOT NULL,
    "nama" VARCHAR(255) NOT NULL,
    "deskripsi" TEXT,
    "jam_mulai" VARCHAR(8) NOT NULL,
    "jam_selesai" VARCHAR(8) NOT NULL,
    "tipe_penerapan" VARCHAR(50) NOT NULL DEFAULT 'GLOBAL',
    "pegawai_id" INTEGER,
    "departemen_id" INTEGER,
    "role" VARCHAR(50),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "master_break_time_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "idx_master_break_time_active" ON "master_break_time"("is_active");
CREATE INDEX "idx_master_break_time_tipe" ON "master_break_time"("tipe_penerapan");
CREATE INDEX "idx_master_break_time_pegawai" ON "master_break_time"("pegawai_id");
CREATE INDEX "idx_master_break_time_departemen" ON "master_break_time"("departemen_id");
CREATE INDEX "idx_master_break_time_role" ON "master_break_time"("role");
