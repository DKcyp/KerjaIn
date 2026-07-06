# Migration Guide: Add tasklistId to Backlog

## Overview
This migration adds a `tasklistId` field to the `Backlog` model to create a direct link between backlog items and their corresponding tasks.

## Schema Changes

### Before
```prisma
model Backlog {
  id         Int       @id @default(autoincrement())
  title      String
  note       String    @db.Text
  projectId  Int?
  moduleId   Int?
  assignedTo Int?
  isDeleted  Boolean   @default(false)
  deletedAt  DateTime?
  createdAt  DateTime  @default(now())
  updatedAt  DateTime  @updatedAt
}
```

### After
```prisma
model Backlog {
  id         Int       @id @default(autoincrement())
  title      String
  note       String    @db.Text
  projectId  Int?
  moduleId   Int?
  assignedTo Int?
  tasklistId Int?      // NEW FIELD
  isDeleted  Boolean   @default(false)
  deletedAt  DateTime?
  createdAt  DateTime  @default(now())
  updatedAt  DateTime  @updatedAt

  @@index([tasklistId])  // NEW INDEX
}
```

## Migration Methods

### Method 1: Prisma Migration (Recommended)
```bash
# Generate and apply migration
npx prisma migrate dev --name add_tasklistid_to_backlog

# Or use the migration script
node run-migration.js
```

### Method 2: Manual Migration
```bash
# For existing databases where Prisma migration might conflict
node run-migration.js manual
```

## What This Migration Does

1. **Adds `tasklistId` column** to the `backlog` table
2. **Creates index** on `tasklistId` for better query performance
3. **Maintains backward compatibility** - existing data remains unchanged
4. **No foreign key constraint** - keeps it simple as requested

## Post-Migration Benefits

### Before Migration
- Backlog → Task relationship was based on content matching
- Unreliable linking between backlog items and tasks
- Complex queries to find associated tasks

### After Migration
- Direct link via `tasklistId` field
- Reliable 1:1 relationship tracking
- Simple and fast queries: `WHERE tasklistId = ?`

## Usage Examples

### Creating Task from Backlog
```typescript
// 1. Create task
const task = await prisma.tasklist.create({
  data: { /* task data */ }
});

// 2. Update backlog with tasklistId
await prisma.backlog.update({
  where: { id: backlogId },
  data: { 
    assignedTo: userId,
    tasklistId: task.id  // Direct link
  }
});
```

### Finding Associated Task
```typescript
// Before: Complex content-based matching
const tasks = await prisma.tasklist.findMany({
  where: {
    projectId: backlog.projectId,
    moduleId: backlog.moduleId,
    pegawaiId: backlog.assignedTo,
    keterangan: { contains: backlog.note }
  }
});

// After: Simple direct lookup
const task = await prisma.tasklist.findUnique({
  where: { id: backlog.tasklistId }
});
```

## Rollback (if needed)

If you need to rollback this migration:

```sql
-- Remove index
DROP INDEX IF EXISTS "backlog_tasklistId_idx";

-- Remove column
ALTER TABLE "backlog" DROP COLUMN IF EXISTS "tasklistId";
```

## Verification

After migration, verify the changes:

```sql
-- Check if column exists
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'backlog' AND column_name = 'tasklistId';

-- Check if index exists
SELECT indexname FROM pg_indexes 
WHERE tablename = 'backlog' AND indexname = 'backlog_tasklistId_idx';
```

## Notes

- The `tasklistId` field is nullable to support existing backlog items
- No foreign key constraint is added as requested
- The field will be populated automatically when new assignments are made
- Existing backlog items will use fallback content-based matching until reassigned