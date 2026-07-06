# Migration Conflict Fix Guide

## Problem Description

The deployment failed due to a duplicate migration conflict. Two migrations were created that both try to create the same `SlaType` enum:

- `20251007120939_add_master_sla` (first migration)
- `20251007121006_add_master_sla` (duplicate migration)

**Error Message:**
```
Error: P3018
A migration failed to apply. New migrations cannot be applied before the error is recovered from. Read more about how to resolve migration issues in a production database: https://pris.ly/d/migrate-resolve
Migration name: 20251007121006_add_master_sla
Database error code: 42710
Database error:
ERROR: type "SlaType" already exists
```

## Solution Applied

### 1. Fixed the Duplicate Migration
Modified `prisma/migrations/20251007121006_add_master_sla/migration.sql` to use conditional creation:

```sql
-- CreateEnum (only if not exists)
DO $$ BEGIN
    CREATE TYPE "SlaType" AS ENUM ('EASY', 'MEDIUM', 'HARD');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- CreateTable (only if not exists)
CREATE TABLE IF NOT EXISTS "master_sla" (
    -- ... table definition
);

-- CreateIndex (only if not exists)
CREATE UNIQUE INDEX IF NOT EXISTS "master_sla_slaType_key" ON "master_sla"("slaType");
```

### 2. Enhanced Deployment Workflow
Updated `.github/workflows/deploy.yml` to handle migration conflicts automatically:

```bash
# Run Prisma migrations with error handling
if ! npx prisma migrate deploy; then
  echo "⚠️ Migration failed, attempting to resolve conflicts..."
  npx prisma migrate resolve --applied 20251007121006_add_master_sla || true
  npx prisma migrate deploy
fi
```

## Manual Fix for Production Server

If you need to fix the production server immediately, run these commands:

### Option 1: Use the Fix Script
```bash
# Make the script executable
chmod +x fix-deployment.sh

# Run the fix script
./fix-deployment.sh
```

### Option 2: Manual Commands
```bash
# 1. Mark the conflicting migration as applied
npx prisma migrate resolve --applied 20251007121006_add_master_sla

# 2. Deploy remaining migrations
npx prisma migrate deploy

# 3. Generate Prisma Client
npx prisma generate

# 4. Build the application
npm run build

# 5. Restart the application
pm2 restart logbook-app
```

### Option 3: Use Node.js Script
```bash
# Run the Node.js fix script
node scripts/fix-migration-conflict.js
```

## Prevention for Future

1. **Always check for existing migrations** before creating new ones
2. **Use descriptive migration names** to avoid duplicates
3. **Test migrations locally** before pushing to production
4. **Use conditional SQL** when there's a possibility of conflicts

## Files Modified

1. `prisma/migrations/20251007121006_add_master_sla/migration.sql` - Fixed duplicate enum creation
2. `.github/workflows/deploy.yml` - Added migration error handling
3. `scripts/fix-migration-conflict.js` - Created fix script
4. `fix-deployment.sh` - Created emergency fix script

## Verification

After applying the fix, verify that:

1. ✅ Migrations run successfully: `npx prisma migrate status`
2. ✅ Application builds: `npm run build`
3. ✅ Application starts: `pm2 status`
4. ✅ Database schema is correct: Check that `master_sla` table exists with `SlaType` enum

## Next Steps

1. Push the fixed migration files to the repository
2. Re-run the deployment pipeline
3. Monitor the application logs for any issues
4. Test the SLA functionality to ensure it works correctly

## Contact

If you encounter any issues with this fix, please check:
- Application logs: `pm2 logs logbook-app`
- Database connectivity
- Environment variables in `.env.production`
