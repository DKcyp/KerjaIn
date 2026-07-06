# Go-Live Simplified Structure - Implementation Guide

## Overview

Based on your requirements, the Go-Live feature has been restructured:

1. **Main Page** (`/go-live`): Project list with cards
2. **Detail Page** (`/go-live/[projectId]`): Only 3 checklists (Server, Domain, Konfigurasi) + Activity Log

---

## ✅ Completed: Main Page

**File**: `src/app/(admin)/go-live/page.tsx`

**Features**:
- Project list in card grid layout
- Filter tabs (All, Planned, In Progress, Completed)
- Each card shows:
  - Project name
  - Status badge
  - Scheduled date
  - Progress bar (completed/total checklists)
  - PIC (Person in Charge)
- "Buat Go-Live Baru" button
- Empty state when no projects match filter

**Status**: ✅ COMPLETE

---

## ⏳ To Do: Detail Page

**File**: `src/app/(admin)/go-live/[projectId]/page.tsx` (needs complete rewrite)

### Required Structure

#### 1. Header Section
- Project name
- Scheduled date
- Status badge
- Back button to list

#### 2. Main Content (2 columns on desktop)

**Left Column (70%)**:
- **3 Checklist Cards** (Server, Domain, Konfigurasi)
  - Each card shows:
    - Checklist name
    - Status dropdown (Pending/In Progress/Done)
    - Notes textarea
    - Completed timestamp (if done)
    - Completed by (if done)

**Right Column (30%)**:
- **Activity Log**
  - Scrollable feed
  - Auto-scroll to latest
  - Comment input at bottom
  - Shows all checklist status changes

---

## Complete Code for Detail Page

Replace the entire content of `src/app/(admin)/go-live/[projectId]/page.tsx` with:

