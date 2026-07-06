# CRM-Logbook Integration Fix

## Issue
When a ticket is dispositioned from CRM and auto-creates a task in logbook, the `ticket_id` field was not being saved correctly in the logbook database.

## Root Cause
1. **CRM was sending `ticketId`** in the API payload to logbook
2. **Logbook API was not extracting `ticketId`** from the request body
3. **Logbook was not saving `ticket_id`** when creating tasks
4. The `ticket_id` column existed in the database (via raw SQL) but was never populated

## Changes Made

### 1. Logbook API Route (`logbook/src/app/api/external/tasklist/route.ts`)

#### Added ticketId extraction from FormData (lines 141-143):
```typescript
ticketId: formData.get('ticketId')?.toString() || undefined,
priority: formData.get('priority')?.toString() || undefined,
ticketUrl: formData.get('ticketUrl')?.toString() || undefined
```

#### Added ticketId to destructured body parameters (lines 165-167):
```typescript
ticketId,
priority,
ticketUrl
```

#### Updated task creation to include ticket fields (lines 377-378):
```typescript
ticketId: ticketId || null, // CRM ticket ID
ticketUrl: ticketUrl || null // CRM ticket URL
```

#### Added column existence check for backward compatibility (lines 347-357):
```typescript
// Ensure CRM ticket columns exist (for backward compatibility)
try {
  await tx.$executeRawUnsafe(
    `ALTER TABLE public.tasklist ADD COLUMN IF NOT EXISTS ticket_id TEXT NULL;`
  );
  await tx.$executeRawUnsafe(
    `ALTER TABLE public.tasklist ADD COLUMN IF NOT EXISTS ticket_url TEXT NULL;`
  );
} catch (e) {
  // Columns may already exist, ignore error
}
```

### 2. Logbook Prisma Schema (`logbook/prisma/schema.prisma`)

#### Added ticketId and ticketUrl fields to Tasklist model (lines 105-106):
```prisma
ticketId    String?  @map("ticket_id")
ticketUrl   String?  @map("ticket_url")
```

#### Added index for ticketId (line 124):
```prisma
@@index([ticketId])
```

## How It Works Now

1. **CRM disposition** → Sends `ticketId` in payload to logbook API
2. **Logbook API** → Extracts `ticketId`, `priority`, and `ticketUrl` from request
3. **Task creation** → Saves `ticket_id` and `ticket_url` in the database
4. **Query tasks** → Can now retrieve tasks by `ticket_id` via `/api/external/crm/tasks?ticketId=XXX`

## Testing

To verify the fix works:

1. **Disposition a ticket in CRM** with status `ASSIGNED_TO_SUPPORT`
2. **Check logbook logs** for: `[External API] Linked task {taskId} to CRM ticket {ticketId}`
3. **Query the task** using: `GET /api/external/crm/tasks?ticketId={ticketId}`
4. **Verify response** includes the correct `ticketId` field

## Database Migration

The changes are backward compatible:
- Existing tasks without `ticket_id` will have `NULL` values
- New tasks from CRM will have the `ticket_id` populated
- The API checks for column existence before creating tasks

## Next Steps

After deploying these changes:

1. **Regenerate Prisma Client** in logbook:
   ```bash
   cd logbook
   npx prisma generate
   ```

2. **Restart both applications** to pick up the changes

3. **Test the integration** by dispositioning a ticket from CRM

## Files Modified

1. `logbook/src/app/api/external/tasklist/route.ts` - Added ticketId handling
2. `logbook/prisma/schema.prisma` - Added ticketId and ticketUrl fields
3. `logbook/docs/CRM_INTEGRATION_FIX.md` - This documentation

## Date
2025-11-11
