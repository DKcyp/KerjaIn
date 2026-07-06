-- CreateTable
CREATE TABLE "blueprint_chat" (
    "id" SERIAL NOT NULL,
    "ba_id" INTEGER NOT NULL,
    "sender_id" INTEGER NOT NULL,
    "sender_name" VARCHAR(255) NOT NULL DEFAULT '',
    "message" TEXT NOT NULL,
    "file_url" TEXT,
    "file_name" TEXT,
    "file_type" TEXT,
    "file_size" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "blueprint_chat_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "blueprint_chat_ba_id_idx" ON "blueprint_chat"("ba_id");

-- CreateIndex
CREATE INDEX "blueprint_chat_sender_id_idx" ON "blueprint_chat"("sender_id");

-- CreateIndex
CREATE INDEX "blueprint_chat_created_at_idx" ON "blueprint_chat"("created_at");

-- AddForeignKey
ALTER TABLE "blueprint_chat" ADD CONSTRAINT "blueprint_chat_ba_id_fkey" FOREIGN KEY ("ba_id") REFERENCES "bacara"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "blueprint_chat" ADD CONSTRAINT "blueprint_chat_sender_id_fkey" FOREIGN KEY ("sender_id") REFERENCES "pegawai"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
