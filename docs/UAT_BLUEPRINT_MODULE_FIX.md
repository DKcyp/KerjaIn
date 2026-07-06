# UAT Items Not Showing for Blueprint Tasks - Fix Documentation

## Problem Description

When creating a new module from the blueprint requirement modal and assigning a task to it, the UAT item was not showing on the UAT page after the task was completed. This affected both parent and leaf modules created through the blueprint workflow.

## Root Causes Identified

### 1. **Module Creation - Missing `isLeaf` Property**
When creating a new module from the blueprint requirement modal, the `isLeaf` property was not explicitly set. While the module tree API automatically calculates this based on children count, explicitly setting it ensures consistency.

**Fixed in:** `src/app/(admin)/blueprint/[id]/page.tsx` (line 879)

### 2. **UAT Creation Logic - Weak Tasklist Matching**
The UAT creation logic in the blueprint requirement API was using a simple description match to find the associated tasklist. This could fail if:
- Multiple tasklists have the same description
- The description was modified after creation
- The tasklist type wasn't considered

**Fixed in:** `src/app/api/blueprint/[id]/requirements/[reqId]/route.ts` (lines 92-104)

## Changes Made

### Change 1: Explicit `isLeaf` Property in Module Creation

**File:** `src/app/(admin)/blueprint/[id]/page.tsx`

```typescript
const newModule = {
  nama: reqModuleName.trim(),
  parentId: reqSelectedParentId,
  isLeaf: true, // Explicitly mark as leaf module so UAT items will show
  children: []
};
```

**Why:** Ensures newly created modules are properly marked as leaf modules, making them compatible with UAT item display logic.

### Change 2: Improved Tasklist Matching for UAT Creation

**File:** `src/app/api/blueprint/[id]/requirements/[reqId]/route.ts`

**Before:**
```typescript
const tasklist = await prisma.tasklist.findFirst({
  where: {
    projectId: requirement.blueprint.proyekId,
    keterangan: existingRequirement.description
  }
});
```

**After:**
```typescript
const tasklist = await prisma.tasklist.findFirst({
  where: {
    projectId: requirement.blueprint.proyekId,
    keterangan: existingRequirement.description,
    OR: [
      { tasklistType: 'BLUEPRINT' },
      { pegawaiId: existingRequirement.assignedTo }
    ]
  },
  orderBy: {
    createdAt: 'desc' // Get the most recent one if multiple exist
  }
});
```

**Why:** 
- Prioritizes BLUEPRINT type tasklists
- Falls back to matching by assignee
- Gets the most recent tasklist if multiple matches exist
- More robust matching logic reduces false negatives

### Change 3: Enhanced Logging

Added comprehensive logging to help debug UAT creation issues:
- ⚠️ Warning when no tasklist is found
- ✅ Success when UAT item is created
- ℹ️ Info when UAT item already exists
- ❌ Error when UAT creation fails

## How UAT Items Work with Parent vs Leaf Modules

### Leaf Modules
- UAT items are displayed directly under the module
- Click the module row to expand and see UAT items
- Most common scenario

### Parent Modules
- UAT items ARE supported for parent modules
- UAT items are displayed when the parent module is expanded
- The UAT page shows items in a separate section (lines 504-526 in `uat/page.tsx`)
- Total count includes UAT items from all child modules

## Testing the Fix

### Test Scenario 1: Create New Leaf Module from Blueprint

1. Go to a blueprint detail page
2. Click "Add Requirement"
3. Enter requirement description
4. Select a user to assign
5. Enter a new module name (e.g., "User Authentication")
6. Select a parent module or leave as root
7. Click "Submit"
8. **Expected:** Tasklist is created with `tasklistType: 'BLUEPRINT'`
9. Mark the requirement as "DONE"
10. **Expected:** UAT item is created automatically
11. Go to UAT page and select the project
12. **Expected:** UAT item appears under the module

### Test Scenario 2: Verify Parent Module UAT Items

1. Create a parent module with children
2. Assign a task to the parent module directly
3. Complete the task
4. Go to UAT page
5. Expand the parent module
6. **Expected:** UAT items for the parent module are visible

### Test Scenario 3: Multiple Tasklists with Same Description

1. Create two tasklists with the same description
2. One with `tasklistType: 'BLUEPRINT'`, one with `tasklistType: 'DEVELOPMENT'`
3. Mark blueprint requirement as DONE
4. **Expected:** UAT is created using the BLUEPRINT tasklist (not the DEVELOPMENT one)

## Verification Checklist

- [ ] New modules created from blueprint have `isLeaf: true`
- [ ] UAT items are created when blueprint requirements are marked as DONE
- [ ] UAT items appear on the UAT page for both leaf and parent modules
- [ ] Parent module UAT items are visible when expanded
- [ ] Tasklist matching prioritizes BLUEPRINT type tasks
- [ ] Console logs show clear success/warning/error messages

## Related Files

- `src/app/(admin)/blueprint/[id]/page.tsx` - Blueprint requirement modal
- `src/app/api/blueprint/[id]/requirements/[reqId]/route.ts` - Requirement status update API
- `src/app/(admin)/uat/page.tsx` - UAT display page
- `src/app/api/uat/route.ts` - UAT API endpoints
- `src/app/api/tasklist/[id]/route.ts` - Tasklist status update (also creates UAT on completion)

## Additional Notes

### UAT Creation Triggers

UAT items are created in two ways:

1. **Task Completion** (Normal workflow)
   - When a task status changes to `SELESAI` (completed)
   - Handled in `src/app/api/tasklist/[id]/route.ts`
   - Creates UAT with code: `UAT-{taskCode}`

2. **Blueprint Requirement Completion** (Blueprint workflow)
   - When a blueprint requirement status changes to `DONE`
   - Handled in `src/app/api/blueprint/[id]/requirements/[reqId]/route.ts`
   - Creates UAT with code: `UAT-{projectCode}-{moduleId}-{requirementId}`

### Known Limitations

- If the tasklist description doesn't match the requirement description exactly, UAT creation may fail
- The system relies on description matching since there's no direct foreign key relationship between `BlueprintRequirement` and `Tasklist`
- Future improvement: Add a `tasklistId` field to `BlueprintRequirement` for direct linking

## Troubleshooting

### UAT Item Not Created

Check the server logs for these messages:

```
⚠️ No tasklist found for requirement X (description: "..."), skipping UAT creation
```

**Solution:** Ensure the tasklist exists with matching description and BLUEPRINT type

### UAT Item Not Visible on UAT Page

1. Check if the module is a parent module - if yes, expand it to see UAT items
2. Verify the UAT item exists in the database:
   ```sql
   SELECT * FROM uat_test WHERE project_id = X AND module_id = Y;
   ```
3. Check the module's `isLeaf` property in the database
4. Refresh the UAT page to reload the module tree

### Multiple UAT Items Created

This can happen if the requirement is marked as DONE multiple times. The system checks for existing UAT items before creating new ones, but if the check fails, duplicates may be created.

**Prevention:** The improved matching logic reduces this risk by using `orderBy: { createdAt: 'desc' }` to get the most recent tasklist.

## Future Improvements

1. **Add Direct Relationship:** Add `tasklistId` field to `BlueprintRequirement` table for direct linking
2. **Batch UAT Creation:** Add endpoint to bulk-create UAT items for all completed requirements
3. **UAT Status Sync:** Sync UAT status back to blueprint requirements when approved/rejected
4. **Module Type Indicator:** Add visual indicator on UAT page to show which modules are parent vs leaf
