# UAT Auto-Creation Fix

## Problem

When blueprint requirements are created and marked as "Done", the system was not automatically creating UAT (User Acceptance Test) items. This caused modules to not appear in the EUT (End User Test) page because:

1. Blueprint requirement marked as "Done" ✅
2. UAT items not created ❌ (Missing step)
3. EUT page filters modules by 100% UAT approval
4. Module doesn't show in EUT because no UAT items exist

## Solution Implemented

### 1. Automatic UAT Creation (Going Forward)

**File Modified:** `src/app/api/blueprint/[id]/requirements/[reqId]/route.ts`

When a blueprint requirement status is updated to "DONE", the system now automatically:
- Creates a UAT test item for that requirement
- Assigns it to the same user who was assigned the requirement
- Sets status as "Pending" (ready for UAT testing)
- Uses a unique code format: `UAT-{ProjectCode}-{ModuleId}-{RequirementId}`

**Workflow:**
```
Blueprint Requirement → Mark as "DONE" → Auto-create UAT item → UAT Testing → EUT Testing
```

### 2. Fix for Existing Data

**Script:** `scripts/create-missing-uat-items.js`

This script finds all existing "DONE" requirements that don't have UAT items and creates them automatically.

**How to Run:**
```bash
node scripts/create-missing-uat-items.js
```

**What it does:**
- Scans all blueprint requirements with status "DONE"
- Checks if UAT items already exist
- Creates missing UAT items
- Shows summary of created/skipped items

## Testing the Fix

### For Your Current Issue:

1. **Run the fix script:**
   ```bash
   cd d:\EXP-REPO\logbook
   node scripts\create-missing-uat-items.js
   ```

2. **Refresh the UAT page:**
   - Go to UAT page
   - Select project "PRJ-2025-11-07-5643-Proyekbaru test"
   - You should now see UAT items for module "TRTFHR"

3. **Approve the UAT items:**
   - Click on the module
   - Approve all UAT test items

4. **Check EUT page:**
   - Go to EUT page
   - Select the same project
   - Module "TRTFHR" should now appear
   - EUT items will be auto-created from approved UAT items

### For Future Requirements:

1. **Create blueprint requirement** → Automatically creates tasklist
2. **Complete the tasklist** → Mark requirement as "Done"
3. **Mark requirement as "Done"** → Automatically creates UAT item ✨ (NEW)
4. **Approve UAT items** → Automatically creates EUT items
5. **Complete EUT testing** → Ready for Go-Live

## Technical Details

### UAT Item Structure

When auto-created, UAT items have:
- **namaFitur**: Requirement description
- **kode**: `UAT-{ProjectCode}-{ModuleId}-{RequirementId}`
- **projectId**: From blueprint's project
- **moduleId**: From requirement's module
- **testerId**: Same as requirement's assignedTo
- **status**: "Pending" (ready for testing)
- **deskripsi**: "Auto-created from blueprint requirement: {description}"

### Duplicate Prevention

The system checks if a UAT item already exists before creating:
- Matches by projectId, moduleId, and unique code
- Prevents duplicate UAT items for the same requirement
- Safe to run multiple times

## Benefits

✅ **Seamless Workflow**: No manual UAT item creation needed
✅ **No Missing Steps**: Every completed requirement gets UAT testing
✅ **Automatic EUT Population**: Modules appear in EUT after UAT approval
✅ **Audit Trail**: Clear tracking from requirement → UAT → EUT
✅ **Backward Compatible**: Fix script handles existing data

## Troubleshooting

### Module still not showing in EUT?

1. **Check UAT items exist:**
   - Go to UAT page
   - Select your project
   - Verify module has test items

2. **Check UAT approval:**
   - All UAT items must be "Approved" (100%)
   - Partial approval won't show module in EUT

3. **Run the fix script:**
   ```bash
   node scripts\create-missing-uat-items.js
   ```

4. **Check module structure:**
   - Parent modules need either:
     - Direct UAT items (100% approved), OR
     - Children with 100% UAT approval

### UAT items not auto-creating?

1. **Verify requirement status:**
   - Must be marked as "DONE" (not "Done" or "done")
   - Status is case-sensitive

2. **Check requirement has moduleId:**
   - Requirement must be assigned to a module
   - Module must exist in project's module tree

3. **Check logs:**
   - Server console shows "Auto-created UAT item for requirement {id}"
   - Any errors will be logged

## Related Files

- **API Route**: `src/app/api/blueprint/[id]/requirements/[reqId]/route.ts`
- **Fix Script**: `scripts/create-missing-uat-items.js`
- **UAT Page**: `src/app/(admin)/uat/page.tsx`
- **EUT Page**: `src/app/(admin)/eut/page.tsx`
- **UAT API**: `src/app/api/uat/route.ts`
- **EUT API**: `src/app/api/eut/route.ts`
