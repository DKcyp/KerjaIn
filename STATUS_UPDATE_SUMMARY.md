# Blueprint Status Update Summary

## Status Name Changes

| Old Status | New Status | Description |
|------------|------------|-------------|
| DRAFT | DRAFT | Draft - belum dikirim untuk review |
| PARTIAL | KIRIM_REVIEW | Kirim Review - menunggu approval |
| APPROVED | APPROVED | Approved - sudah di-approve dan task sudah di-assign |
| SIAP_UAT | UAT | UAT - semua task siap untuk UAT |
| SELESAI_UAT | FINISH | Finish - semua task sudah selesai UAT |

## Files Updated

1. **prisma/schema.prisma**
   - Updated `BAStatus` enum with new values
   - Added comments for clarity

2. **prisma/migrations/20260423_update_ba_status_enum/migration.sql**
   - Migration to add new enum values
   - Updates existing data to use new status names

3. **src/app/api/blueprint-baru/[id]/uat/route.ts**
   - Changed `SELESAI_UAT` to `FINISH` in POST endpoint
   - Updated PUT endpoint validation to accept `UAT` and `FINISH`
   - Updated success messages

## Migration Steps

To apply these changes to your database:

```bash
# Run the migration
npx prisma migrate deploy

# Or manually run the SQL
psql -U your_username -d your_database -f prisma/migrations/20260423_update_ba_status_enum/migration.sql

# Regenerate Prisma client
npx prisma generate

# Restart your application
```

## Status Flow

```
DRAFT → KIRIM_REVIEW → APPROVED → UAT → FINISH
```

1. **DRAFT**: Blueprint is being created
2. **KIRIM_REVIEW**: Blueprint sent for review/approval
3. **APPROVED**: Blueprint approved, tasks assigned to programmers
4. **UAT**: All tasks completed, ready for UAT testing
5. **FINISH**: All tasks passed UAT, blueprint complete

## Notes

- Old enum values (PARTIAL, SIAP_UAT, SELESAI_UAT) will remain in PostgreSQL enum but won't be used
- All existing data will be automatically migrated to new status names
- Frontend code may need updates to display new status names properly
