'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';

// Types
type GoLiveStatus = 'READY' | 'PLANNED' | 'IN_PROGRESS' | 'COMPLETED' | 'ROLLED_BACK';
type ChecklistStatus = 'PENDING' | 'IN_PROGRESS' | 'DONE';

interface ChecklistItem {
  id: number;
  title: string;
  description?: string;
  status: ChecklistStatus;
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

// Mock data removed - now using real API data

export default function GoLiveDetailPage() {
  const router = useRouter();
  const params = useParams();
  const projectId = Number(params.projectId);
  
  const [project, setProject] = useState<GoLiveProject | null>(null);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(true);
  const activityLogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchGoLiveData = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/go-live/${projectId}`);
        const data = await response.json();
        
        if (data.success && data.data) {
          // Transform API data to match component interface
          const transformedData: GoLiveProject = {
            id: data.data.id,
            projectName: data.data.projectName,
            scheduledDate: data.data.scheduledDate || new Date().toISOString(),
            status: data.data.status,
            pic: data.data.pic || 'Not assigned',
            picAvatar: getInitials(data.data.pic || 'NA'),
            checklist: data.data.checklists.map((c: any) => ({
              id: c.id,
              title: c.title,
              description: c.description,
              status: c.isCompleted ? 'DONE' : 'PENDING',
              completedAt: c.completedAt,
              completedBy: c.completedBy,
            })),
            activityLog: data.data.activityLogs.map((log: any) => ({
              id: log.id,
              timestamp: log.createdAt,
              user: log.userName,
              userAvatar: getInitials(log.userName),
              message: log.description,
              type: log.action === 'COMMENT' ? 'MANUAL' : 'AUTO',
            })).reverse(), // Reverse to show oldest first
          };
          setProject(transformedData);
        }
      } catch (error) {
        console.error('Error fetching go-live data:', error);
      } finally {
        setLoading(false);
      }
    };

    if (projectId) {
      fetchGoLiveData();
    }
  }, [projectId]);

  const getInitials = (name: string) => {
    if (!name) return '??';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  // Auto-scroll activity log
  useEffect(() => {
    if (activityLogRef.current) {
      activityLogRef.current.scrollTop = activityLogRef.current.scrollHeight;
    }
  }, [project?.activityLog]);

  const handleChecklistStatusChange = async (checklistId: number, newStatus: ChecklistStatus) => {
    if (!project) return;

    const checklist = project.checklist.find(c => c.id === checklistId);
    if (!checklist) return;

    try {
      const response = await fetch(`/api/go-live/${projectId}/checklist`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          checklistId,
          isCompleted: newStatus === 'DONE',
        }),
      });

      const result = await response.json();
      
      if (result.success) {
        // Refresh data
        const refreshResponse = await fetch(`/api/go-live/${projectId}`);
        const refreshData = await refreshResponse.json();
        
        if (refreshData.success && refreshData.data) {
          const transformedData: GoLiveProject = {
            id: refreshData.data.id,
            projectName: refreshData.data.projectName,
            scheduledDate: refreshData.data.scheduledDate || new Date().toISOString(),
            status: refreshData.data.status,
            pic: refreshData.data.pic || 'Not assigned',
            picAvatar: getInitials(refreshData.data.pic || 'NA'),
            checklist: refreshData.data.checklists.map((c: any) => ({
              id: c.id,
              title: c.title,
              description: c.description,
              status: c.isCompleted ? 'DONE' : 'PENDING',
              completedAt: c.completedAt,
              completedBy: c.completedBy,
            })),
            activityLog: refreshData.data.activityLogs.map((log: any) => ({
              id: log.id,
              timestamp: log.createdAt,
              user: log.userName,
              userAvatar: getInitials(log.userName),
              message: log.description,
              type: log.action === 'COMMENT' ? 'MANUAL' : 'AUTO',
            })).reverse(),
          };
          setProject(transformedData);
        }
      }
    } catch (error) {
      console.error('Error updating checklist:', error);
      alert('Failed to update checklist');
    }
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

  const handleAddComment = async () => {
    if (!project || !newComment.trim()) return;

    try {
      const response = await fetch(`/api/go-live/${projectId}/activity`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          description: newComment,
        }),
      });

      const result = await response.json();
      
      if (result.success) {
        // Refresh data
        const refreshResponse = await fetch(`/api/go-live/${projectId}`);
        const refreshData = await refreshResponse.json();
        
        if (refreshData.success && refreshData.data) {
          const transformedData: GoLiveProject = {
            id: refreshData.data.id,
            projectName: refreshData.data.projectName,
            scheduledDate: refreshData.data.scheduledDate || new Date().toISOString(),
            status: refreshData.data.status,
            pic: refreshData.data.pic || 'Not assigned',
            picAvatar: getInitials(refreshData.data.pic || 'NA'),
            checklist: refreshData.data.checklists.map((c: any) => ({
              id: c.id,
              title: c.title,
              description: c.description,
              status: c.isCompleted ? 'DONE' : 'PENDING',
              completedAt: c.completedAt,
              completedBy: c.completedBy,
            })),
            activityLog: refreshData.data.activityLogs.map((log: any) => ({
              id: log.id,
              timestamp: log.createdAt,
              user: log.userName,
              userAvatar: getInitials(log.userName),
              message: log.description,
              type: log.action === 'COMMENT' ? 'MANUAL' : 'AUTO',
            })).reverse(),
          };
          setProject(transformedData);
        }
        setNewComment('');
      }
    } catch (error) {
      console.error('Error adding comment:', error);
      alert('Failed to add comment');
    }
  };

  const getStatusBadge = (status: GoLiveStatus) => {
    const styles = {
      READY: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
      PLANNED: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
      IN_PROGRESS: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
      COMPLETED: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
      ROLLED_BACK: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    };

    const labels = {
      READY: 'Ready',
      PLANNED: 'Planned',
      IN_PROGRESS: 'In Progress',
      COMPLETED: 'Completed',
      ROLLED_BACK: 'Rolled Back',
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

  // Removed getChecklistLabel - using title directly

  const getStatusLabel = (status: ChecklistStatus) => {
    switch (status) {
      case 'PENDING': return 'Pending';
      case 'IN_PROGRESS': return 'In Progress';
      case 'DONE': return 'Selesai';
    }
  };

  const formatTime = (isoString: string) => {
    const date = new Date(isoString);
    return date.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) + ' WIB';
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

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="text-6xl mb-4">❌</div>
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100 mb-2">Go-Live Not Found</h2>
          <p className="text-gray-600 dark:text-gray-400 mb-4">This project doesn't have a Go-Live record yet.</p>
          <button
            onClick={() => router.push('/go-live')}
            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
          >
            Back to Go-Live List
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <nav className="mb-6">
        <ol className="flex items-center gap-2 text-sm">
          <li>
            <button
              onClick={() => router.push('/go-live')}
              className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium"
            >
              Go-Live
            </button>
          </li>
          <li className="text-gray-400 dark:text-gray-500">/</li>
          <li className="text-gray-600 dark:text-gray-400">{project.projectName}</li>
        </ol>
      </nav>

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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {project.checklist.map((item) => (
            <div
              key={item.id}
              className={`bg-white dark:bg-gray-800 rounded-lg shadow-sm border-2 ${getChecklistStatusColor(item.status)} p-6`}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  {item.title}
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

              {item.description && (
                <div className="mb-4">
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {item.description}
                  </p>
                </div>
              )}

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

        <div className="lg:col-span-1">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 flex flex-col h-[calc(100vh-300px)] lg:sticky lg:top-6">
            <div className="border-b border-gray-200 dark:border-gray-700 px-4 py-3 flex-shrink-0">
              <h3 className="font-semibold text-gray-900 dark:text-gray-100">Activity Log</h3>
            </div>
            
            <div ref={activityLogRef} className="flex-1 overflow-y-auto p-4 space-y-3">
              {project.activityLog.map(log => (
                <div
                  key={log.id}
                  className={`${log.type === 'MANUAL' ? 'bg-blue-50 dark:bg-blue-900/20' : 'bg-gray-50 dark:bg-gray-700'} border border-gray-200 dark:border-gray-700 rounded-lg p-3`}
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
