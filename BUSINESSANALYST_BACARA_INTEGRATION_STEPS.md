# BusinessAnalyst to Bacara Integration Steps

## Overview
This guide will help you integrate the BusinessAnalyst model with the existing `bacara` table structure in your production database.

## Steps to Execute

### 1. Run Database Migration
Execute the comprehensive setup script in your production database:

```sql
-- Run this file in your production database
-- File: setup-businessanalyst-bacara-integration.sql
```

This script will:
- Create required enums (`BAStatus`, `BAType`)
- Add missing columns to `bacara` table (`type`, `file_rfc`, `file_ced`, `file_ok`)
- Update column types to use proper enums
- Rename columns in `bacara_module` and `bacara_task` to match Prisma mappings
- Update foreign key constraints
- Create proper indexes

### 2. Generate Prisma Client
After the database migration, regenerate the Prisma client:

```bash
npx prisma generate
```

### 3. Restart Your Application
Restart your Next.js application to pick up the new Prisma client and API changes.

### 4. Test the Integration
1. Navigate to the blueprint page for a project
2. Try creating a new BusinessAnalyst record
3. Verify that data is saved and displayed correctly

## What Changed

### Database Structure
- `bacara` table now has all fields needed by BusinessAnalyst model
- `bacara_module` and `bacara_task` tables have renamed columns to match Prisma field mappings
- Proper enum types are used for `status` and `type` fields
- Foreign key constraints are updated

### Prisma Schema
- `BusinessAnalyst` model now maps to `bacara` table (`@@map("bacara")`)
- `BAModule` model now maps to `bacara_module` table (`@@map("bacara_module")`)
- `BATask` model now maps to `bacara_task` table (`@@map("bacara_task")`)
- Removed duplicate `bacara`, `bacara_module`, and `bacara_task` models

### API Changes
- `/api/blueprint-baru/[id]/route.ts` now uses Prisma models instead of raw SQL queries
- Better type safety and cleaner code
- Proper relationships and includes for nested data

## Benefits
1. **Type Safety**: Using Prisma models provides full TypeScript type safety
2. **Cleaner Code**: No more raw SQL queries in API routes
3. **Better Performance**: Prisma optimizes queries and includes
4. **Consistency**: Single source of truth for BusinessAnalyst data structure
5. **Maintainability**: Easier to maintain and extend

## Troubleshooting

### If you get enum errors:
```sql
-- Check if enums exist
SELECT typname FROM pg_type WHERE typtype = 'e';
```

### If foreign key constraints fail:
```sql
-- Check existing constraints
SELECT constraint_name, table_name 
FROM information_schema.table_constraints 
WHERE table_name IN ('bacara', 'bacara_module', 'bacara_task');
```

### If column names don't match:
```sql
-- Check column names
SELECT column_name, table_name 
FROM information_schema.columns 
WHERE table_name IN ('bacara', 'bacara_module', 'bacara_task')
ORDER BY table_name, ordinal_position;
```

## Verification
After completing all steps, verify that:
1. BusinessAnalyst records can be created and saved
2. Data appears correctly in the blueprint page list
3. Modules and tasks are properly associated
4. No console errors in browser or server logs