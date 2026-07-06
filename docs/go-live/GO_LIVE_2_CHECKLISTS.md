# Go Live - 2 Checklists System

## Summary of Changes

### 1. **Reduced to 2 Default Checklists**
- ✅ **Server**: Server setup and configuration completed
- ✅ **Domain**: Domain and DNS configuration completed

### 2. **Automatic Status Change to COMPLETED (LIVE)**
When both checklists are marked as completed, the system automatically:
- Changes Go Live status from "READY" → "COMPLETED"
- Adds activity log entry
- Shows "LIVE" status on the card

---

## How It Works

### Creating a Go Live Record:

```
1. Go to /go-live page
   ↓
2. Find project with 100% EUT
   ↓
3. Click "Create Go-Live Record"
   ↓
4. System creates:
   - Go Live record (Status: READY)
   - 2 checklists (Server & Domain - both PENDING)
   - Activity log entry
   ↓
5. Card shows: "0/2 Items (0%)"
```

### Completing Checklists:

```
1. Click "View Go-Live Details"
   ↓
2. See 2 checklists:
   - Server (Pending)
   - Domain (Pending)
   ↓
3. Complete Server checklist
   - Status: 1/2 (50%)
   - Go Live Status: Still READY
   ↓
4. Complete Domain checklist
   - Status: 2/2 (100%)
   - 🎉 Go Live Status: AUTO-CHANGES to COMPLETED
   - Activity log: "All checklists completed - Status changed to COMPLETED (LIVE)"
   ↓
5. Card shows: "2/2 Items (100%)" with COMPLETED badge
```

---

## Status Flow

```
READY (0/2 or 1/2)
    ↓
    Complete both checklists
    ↓
COMPLETED (2/2) ← LIVE! 🎉
```

---

## API Changes

### POST /api/go-live
Creates Go Live record with 2 default checklists:
```json
{
  "projectId": 123,
  "scheduledDate": null,
  "notes": "Go-Live record created"
}
```

**Creates**:
- 1 Go Live record (status: READY)
- 2 Checklists (Server & Domain)
- 1 Activity log entry

### PUT /api/go-live/[id]/checklist
Updates checklist and auto-changes status if all completed:

```json
{
  "checklistId": 1,
  "isCompleted": true
}
```

**Logic**:
1. Update checklist
2. Check if ALL checklists are completed
3. If yes → Change Go Live status to COMPLETED
4. Add activity log

---

## Visual Changes

### Card - Before Completion (0/2):
```
┌─────────────────────────────────┐
│ PRJ-001  [READY]                │
│ Project Name                     │
│                                  │
│ EUT: 10/10 (100%) ✅            │
│ Checklist: 0/2 (0%) 🟠          │
│                                  │
│ [View Go-Live Details]           │
└─────────────────────────────────┘
```

### Card - After Completion (2/2):
```
┌─────────────────────────────────┐
│ PRJ-001  [COMPLETED] 🎉         │
│ Project Name                     │
│                                  │
│ EUT: 10/10 (100%) ✅            │
│ Checklist: 2/2 (100%) ✅        │
│                                  │
│ [View Go-Live Details]           │
└─────────────────────────────────┘
```

---

## Testing Steps

1. **Create Go Live Record**:
   ```
   - Go to /go-live
   - Click "Create Go-Live Record"
   - Verify: Card shows "0/2 Items (0%)"
   - Verify: Status badge shows "READY"
   ```

2. **Complete First Checklist**:
   ```
   - Click "View Go-Live Details"
   - Change Server status to "Done"
   - Verify: Card shows "1/2 Items (50%)"
   - Verify: Status still "READY"
   ```

3. **Complete Second Checklist**:
   ```
   - Change Domain status to "Done"
   - Verify: Status AUTO-CHANGES to "COMPLETED"
   - Verify: Card shows "2/2 Items (100%)"
   - Verify: Activity log shows status change
   ```

---

## Database Schema

### GoLive Table
- `status`: 'READY' | 'PLANNED' | 'IN_PROGRESS' | 'COMPLETED' | 'ROLLED_BACK'
- Auto-changes to 'COMPLETED' when all checklists done

### GoLiveChecklist Table
- Only 2 records per Go Live:
  1. Server
  2. Domain

---

## Benefits

1. **Simplified Process**: Only 2 essential checks
2. **Automatic Status**: No manual status update needed
3. **Clear Progress**: Easy to see 0/2, 1/2, 2/2
4. **Live Indicator**: COMPLETED = LIVE
5. **Activity Tracking**: All changes logged

---

## Important Notes

- ⚠️ **Old Go Live records** need to be recreated to get 2 checklists
- ⚠️ **Browser cache**: Hard refresh (Ctrl+Shift+R) after changes
- ✅ **New records**: Automatically get 2 checklists
- ✅ **Status change**: Happens automatically when both checked

---

## Summary

**Before**: 8 checklists, manual status management
**After**: 2 checklists (Server & Domain), automatic LIVE status

**Result**: Simpler, faster, more automated Go-Live process! 🚀
