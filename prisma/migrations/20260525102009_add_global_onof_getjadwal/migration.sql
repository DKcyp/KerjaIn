-- CreateTable
CREATE TABLE "global_onof_getjadwal" (
    "id" SERIAL NOT NULL,
    "is_enabled" BOOLEAN NOT NULL DEFAULT true,
    "description" VARCHAR(255),
    "updated_by" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "global_onof_getjadwal_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "idx_global_onof_getjadwal_enabled" ON "global_onof_getjadwal"("is_enabled");

-- Insert default record
INSERT INTO "global_onof_getjadwal" ("is_enabled", "description", "updated_by", "updated_at")
VALUES (true, 'Initial setup - fitur get jadwal dari JWT aktif', NULL, CURRENT_TIMESTAMP);
