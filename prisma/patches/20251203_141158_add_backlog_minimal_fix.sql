-- Minimal, non-destructive migration: create backlog table + indexes only
DO 37845
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = current_schema() AND table_name = backlog
  ) THEN
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
  END IF;
END
37845;

-- Indexes (idempotent)
CREATE INDEX IF NOT EXISTS "backlog_projectId_idx" ON "public"."backlog"("projectId");
CREATE INDEX IF NOT EXISTS "backlog_moduleId_idx" ON "public"."backlog"("moduleId");
CREATE INDEX IF NOT EXISTS "backlog_assignedTo_idx" ON "public"."backlog"("assignedTo");
CREATE INDEX IF NOT EXISTS "backlog_isDeleted_updatedAt_idx" ON "public"."backlog"("isDeleted", "updatedAt");
