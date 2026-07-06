-- =====================================================
-- CREATE BACKLOG TABLE - FINAL VERSION
-- =====================================================
-- This SQL creates the complete backlog table with all
-- necessary fields, indexes, and constraints for the
-- backlog management system.
-- =====================================================

-- Create the backlog table
CREATE TABLE IF NOT EXISTS "backlog" (
    "id" SERIAL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "note" TEXT NOT NULL,
    "projectId" INTEGER,
    "moduleId" INTEGER,
    "assignedTo" INTEGER,
    "tasklistId" INTEGER,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS "backlog_projectId_idx" ON "backlog"("projectId");
CREATE INDEX IF NOT EXISTS "backlog_moduleId_idx" ON "backlog"("moduleId");
CREATE INDEX IF NOT EXISTS "backlog_assignedTo_idx" ON "backlog"("assignedTo");
CREATE INDEX IF NOT EXISTS "backlog_tasklistId_idx" ON "backlog"("tasklistId");
CREATE INDEX IF NOT EXISTS "backlog_isDeleted_updatedAt_idx" ON "backlog"("isDeleted", "updatedAt");

-- Create trigger to automatically update updatedAt timestamp
CREATE OR REPLACE FUNCTION update_backlog_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW."updatedAt" = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER IF NOT EXISTS update_backlog_updated_at_trigger
    BEFORE UPDATE ON "backlog"
    FOR EACH ROW
    EXECUTE FUNCTION update_backlog_updated_at();

-- Add comments for documentation
COMMENT ON TABLE "backlog" IS 'Backlog notes for tracking ideas and tasks. Supports soft delete.';
COMMENT ON COLUMN "backlog"."id" IS 'Primary key with auto-increment';
COMMENT ON COLUMN "backlog"."title" IS 'Optional title for the backlog item';
COMMENT ON COLUMN "backlog"."note" IS 'Main content of the backlog item (required)';
COMMENT ON COLUMN "backlog"."projectId" IS 'Optional reference to project (proyek table)';
COMMENT ON COLUMN "backlog"."moduleId" IS 'Optional reference to module (proyek_module table)';
COMMENT ON COLUMN "backlog"."assignedTo" IS 'Optional reference to assigned user (pegawai table)';
COMMENT ON COLUMN "backlog"."tasklistId" IS 'Optional reference to created task (tasklist table)';
COMMENT ON COLUMN "backlog"."isDeleted" IS 'Soft delete flag (default: false)';
COMMENT ON COLUMN "backlog"."deletedAt" IS 'Timestamp when item was soft deleted';
COMMENT ON COLUMN "backlog"."createdAt" IS 'Creation timestamp (auto-generated)';
COMMENT ON COLUMN "backlog"."updatedAt" IS 'Last update timestamp (auto-updated)';

-- Verify table creation
SELECT 
    table_name,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'backlog' 
ORDER BY ordinal_position;

-- Show indexes
SELECT 
    indexname,
    indexdef
FROM pg_indexes 
WHERE tablename = 'backlog';

-- =====================================================
-- USAGE EXAMPLES:
-- =====================================================

-- Insert a new backlog item
-- INSERT INTO "backlog" ("title", "note", "projectId", "moduleId") 
-- VALUES ('Feature Request', 'Implement user authentication system', 1, 5);

-- Query unassigned backlog items
-- SELECT * FROM "backlog" 
-- WHERE "isDeleted" = false AND "assignedTo" IS NULL 
-- ORDER BY "updatedAt" DESC;

-- Query backlog items for a specific project
-- SELECT * FROM "backlog" 
-- WHERE "isDeleted" = false AND "projectId" = 1 
-- ORDER BY "updatedAt" DESC;

-- Soft delete a backlog item
-- UPDATE "backlog" 
-- SET "isDeleted" = true, "deletedAt" = CURRENT_TIMESTAMP 
-- WHERE "id" = 1;

-- Assign backlog item to user
-- UPDATE "backlog" 
-- SET "assignedTo" = 123, "updatedAt" = CURRENT_TIMESTAMP 
-- WHERE "id" = 1;

-- =====================================================
-- END OF SCRIPT
-- =====================================================