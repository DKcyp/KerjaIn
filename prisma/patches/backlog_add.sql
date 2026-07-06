-- DropForeignKey
ALTER TABLE "public"."menu_item" DROP CONSTRAINT "menu_item_parent_fkey";

-- DropIndex
DROP INDEX "public"."idx_tasklist_log_task_waktu";

-- AlterTable
ALTER TABLE "public"."tasklist" ALTER COLUMN "taskComplexity" SET DEFAULT 'EASY';

-- DropTable
DROP TABLE "public"."menu_item";

-- CreateTable
CREATE TABLE "public"."backlog" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "note" TEXT NOT NULL,
    "projectId" INTEGER,
    "moduleId" INTEGER,
    "assignedTo" INTEGER,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "backlog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "backlog_projectId_idx" ON "public"."backlog"("projectId");

-- CreateIndex
CREATE INDEX "backlog_moduleId_idx" ON "public"."backlog"("moduleId");

-- CreateIndex
CREATE INDEX "backlog_assignedTo_idx" ON "public"."backlog"("assignedTo");

-- CreateIndex
CREATE INDEX "backlog_isDeleted_updatedAt_idx" ON "public"."backlog"("isDeleted", "updatedAt");

-- CreateIndex
CREATE INDEX "tasklist_log_taskId_waktu_idx" ON "public"."tasklist_log"("taskId", "waktu");

-- AddForeignKey
ALTER TABLE "public"."tasklist" ADD CONSTRAINT "tasklist_moduleId_fkey" FOREIGN KEY ("moduleId") REFERENCES "public"."proyek_module"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."uat_approval" ADD CONSTRAINT "uat_approval_approvedBy_fkey" FOREIGN KEY ("approvedBy") REFERENCES "public"."pegawai"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."uat_approval" ADD CONSTRAINT "uat_approval_rejectedBy_fkey" FOREIGN KEY ("rejectedBy") REFERENCES "public"."pegawai"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."uat_attachment" ADD CONSTRAINT "uat_attachment_uatApprovalId_fkey" FOREIGN KEY ("uatApprovalId") REFERENCES "public"."uat_approval"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."tasklist_chat" ADD CONSTRAINT "tasklist_chat_tasklist_id_fkey" FOREIGN KEY ("tasklist_id") REFERENCES "public"."tasklist"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."tasklist_chat" ADD CONSTRAINT "tasklist_chat_sender_id_fkey" FOREIGN KEY ("sender_id") REFERENCES "public"."pegawai"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."notification" ADD CONSTRAINT "notification_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "public"."tasklist"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."task_activity" ADD CONSTRAINT "task_activity_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "public"."tasklist"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- RenameIndex
ALTER INDEX "public"."tasklist_image_taskid_idx" RENAME TO "tasklist_image_taskId_idx";

-- RenameIndex
ALTER INDEX "public"."idx_tasklist_log_user" RENAME TO "tasklist_log_userId_idx";