```typescript
'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';

// Types
type GoLiveStatus = 'PLANNED' | 'IN_PROGRESS' | 'COMPLETED' | 'DELAYED';
type ChecklistStatus = 'PENDING' | 'IN_PROGRESS' | 'DONE';
type ChecklistType = 'SERVER' | 'DOMAIN' | 'KONFIGURASI';

interface ChecklistItem {
  id: number;
  type: ChecklistType;
  status: ChecklistStatus;
  notes?: string;
  completedAt?: string;
  completedBy?: string;
}

interface ActivityLog {
  id: number;
  timestamp: string;
  user: string;
  userAvatar?: string;
  message: string;
  type: 'AUTO' | 'MANUAL';
}

interface GoLiveProject {
  id: number;
  projectName: string;
  scheduledDate: string;
  status: GoLiveStatus;
  pic: string;
  picAvatar: string;
  checklist: ChecklistItem[];
  activityLog: ActivityLog[];
}

// Mock Data
const MOCK_PROJECT: GoLiveProject = {
  id: 1,
  projectName: 'Sistem Informasi Akademik',
  scheduledDate: '2025-10-15T23:00:00+07:00',
  status: 'IN_PROGRESS',
  pic: 'Budi Santoso',
  picAvatar: 'BS',
  checklist: [
    { id: 1, type: 'SERVER', status: 'DONE', notes: 'Server sudah siap dan tested', completedAt: '2025-10-01T20:30:00+07:00', completedBy: 'Siti Aminah' },
    { id: 2, type: 'DOMAIN', status: 'IN_PROGRESS', notes: 'DNS propagation masih berlangsung' },
    { id: 3, type: 'KONFIGURASI', status: 'PENDING' },
  ],
  activityLog: [
    { id: 1, timestamp: '2025-10-01T20:30:00+07:00', user: 'Siti Aminah', userAvatar: 'SA', message: 'menandai checklist "Server" sebagai Selesai.', type: 'AUTO' },
    { id: 2, timestamp: '2025-10-01T20:32:00+07:00', user: 'Siti Aminah', userAvatar: 'SA', message: 'Server configuration telah diverifikasi. All services running.', type: 'MANUAL' },
    { id: 3, timestamp: '2025-10-01T20:45:00+07:00', user: 'Ahmad Rizki', userAvatar: 'AR', message: 'mengubah status checklist "Domain" menjadi In Progress.', type: 'AUTO' },
  ],
};

export default function GoLiveDetailPage() {
  const router = useRouter();
  const params = useParams();
  const projectId = Number(params.projectId);
  
  const [project, setProject] = useState<GoLiveProject | null>(null);
  const [newComment, setNewComment] = useState('');
  const activityLogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Load project data
    setProject(MOCK_PROJECT);
  }, [projectId]);

  // Auto-scroll activity log
  useEffect(() => {
    if (activityLogRef.current) {
      activityLogRef.current.scrollTop = activityLogRef.current.scrollHeight;
    }
  }, [project?.activityLog]);

  const handleChecklistStatusChange = (checklistId: number, newStatus: ChecklistStatus) => {
    if (!project) return;

    const checklist = project.checklist.find(c => c.id === checklistId);
    if (!checklist) return;

    const updatedChecklist = project.checklist.map(item => {
      if (item.id === checklistId) {
        return {
          ...item,
          status: newStatus,
          completedAt: newStatus === 'DONE' ? new Date().toISOString() : undefined,
          completedBy: newStatus === 'DONE' ? 'Current User' : undefined,
        };
      }
      return item;
    });

    const newLog: ActivityLog = {
      id: project.activityLog.length + 1,
      timestamp: new Date().toISOString(),
      user: 'Current User',
      userAvatar: 'CU',
      message: `mengubah status checklist "${getChecklistLabel(checklist.type)}" menjadi ${getStatusLabel(newStatus)}.`,
      type: 'AUTO',
    };

    setProject({
      ...project,
      checklist: updatedChecklist,
      activityLog: [...project.activityLog, newLog],
    });
  };

  const handleNotesChange = (checklistId: number, notes: string) => {
    if (!project) return;

    const updatedChecklist = project.checklist.map(item => {
      if (item.id === checklistId) {
        return { ...item, notes };
      }
      return item;
    });

    setProject({
      ...project,
      checklist: updatedChecklist,
    });
  };

  const handleAddComment = () => {
    if (!project || !newComment.trim()) return;

    const newLog: ActivityLog = {
      id: project.activityLog.length + 1,
      timestamp: new Date().toISOString(),
      user: 'Current User',
      userAvatar: 'CU',
      message: newComment,
      type: 'MANUAL',
    };

    setProject({
      ...project,
      activityLog: [...project.activityLog, newLog],
    });

    setNewComment('');
  };

  const getStatusBadge = (status: GoLiveStatus) => {
    const styles = {
      PLANNED: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
      IN_PROGRESS: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
      COMPLETED: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
      DELAYED: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    };

    const labels = {
      PLANNED: 'Planned',
      IN_PROGRESS: 'In Progress',
      COMPLETED: 'Completed',
      DELAYED: 'Delayed',
    };

    return (
      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${styles[status]}`}>
        {labels[status]}
      </span>
    );
  };

  const getChecklistStatusColor = (status: ChecklistStatus) => {
    switch (status) {
      case 'PENDING':
        return 'border-gray-300 dark:border-gray-600';
      case 'IN_PROGRESS':
        return 'border-orange-500 dark:border-orange-400';
      case 'DONE':
        return 'border-green-500 dark:border-green-400';
    }
  };

  const getChecklistLabel = (type: ChecklistType) => {
    switch (type) {
      case 'SERVER': return 'Server';
      case 'DOMAIN': return 'Domain';
      case 'KONFIGURASI': return 'Konfigurasi';
    }
  };

  const getStatusLabel = (status: ChecklistStatus) => {
    switch (status) {
      case 'PENDING': return 'Pending';
      case 'IN_PROGRESS': return 'In Progress';
      case 'DONE': return 'Selesai';
    }
  };

  const formatDate = (isoString: string) => {
    const date = new Date(isoString);
    return date.toLocaleString('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }) + ' WIB';
  };

  const formatTime = (isoString: string) => {
    const date = new Date(isoString);
    return date.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) + ' WIB';
  };

  if (!project) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-gray-500 dark:text-gray-400">Loading...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <nav className="mb-6">
        <ol className="flex items-center gap-2 text-sm">
          <li>
            <button
              onClick={() => router.push('/go-live')}
              className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium"
            >
              Go-Live Command Center
            </button>
          </li>
          <li className="text-gray-400 dark:text-gray-500">/</li>
          <li className="text-gray-600 dark:text-gray-400">{project.projectName}</li>
        </ol>
      </nav>

      {/* Header Card */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{project.projectName}</h1>
              {getStatusBadge(project.status)}
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 mb-4">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <span>Jadwal: {formatDate(project.scheduledDate)}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-xs font-bold text-white">
                {project.picAvatar}
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">PIC</p>
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{project.pic}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Checklists */}
        <div className="lg:col-span-2 space-y-6">
          {project.checklist.map((item) => (
            <div
              key={item.id}
              className={`bg-white dark:bg-gray-800 rounded-lg shadow-sm border-2 ${getChecklistStatusColor(item.status)} p-6`}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  Checklist: {getChecklistLabel(item.type)}
                </h3>
                <select
                  value={item.status}
                  onChange={(e) => handleChecklistStatusChange(item.id, e.target.value as ChecklistStatus)}
                  className="bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100 text-sm rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="PENDING">Pending</option>
                  <option value="IN_PROGRESS">In Progress</option>
                  <option value="DONE">Done</option>
                </select>
              </div>

              {/* Notes */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Catatan
                </label>
                <textarea
                  value={item.notes || ''}
                  onChange={(e) => handleNotesChange(item.id, e.target.value)}
                  rows={3}
                  placeholder="Tambahkan catatan untuk checklist ini..."
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {/* Completion Info */}
              {item.status === 'DONE' && item.completedAt && (
                <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-3">
                  <div className="flex items-center gap-2 text-sm text-green-700 dark:text-green-400">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span>
                      Diselesaikan oleh <strong>{item.completedBy}</strong> pada {formatTime(item.completedAt)}
                    </span>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Right Column: Activity Log */}
        <div className="lg:col-span-1">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 flex flex-col h-[calc(100vh-300px)] lg:sticky lg:top-6">
            <div className="border-b border-gray-200 dark:border-gray-700 px-4 py-3 flex-shrink-0">
              <h3 className="font-semibold text-gray-900 dark:text-gray-100">Activity Log</h3>
            </div>
            
            {/* Log Entries */}
            <div ref={activityLogRef} className="flex-1 overflow-y-auto p-4 space-y-3">
              {project.activityLog.map(log => (
                <div
                  key={log.id}
                  className={`${log.type === 'MANUAL' ? 'bg-blue-50 dark:bg-blue-900/20' : 'bg-gray-50 dark:bg-gray-750'} border border-gray-200 dark:border-gray-700 rounded-lg p-3`}
                >
                  <div className="flex items-start gap-2">
                    <div className="w-6 h-6 rounded-full bg-blue-600 flex items-center justify-center text-xs font-bold text-white flex-shrink-0">
                      {log.userAvatar}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline gap-2 mb-1">
                        <span className="text-xs font-medium text-gray-900 dark:text-gray-100">{log.user}</span>
                        <span className="text-xs text-gray-500 dark:text-gray-400">{formatTime(log.timestamp)}</span>
                      </div>
                      <p className="text-sm text-gray-700 dark:text-gray-300">{log.message}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            
            {/* Comment Input */}
            <div className="border-t border-gray-200 dark:border-gray-700 p-4 flex-shrink-0">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleAddComment()}
                  placeholder="Tambahkan komentar..."
                  className="flex-1 bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100 text-sm rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <button
                  onClick={handleAddComment}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
```

---

## How to Apply

1. **Open** `src/app/(admin)/go-live/[projectId]/page.tsx`
2. **Select all** content (Ctrl+A)
3. **Delete** everything
4. **Paste** the complete code above
5. **Save** the file

---

## Features Implemented

### Detail Page
- ✅ Project header with name, date, status, PIC
- ✅ Breadcrumb navigation back to list
- ✅ 3 Checklist cards (Server, Domain, Konfigurasi)
- ✅ Status dropdown for each checklist
- ✅ Notes textarea for each checklist
- ✅ Completion info (who and when)
- ✅ Activity log with auto-scroll
- ✅ Comment input
- ✅ Responsive design (2 columns on desktop, stacked on mobile)

### Data Structure
- ✅ Simplified types (only 3 checklist types)
- ✅ Status tracking (Pending/In Progress/Done)
- ✅ Notes per checklist
- ✅ Completion metadata
- ✅ Activity log (auto + manual)

---

## Testing

1. Navigate to `/go-live`
2. Click on any project card
3. You should see:
   - Project details at top
   - 3 checklist cards on left
   - Activity log on right
4. Try:
   - Changing checklist status
   - Adding notes
   - Adding comments
   - Checking responsive layout on mobile

---

## Next Steps

1. Replace the detail page code as instructed above
2. Test the functionality
3. Customize mock data as needed
4. Plan backend API integration

---

**Status**: Main page ✅ Complete | Detail page ⏳ Code provided above
