-- CreateTable
CREATE TABLE "master_departemen" (
    "id" SERIAL NOT NULL,
    "id_dep" VARCHAR(50) NOT NULL,
    "nama" VARCHAR(255) NOT NULL,
    "deskripsi" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "master_departemen_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "master_departemen_id_dep_key" ON "master_departemen"("id_dep");

-- CreateIndex
CREATE INDEX "idx_master_departemen_id_dep" ON "master_departemen"("id_dep");

-- CreateIndex
CREATE INDEX "idx_master_departemen_is_active" ON "master_departemen"("is_active");

-- AlterTable Pegawai - Add departemen_id column
ALTER TABLE "pegawai" ADD COLUMN "departemen_id" INTEGER;

-- CreateIndex
CREATE INDEX "idx_pegawai_departemen_id" ON "pegawai"("departemen_id");

-- AddForeignKey
ALTER TABLE "pegawai" ADD CONSTRAINT "pegawai_departemen_id_fkey" FOREIGN KEY ("departemen_id") REFERENCES "master_departemen"("id") ON DELETE SET NULL ON UPDATE CASCADE;
