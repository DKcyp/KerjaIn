# BA Status Rename: PARTIAL → MENUNGGU_APPROVAL

## Changes Made

Renamed the BA status from "PARTIAL" (displayed as "Kirim Review") to "MENUNGGU_APPROVAL" (displayed as "Menunggu Approval") to better reflect the actual state of the blueprint.

## Files Modified

### 1. Database Schema
**File**: `prisma/schema.prisma`
- Updated `BAStatus` enum: `PARTIAL` → `MENUNGGU_APPROVAL`

### 2. Migration
**File**: `prisma/migrations/20260424_rename_partial_to_menunggu_approval/migration.sql`
- Updates existing data in database
- Renames the enum value in PostgreSQL

### 3. Status Display Utility
**File**: `src/utils/statusDisplay.ts`
- Updated type definition: `BAStatus`
- Updated display name: "Kirim Review" → "Menunggu Approval"
- Updated color mapping (kept yellow color)

### 4. API Endpoints
Updated status assignment logic in:
- `src/app/api/blueprint-baru/[id]/complete-ba/route.ts`
- `src/app/api/blueprint-baru/[id]/update-ba-status/route.ts`
- `src/app/api/blueprint-baru/[id]/update-complete-ba/route.ts`

### 5. Frontend Page
**File**: `src/app/(admin)/blueprint-baru/[id]/page.tsx`
- Updated status color mapping
- Updated status display name mapping
- Updated button click handler
- Updated status indicator with pulse animation

## Status Flow

1. **DRAFT** - Initial state when BA is created
2. **MENUNGGU_APPROVAL** - When some tasks are approved but not all (previously "PARTIAL")
3. **APPROVED** - When all tasks are approved
4. **SIAP_UAT** - Ready for UAT testing
5. **SELESAI_UAT** - UAT completed

## Migration Steps

To apply these changes:

1. Run Prisma migration:
   ```bash
   npx prisma migrate deploy
   ```

2. Or manually run the SQL:
   ```sql
   UPDATE "BusinessAnalyst" SET status = 'MENUNGGU_APPROVAL' WHERE status = 'PARTIAL';
   UPDATE "business_analyst" SET status = 'MENUNGGU_APPROVAL' WHERE status = 'PARTIAL';
   ALTER TYPE "BAStatus" RENAME VALUE 'PARTIAL' TO 'MENUNGGU_APPROVAL';
   ```

3. Regenerate Prisma Client:
   ```bash
   npx prisma generate
   ```

## UI Changes

- Status badge now shows "Menunggu Approval" instead of "Kirim Review"
- Button text remains "Kirim Review" for clarity
- Yellow color and pulse animation maintained for consistency
