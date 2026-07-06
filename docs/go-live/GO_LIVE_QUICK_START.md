# Go-Live Command Center - Quick Start Guide

## 🚀 Getting Started

### Access the Dashboard

1. **Start the development server**:
   ```bash
   npm run dev
   ```

2. **Navigate to**:
   ```
   http://localhost:3000/go-live/1
   ```

3. **Or use the sidebar**:
   - Click "Go-Live Command Center" in the left navigation menu

---

## 📁 File Structure

```
src/app/(admin)/go-live/[projectId]/
└── page.tsx                    # Main dashboard component

src/layout/
└── AppSidebar.tsx             # Navigation (updated with Go-Live link)

Documentation:
├── GO_LIVE_COMMAND_CENTER_README.md    # Complete documentation
├── GO_LIVE_VISUAL_GUIDE.md             # Visual design reference
└── GO_LIVE_QUICK_START.md              # This file
```

---

## 🎨 Key Features

### ✅ Implemented (UI/UX Only)

1. **Main Header**
   - Project title display
   - Scheduled time
   - Live countdown timer (updates every second)
   - Overall status badge (ON_SCHEDULE/DELAYED/DONE)

2. **Go-Live Checklist**
   - Three collapsible phases (Pre/During/Post Go-Live)
   - 15 sample tasks with status tracking
   - Interactive status dropdown (Pending/In Progress/Done/Failed)
   - PIC (Person in Charge) display with avatars
   - Completion timestamps

3. **Activity Log**
   - Real-time feed of actions
   - Auto-scroll to latest entry
   - Manual comment input
   - Automatic logging of task status changes
   - User avatars and timestamps

4. **Key Contacts**
   - Team member list
   - Online/offline status indicators
   - Role display

5. **Emergency Actions**
   - Rollback plan button
   - Warning styling for visibility

6. **Responsive Design**
   - Desktop: 3-column layout
   - Tablet: Stacked with side-by-side cards
   - Mobile: Single column, optimized for touch

---

## 🔧 Customization Guide

### Change Project Data

Edit the `MOCK_PROJECT` constant in `page.tsx`:

```typescript
const MOCK_PROJECT: GoLiveProject = {
  id: 1,
  title: 'Your Project Name',           // Change project title
  scheduledTime: '2025-10-01T23:00:00+07:00',  // Set go-live time
  status: 'ON_SCHEDULE',                 // ON_SCHEDULE | DELAYED | DONE
  // ... rest of configuration
};
```

### Add/Modify Checklist Tasks

```typescript
checklist: [
  {
    id: 1,
    description: 'Your task description',
    pic: 'Person Name',
    picAvatar: 'PN',                    // Initials for avatar
    status: 'PENDING',                  // PENDING | IN_PROGRESS | DONE | FAILED
    phase: 'PRE_GOLIVE',                // PRE_GOLIVE | DURING_GOLIVE | POST_GOLIVE
    completedAt: undefined              // ISO timestamp when done
  },
  // Add more tasks...
]
```

### Modify Key Contacts

```typescript
keyContacts: [
  {
    name: 'Contact Name',
    role: 'Their Role',
    status: 'ONLINE',                   // ONLINE | OFFLINE
    avatar: 'CN'                        // Initials
  },
  // Add more contacts...
]
```

### Change Colors

The dashboard uses Tailwind CSS classes. Key color mappings:

```typescript
// Status colors
ON_SCHEDULE → bg-green-500
DELAYED     → bg-orange-500
DONE        → bg-blue-500
FAILED      → bg-red-500

// Background
Primary     → bg-gray-900
Cards       → bg-gray-800
Borders     → border-gray-700
```

To change, edit the `getStatusColor()` function in `page.tsx`.

---

## 🔌 Backend Integration Guide

### Step 1: Replace Mock Data with API Calls

```typescript
// Current (Mock):
useEffect(() => {
  setProject(MOCK_PROJECT);
}, [projectId]);

// Replace with:
useEffect(() => {
  fetch(`/api/go-live/${projectId}`)
    .then(res => res.json())
    .then(data => setProject(data))
    .catch(err => console.error(err));
}, [projectId]);
```

