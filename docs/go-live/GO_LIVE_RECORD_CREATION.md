# Go Live Record Creation Flow

## Problem Solved
Projects with 100% EUT were appearing on the Go Live list but couldn't be accessed because they didn't have a Go Live record in the database yet.

## Solution
Added a "Create Go-Live Record" button for projects without Go Live records.

---

## How It Works Now

### Before (Broken Flow):
```
1. Project reaches 100% EUT ✅
2. Project appears on Go Live list ✅
3. Click project card
4. ❌ ERROR: Go Live record not found
5. ❌ Can't view details or manage checklists
```

### After (Fixed Flow):
```
1. Project reaches 100% EUT ✅
2. Project appears on Go Live list ✅
3. See "Create Go-Live Record" button ✅
4. Click button → Go Live record created ✅
5. Button changes to "View Go-Live Details" ✅
6. Click to view details and manage checklists ✅
```

---

## Visual Changes

### Project Card - Without Go Live Record:
```
┌─────────────────────────────────────┐
│ PRJ-001  [READY]                    │
│ Project Name                         │
│                                      │
│ Client: ABC Corp                     │
│                                      │
│ EUT Completion                       │
│ 10/10 Items (100%) [████████] 100%  │
│                                      │
│ PIC: John Doe                        │
│ ─────────────────────────────────── │
│ [Create Go-Live Record] 🟢          │
└─────────────────────────────────────┘
```

### Project Card - With Go Live Record:
```
┌─────────────────────────────────────┐
│ PRJ-001  [IN_PROGRESS]              │
│ Project Name                         │
│                                      │
│ Client: ABC Corp                     │
│                                      │
│ EUT Completion                       │
│ 10/10 Items (100%) [████████] 100%  │
│                                      │
│ Checklist Progress                   │
│ 3/5 Items (60%) [████░░] 60%        │
│                                      │
│ PIC: John Doe                        │
│ ─────────────────────────────────── │
│ [View Go-Live Details] 🔵           │
└─────────────────────────────────────┘
```

---

## When Go Live Records Are Created

### Method 1: Manual Creation (NEW ✨)
**Via UI Button**:
1. Go to `/go-live` page
2. Find project with 100% EUT
3. Click "Create Go-Live Record" button
4. Confirm the action
5. Record created with default checklist

### Method 2: API Call
**Direct API**:
```bash
POST /api/go-live
{
  "projectId": 123,
  "scheduledDate": "2025-10-15T10:00:00Z",
  "notes": "Ready for deployment"
}
```

---

## What Gets Created

When you create a Go Live record:

### 1. Go Live Entry
```sql
INSERT INTO go_live (
  projectId,
  status,
  scheduledDate,
  notes,
  createdBy,
  createdAt
) VALUES (
  123,
  'READY',
  NULL,
  'Go-Live record created - ready for deployment',
  1,
  NOW()
);
```

### 2. Activity Log
```sql
INSERT INTO go_live_activity_log (
  goLiveId,
  userId,
  action,
  description,
  createdAt
) VALUES (
  1,
  1,
  'CREATED',
  'Go-Live entry created',
  NOW()
);
```

### 3. Default Checklists (Optional)
You can add default checklists during creation or add them later.

---

## Button Logic

### Conditional Rendering:
```typescript
{project.hasGoLiveRecord ? (
  // Has record → Show view button
  <Link href={`/go-live/${project.id}`}>
    View Go-Live Details
  </Link>
) : (
  // No record → Show create button
  <button onClick={() => handleCreateGoLive(project.projectId)}>
    Create Go-Live Record
  </button>
)}
```

### Create Handler:
```typescript
const handleCreateGoLive = async (projectId: number) => {
  // Confirm with user
  const confirmed = confirm('Create Go-Live record?');
  if (!confirmed) return;

  // Call API
  const response = await fetch('/api/go-live', {
    method: 'POST',
    body: JSON.stringify({
      projectId,
      scheduledDate: null,
      notes: 'Go-Live record created - ready for deployment',
    }),
  });

  // Refresh page to show updated data
  if (response.ok) {
    window.location.reload();
  }
};
```

---

## API Validation

The API validates before creating:

### Checks:
1. ✅ Project exists
2. ✅ Project has EUT tests
3. ✅ **100% EUT completion required**
4. ✅ No duplicate Go Live record

### Error Responses:
```json
// Project not found
{
  "success": false,
  "error": "Project not found"
}

// No EUT tests
{
  "success": false,
  "error": "Project has no EUT tests"
}

// Incomplete EUT
{
  "success": false,
  "error": "Project EUT is only 80% complete. Must be 100% to create Go-Live."
}

// Duplicate record
{
  "success": false,
  "error": "Go-Live already exists for this project"
}
```

---

## User Flow

### Complete Flow:
```
1. Complete all EUT tests (100%)
   ↓
2. Project appears on Go-Live page
   ↓
3. Click "Create Go-Live Record" button
   ↓
4. Confirm creation
   ↓
5. Go Live record created
   ↓
6. Page refreshes
   ↓
7. Button changes to "View Go-Live Details"
   ↓
8. Click to view details
   ↓
9. Manage checklists and deployment
```

---

## Benefits

### 1. **Clear Action**
- Users know exactly what to do
- Button text is self-explanatory
- Confirmation prevents accidents

### 2. **No Confusion**
- No more "Not Found" errors
- Clear distinction between projects with/without records
- Visual feedback with different buttons

### 3. **One-Click Creation**
- Simple button click
- No complex forms
- Instant record creation

### 4. **Automatic Refresh**
- Page reloads after creation
- Shows updated data immediately
- Button changes automatically

---

## Troubleshooting

### "Create Go-Live Record" button not showing?
**Check**:
- Is EUT 100% complete?
- Does project have EUT tests?
- Refresh the page

### Button click does nothing?
**Check**:
- Browser console for errors
- Network tab for API response
- User authentication

### "Go-Live already exists" error?
**Solution**:
- Record was already created
- Refresh page to see updated button
- Click "View Go-Live Details" instead

---

## Summary

**Problem**: Projects with 100% EUT couldn't be accessed because Go Live records didn't exist.

**Solution**: Added "Create Go-Live Record" button that:
- ✅ Shows for projects without Go Live records
- ✅ Creates record with one click
- ✅ Changes to "View Details" after creation
- ✅ Validates 100% EUT completion
- ✅ Prevents duplicate records

**Result**: Seamless flow from EUT completion to Go Live management!