### Step 2: Implement Task Status Updates

```typescript
const handleTaskStatusChange = async (taskId: number, newStatus: TaskStatus) => {
  try {
    const response = await fetch(`/api/go-live/tasks/${taskId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus })
    });
    
    if (response.ok) {
      // Update local state
      // Refresh activity log
    }
  } catch (error) {
    console.error('Failed to update task:', error);
  }
};
```

### Step 3: Add Real-time Updates (WebSocket)

```typescript
useEffect(() => {
  const ws = new WebSocket(`ws://your-server/go-live/${projectId}`);
  
  ws.onmessage = (event) => {
    const update = JSON.parse(event.data);
    
    if (update.type === 'TASK_UPDATE') {
      // Update task in state
    } else if (update.type === 'NEW_LOG') {
      // Add to activity log
    }
  };
  
  return () => ws.close();
}, [projectId]);
```

### Step 4: Implement Comment Submission

```typescript
const handleAddComment = async () => {
  if (!newComment.trim()) return;
  
  try {
    await fetch(`/api/go-live/${projectId}/comments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: newComment })
    });
    
    setNewComment('');
  } catch (error) {
    console.error('Failed to add comment:', error);
  }
};
```

---

## 🗄️ Database Schema Suggestion

### Tables

```sql
-- Projects table
CREATE TABLE go_live_projects (
  id SERIAL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  scheduled_time TIMESTAMP NOT NULL,
  status VARCHAR(50) NOT NULL,
  rollback_plan_url TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Checklist tasks
CREATE TABLE go_live_tasks (
  id SERIAL PRIMARY KEY,
  project_id INTEGER REFERENCES go_live_projects(id),
  description TEXT NOT NULL,
  pic_id INTEGER REFERENCES users(id),
  status VARCHAR(50) NOT NULL,
  phase VARCHAR(50) NOT NULL,
  completed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Activity log
CREATE TABLE go_live_activity_log (
  id SERIAL PRIMARY KEY,
  project_id INTEGER REFERENCES go_live_projects(id),
  user_id INTEGER REFERENCES users(id),
  message TEXT NOT NULL,
  type VARCHAR(50) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Key contacts (junction table)
CREATE TABLE go_live_contacts (
  project_id INTEGER REFERENCES go_live_projects(id),
  user_id INTEGER REFERENCES users(id),
  role VARCHAR(100),
  PRIMARY KEY (project_id, user_id)
);
```

---

## 🧪 Testing Checklist

### Manual Testing

- [ ] Countdown timer updates every second
- [ ] Task status changes reflect immediately
- [ ] Activity log auto-scrolls to new entries
- [ ] Phase sections expand/collapse correctly
- [ ] Comment submission works
- [ ] Responsive design on mobile/tablet
- [ ] All interactive elements have hover states
- [ ] Status colors display correctly
- [ ] Timestamps format properly (WIB timezone)

### Browser Testing

- [ ] Chrome (latest)
- [ ] Firefox (latest)
- [ ] Safari (latest)
- [ ] Edge (latest)
- [ ] Mobile Safari (iOS)
- [ ] Chrome Mobile (Android)

---

## 🎯 Common Use Cases

### Scenario 1: Pre-Deployment Preparation

1. Team lead creates go-live project
2. Adds all pre-deployment tasks
3. Assigns team members (PICs)
4. Shares dashboard URL with stakeholders
5. Team members update task status as they complete items

### Scenario 2: During Deployment

1. Monitor countdown timer
2. Execute tasks in sequence
3. Update status immediately after each step
4. Add comments for any issues or observations
5. Check overall status indicator
6. Have rollback plan ready

### Scenario 3: Post-Deployment

1. Complete post-deployment verification tasks
2. Document any issues in activity log
3. Mark project as DONE
4. Export activity log for records
5. Conduct retrospective

---

## 🐛 Troubleshooting

### Countdown Timer Not Updating

**Issue**: Timer shows 00:00:00 or doesn't update

**Solution**: Check that `scheduledTime` is in the future and in ISO 8601 format:
```typescript
scheduledTime: '2025-10-01T23:00:00+07:00'  // Correct
scheduledTime: '2025-10-01 23:00:00'        // Wrong
```

### Activity Log Not Auto-Scrolling

**Issue**: New entries don't scroll into view

**Solution**: Ensure the ref is properly attached:
```typescript
<div ref={activityLogRef} className="...">
```

### Status Changes Not Persisting

**Issue**: Status reverts after page refresh

**Solution**: This is expected with mock data. Implement backend API calls to persist changes.

### Responsive Layout Issues

**Issue**: Layout breaks on certain screen sizes

**Solution**: Check Tailwind breakpoints:
- `sm:` 640px
- `md:` 768px
- `lg:` 1024px
- `xl:` 1280px

---

## 📊 Performance Tips

### Optimize for Large Checklists

If you have 50+ tasks:

```typescript
// Use React.memo for task items
const TaskItem = React.memo(({ task, onChange }) => {
  // ... component code
});

// Virtualize long lists
import { FixedSizeList } from 'react-window';
```

### Reduce Re-renders

```typescript
// Use useCallback for event handlers
const handleTaskStatusChange = useCallback((taskId, newStatus) => {
  // ... handler code
}, [project]);
```

### Optimize Activity Log

```typescript
// Limit displayed logs to recent 50
const recentLogs = project.activityLog.slice(-50);
```

---

## 🔐 Security Considerations

### When Implementing Backend

1. **Authentication**: Verify user has access to project
2. **Authorization**: Check permissions before allowing status changes
3. **Input Validation**: Sanitize all user inputs (comments)
4. **Rate Limiting**: Prevent spam in activity log
5. **Audit Trail**: Log all changes with user ID and timestamp

---

## 🚢 Deployment Checklist

Before deploying to production:

- [ ] Replace all mock data with API calls
- [ ] Implement authentication/authorization
- [ ] Add error handling and loading states
- [ ] Set up WebSocket/SSE for real-time updates
- [ ] Configure timezone handling
- [ ] Add analytics tracking
- [ ] Test with real deployment scenario
- [ ] Document API endpoints
- [ ] Set up monitoring/alerting
- [ ] Create user guide for team

---

## 📚 Additional Resources

### Related Documentation
- [Main README](./GO_LIVE_COMMAND_CENTER_README.md) - Complete feature documentation
- [Visual Guide](./GO_LIVE_VISUAL_GUIDE.md) - Design system reference

### External Resources
- [Tailwind CSS Docs](https://tailwindcss.com/docs)
- [Next.js App Router](https://nextjs.org/docs/app)
- [React Hooks](https://react.dev/reference/react)

---

## 💡 Tips & Best Practices

### For Developers

1. **Keep mock data realistic**: Use actual task descriptions from your deployment process
2. **Test timezone handling**: Ensure times display correctly for your users
3. **Add loading states**: Show spinners while fetching data
4. **Handle errors gracefully**: Display user-friendly error messages
5. **Make it accessible**: Test with keyboard navigation and screen readers

### For Teams

1. **Define clear phases**: Customize PRE/DURING/POST phases for your process
2. **Assign PICs early**: Everyone should know their responsibilities
3. **Use comments liberally**: Document decisions and issues in real-time
4. **Practice first**: Do a dry run before actual go-live
5. **Review afterwards**: Use activity log for retrospectives

---

## 🎉 Next Steps

1. **Explore the dashboard**: Navigate to `/go-live/1` and interact with all features
2. **Customize mock data**: Edit `MOCK_PROJECT` to match your deployment process
3. **Plan backend integration**: Review the integration guide above
4. **Test responsiveness**: Try on different devices and screen sizes
5. **Share with team**: Get feedback on the UI/UX design

---

## 📞 Support

For questions or issues:
- Review the main [README](./GO_LIVE_COMMAND_CENTER_README.md)
- Check the [Visual Guide](./GO_LIVE_VISUAL_GUIDE.md)
- Inspect the code in `src/app/(admin)/go-live/[projectId]/page.tsx`

---

**Status**: ✅ UI/UX Complete - Ready for Backend Development

**Version**: 1.0.0

**Last Updated**: October 1, 2025
