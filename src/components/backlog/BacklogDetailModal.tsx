import React, { useState, useEffect } from 'react';
import { Modal } from "@/components/ui/modal";
import Select2Field from "@/components/form/Select2Field";
import ModuleDisplay from "./ModuleDisplay";
import BacklogDetailView from "./BacklogDetailView";
import { useToast } from "@/context/ToastContext";
import { formatFileSize, getFileTypeCategory } from "@/lib/fileUploadConfig";

type BacklogNote = {
  id: number;
  title: string;
  note: string;
  projectId: number | null;
  moduleId: number | null;
  assignedTo: number | null;
  tasklistId: number | null;
  estimatedManHour: number | null;
  isDeleted: boolean;
  createdAt: string;
  updatedAt: string;
};

type Proyek = { id: number; namaProyek: string };
type User = { id: number; name: string; username?: string; role?: string; jabatan?: string };

interface BacklogDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  note: BacklogNote | null;
  projects: Proyek[];
  moduleLabelCache: Record<number, string>;
  onEdit: (id: number) => void;
  onDelete: (id: number) => void;
  onAssign: (id: number, userId: number | null, tasklistId?: number | null) => void;
}

const BacklogDetailModal: React.FC<BacklogDetailModalProps> = ({
  isOpen,
  onClose,
  note,
  projects,
  moduleLabelCache,
  onEdit,
  onDelete,
  onAssign,
}) => {
  const toast = useToast();
  const [users, setUsers] = useState<User[]>([]);
  const [assignLoading, setAssignLoading] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [scheduleAt, setScheduleAt] = useState<string>('');
  const [taskComplexity, setTaskComplexity] = useState<'EASY' | 'MEDIUM' | 'HARD'>('MEDIUM');
  const [showAssignmentForm, setShowAssignmentForm] = useState(false);
  const [files, setFiles] = useState<Array<{
    id: number;
    fileName: string;
    originalName: string;
    filePath: string;
    fileType: string;
    fileSize: number;
    uploadedBy: number;
    uploadedAt: string;
  }>>([]);
  const [loadingFiles, setLoadingFiles] = useState(false);
  const [associatedTasks, setAssociatedTasks] = useState<any[]>([]);
  const [loadingTasks, setLoadingTasks] = useState(false);
  const [returnedTaskId, setReturnedTaskId] = useState<number | null>(null);

  // Load users for assignment and check for associated tasks
  useEffect(() => {
    if (isOpen && note?.projectId) {
      loadProjectTeam(note.projectId);
      loadFiles(note.id);
      if (note.assignedTo) {
        checkAssociatedTasks(note.id);
      }
    }
  }, [isOpen, note?.projectId, note?.assignedTo, note?.id]);

  // Set initial selected user when note changes
  useEffect(() => {
    if (note) {
      setSelectedUserId(note.assignedTo);
      setShowAssignmentForm(false);
      // Set default schedule to tomorrow
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      setScheduleAt(tomorrow.toISOString().slice(0, 16));
    }
  }, [note]);

  const loadProjectTeam = async (projectId: number) => {
    try {
      // Load all team members from the specific project
      const res = await fetch(`/api/projects/${projectId}/team`, { 
        credentials: 'include' 
      });
      
      if (res.ok) {
        const data = await res.json();
        setUsers(Array.isArray(data?.items) ? data.items : []);
      } else {
        console.error('Failed to load project team:', res.status);
        setUsers([]);
      }
    } catch (error) {
      console.error('Failed to load project team:', error);
      setUsers([]);
    }
  };

  const checkAssociatedTasks = async (backlogId: number) => {
    setLoadingTasks(true);
    try {
      const res = await fetch(`/api/backlog/${backlogId}/task`, {
        credentials: 'include'
      });
      
      if (res.ok) {
        const data = await res.json();
        setAssociatedTasks(data.associatedTasks || []);
        
        // Check if task was returned to backlog (has tasklistId but pegawaiId is null)
        if (data.backlog?.tasklistId && data.associatedTasks?.length > 0) {
          const task = data.associatedTasks[0];
          // If task exists but has no assignee, it means it was returned
          if (!task.pegawaiId) {
            setReturnedTaskId(task.id);
          } else {
            setReturnedTaskId(null);
          }
        } else {
          setReturnedTaskId(null);
        }
      }
    } catch (error) {
      console.error('Failed to check associated tasks:', error);
    } finally {
      setLoadingTasks(false);
    }
  };

  const loadFiles = async (backlogId: number) => {
    setLoadingFiles(true);
    try {
      const res = await fetch(`/api/backlog/${backlogId}/files`, {
        credentials: 'include'
      });
      
      if (res.ok) {
        const data = await res.json();
        setFiles(data.files || []);
      }
    } catch (error) {
      console.error('Failed to load files:', error);
      setFiles([]);
    } finally {
      setLoadingFiles(false);
    }
  };

  const handleUnassign = async () => {
    if (!note || !note.assignedTo) return;
    
    if (!confirm('Apakah Anda yakin ingin unassign catatan ini?')) return;
    
    setAssignLoading(true);
    try {
      await onAssign(note.id, null); // Set assignedTo to null
      toast.success('Berhasil unassign catatan backlog!', 4000);
    } catch (error) {
      console.error('Unassign error:', error);
      toast.error(error instanceof Error ? error.message : 'Gagal melakukan unassign. Silakan coba lagi.', 6000);
    } finally {
      setAssignLoading(false);
    }
  };

  const handleAssign = async () => {
    if (!note || !selectedUserId || !scheduleAt) return;
    
    setAssignLoading(true);
    try {
      // Create tasklist from backlog
      const taskData = {
        projectId: note.projectId,
        moduleId: note.moduleId,
        pegawaiId: selectedUserId,
        scheduleAt: new Date(scheduleAt).toISOString(),
        keterangan: note.note,
        taskComplexity,
        tasklistType: 'DEVELOPMENT',
        sourceBacklogId: note.id
      };

      const taskResponse = await fetch('/api/tasklist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(taskData)
      });

      if (!taskResponse.ok) {
        const errorData = await taskResponse.json();
        throw new Error(errorData.error || 'Failed to create task');
      }

      const taskResult = await taskResponse.json();
      const createdTaskId = taskResult.item?.id;
      
      if (!createdTaskId) {
        throw new Error('Task created but ID not returned');
      }

      // Copy files from backlog to tasklist
      try {
        const copyFilesResponse = await fetch(`/api/backlog/${note.id}/copy-files-to-task`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ taskId: createdTaskId })
        });

        if (copyFilesResponse.ok) {
          const copyResult = await copyFilesResponse.json();
          if (copyResult.copiedFiles > 0) {
            console.log(`✅ Copied ${copyResult.copiedFiles} files to task ${createdTaskId}`);
          }
        } else {
          console.warn('Failed to copy files to task, but task creation succeeded');
        }
      } catch (copyError) {
        console.error('Error copying files to task:', copyError);
        // Don't fail the entire assignment if file copying fails
      }
      
      // Update backlog assignment with tasklistId
      await onAssign(note.id, selectedUserId, createdTaskId);
      
      // Refresh associated tasks
      await checkAssociatedTasks(note.id);
      
      // Close assignment form
      setShowAssignmentForm(false);
      
      const assignedUserName = users.find(u => u.id === selectedUserId)?.name;
      toast.success(`Berhasil membuat task dan assign ke ${assignedUserName}! Lampiran file juga telah disalin ke task.`, 6000);
    } catch (error) {
      console.error('Assignment error:', error);
      toast.error(error instanceof Error ? error.message : 'Gagal melakukan assignment. Silakan coba lagi.', 6000);
    } finally {
      setAssignLoading(false);
    }
  };

  const getPriorityInfo = (updatedAt: string) => {
    const daysDiff = Math.floor((Date.now() - new Date(updatedAt).getTime()) / (1000 * 60 * 60 * 24));
    if (daysDiff > 7) return { 
      color: 'text-red-600 bg-red-50 border-red-200', 
      text: 'Urgent',
      icon: '🔴'
    };
    if (daysDiff > 3) return { 
      color: 'text-yellow-600 bg-yellow-50 border-yellow-200', 
      text: 'Medium',
      icon: '🟡'
    };
    return { 
      color: 'text-green-600 bg-green-50 border-green-200', 
      text: 'Recent',
      icon: '🟢'
    };
  };

  const getRelativeTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return 'Baru saja';
    if (diffInHours < 24) return `${diffInHours} jam lalu`;
    
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays === 1) return 'Kemarin';
    if (diffInDays < 7) return `${diffInDays} hari lalu`;
    
    const diffInWeeks = Math.floor(diffInDays / 7);
    if (diffInWeeks === 1) return '1 minggu lalu';
    if (diffInWeeks < 4) return `${diffInWeeks} minggu lalu`;
    
    return date.toLocaleDateString('id-ID');
  };

  if (!note) return null;

  const project = projects.find(p => p.id === note.projectId);

  const priorityInfo = getPriorityInfo(note.updatedAt);
  const assignedUser = users.find(u => u.id === note.assignedTo);

  return (
    <Modal isOpen={isOpen} onClose={onClose} className="max-w-7xl w-[95vw] max-h-[95vh] overflow-hidden backlog-detail-modal">
      <div className="flex flex-col h-full max-h-[95vh] modal-content">
        {/* Header */}
        <div className="flex-shrink-0 px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 mb-3">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 truncate">
                  {note.title || 'Tanpa Judul'}
                </h2>
                <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border ${priorityInfo.color} flex-shrink-0`}>
                  <span className="mr-1">{priorityInfo.icon}</span>
                  {priorityInfo.text}
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
                <span className="flex items-center">
                  <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                  </svg>
                  ID: #{note.id}
                </span>
                <span className="flex items-center">
                  <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3a1 1 0 011-1h6a1 1 0 011 1v4h3a1 1 0 011 1v9a2 2 0 01-2 2H5a2 2 0 01-2-2V8a1 1 0 011-1h3z" />
                  </svg>
                  Dibuat: {new Date(note.createdAt).toLocaleDateString('id-ID')}
                </span>
                <span className="flex items-center">
                  <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Diperbarui: {getRelativeTime(note.updatedAt)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto backlog-detail-scrollbar">
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 p-6 h-full">
            {/* Main Content */}
            <div className="xl:col-span-2 space-y-6 min-h-0">
              {/* Project & Module Info */}
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-xl p-5 border border-blue-100 dark:border-blue-800/30">
                <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center">
                  <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center mr-3 section-header-icon">
                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-4m-5 0H3m2 0h4M9 7h6m-6 4h6m-6 4h6" />
                    </svg>
                  </div>
                  Informasi Proyek
                </h3>
                <div className="grid grid-cols-1 gap-4">
                  <div className="bg-white dark:bg-gray-800/50 rounded-lg p-4 border border-gray-200 dark:border-gray-700 info-card">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-500 dark:text-gray-400">Proyek</span>
                      <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                        {project?.namaProyek || 'Tidak ada proyek'}
                      </span>
                    </div>
                  </div>
                  <div className="bg-white dark:bg-gray-800/50 rounded-lg p-4 border border-gray-200 dark:border-gray-700 info-card">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-500 dark:text-gray-400">Modul</span>
                      <ModuleDisplay 
                        moduleId={note.moduleId}
                        moduleLabelCache={moduleLabelCache}
                        className="text-sm font-semibold text-gray-900 dark:text-gray-100"
                      />
                    </div>
                  </div>
                  <div className="bg-white dark:bg-gray-800/50 rounded-lg p-4 border border-gray-200 dark:border-gray-700 info-card">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-500 dark:text-gray-400">Anggota Tim</span>
                      <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                        {users.length > 0 ? `${users.length} orang` : 'Belum ada tim'}
                      </span>
                    </div>
                  </div>
                  {note.estimatedManHour && (
                    <div className="bg-white dark:bg-gray-800/50 rounded-lg p-4 border border-gray-200 dark:border-gray-700 info-card">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-gray-500 dark:text-gray-400">Estimasi Man Hour</span>
                        <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                          {note.estimatedManHour}h
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Content */}
              <div className="flex-1 min-h-0">
                <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center">
                  <div className="w-8 h-8 bg-green-500 rounded-lg flex items-center justify-center mr-3 section-header-icon">
                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  Deskripsi Backlog
                </h3>
                <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 h-full min-h-[300px] shadow-sm">
                  <BacklogDetailView 
                    content={note.note || '<p>Tidak ada deskripsi</p>'}
                    className="h-full overflow-y-auto"
                  />
                </div>
              </div>
          </div>

            {/* Sidebar */}
            <div className="xl:col-span-1 space-y-6 min-h-0 overflow-y-auto backlog-detail-scrollbar">
              {/* Assignment Section */}
              <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 shadow-sm">
                <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center">
                  <div className="w-8 h-8 bg-purple-500 rounded-lg flex items-center justify-center mr-3">
                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>
                  Assignment
                </h3>
              
              <div className="space-y-4">
                {/* Current Assignment Status */}
                {assignedUser ? (
                  <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center text-white text-sm font-medium mr-3">
                          {assignedUser.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
                            {assignedUser.name}
                          </p>
                          {assignedUser.username && (
                            <p className="text-xs text-blue-600 dark:text-blue-300">
                              @{assignedUser.username}
                            </p>
                          )}
                          {assignedUser.jabatan && (
                            <p className="text-xs text-blue-600 dark:text-blue-300">
                              {assignedUser.jabatan}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full block mb-1">
                          Assigned
                        </span>
                        {note.tasklistId && (
                          <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full block mb-2">
                            Task Created
                          </span>
                        )}
                        {!note.tasklistId && (
                          <button
                            onClick={handleUnassign}
                            disabled={assignLoading}
                            className="text-xs text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 underline disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            Unassign
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700 mb-4">
                      <p className="text-sm text-gray-600 dark:text-gray-400 text-center">
                        {returnedTaskId ? 'Task dikembalikan ke backlog' : 'Belum di-assign ke anggota tim'}
                      </p>
                    </div>

                    {/* Assignment Form - Only show if not assigned */}
                    {!showAssignmentForm ? (
                      <button
                        onClick={() => setShowAssignmentForm(true)}
                        disabled={users.length === 0}
                        className="w-full px-4 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium"
                      >
                        {users.length === 0 ? 'Tidak ada anggota tim' : returnedTaskId ? 'Assign Ulang' : 'Assign ke Anggota Tim'}
                      </button>
                    ) : (
                  <div className="space-y-4 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-medium text-gray-900 dark:text-gray-100">Assignment Details</h4>
                      <button
                        onClick={() => setShowAssignmentForm(false)}
                        className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>

                    {/* User Selection */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Assign ke Anggota Tim <span className="text-red-500">*</span>
                      </label>
                      <Select2Field
                        value={selectedUserId || ''}
                        onChange={(v: any) => setSelectedUserId(v === '' ? null : Number(v))}
                        options={users.map(u => ({ 
                          id: u.id, 
                          text: `${u.name}${u.jabatan ? ` - ${u.jabatan}` : ''}${u.username ? ` (@${u.username})` : ''}` 
                        }))}
                        placeholder="Pilih anggota tim..."
                        className="w-full"
                      />
                    </div>

                    {/* Schedule Date */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Jadwal Mulai <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="datetime-local"
                        value={scheduleAt}
                        onChange={(e) => setScheduleAt(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                      />
                    </div>

                    {/* Task Complexity */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Kompleksitas Task <span className="text-red-500">*</span>
                      </label>
                      <select
                        value={taskComplexity}
                        onChange={(e) => setTaskComplexity(e.target.value as 'EASY' | 'MEDIUM' | 'HARD')}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                      >
                        <option value="EASY">Easy (4 jam)</option>
                        <option value="MEDIUM">Medium (8 jam)</option>
                        <option value="HARD">Hard (16 jam)</option>
                      </select>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        Kompleksitas menentukan estimasi waktu dan SLA deadline
                      </p>
                    </div>

                    {/* File Copy Information */}
                    {files.length > 0 && (
                      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
                        <div className="flex items-center mb-2">
                          <svg className="w-4 h-4 text-blue-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <span className="text-sm font-medium text-blue-800 dark:text-blue-200">
                            Lampiran File
                          </span>
                        </div>
                        <p className="text-xs text-blue-700 dark:text-blue-300">
                          📎 {files.length} file dari backlog ini akan otomatis disalin ke task yang dibuat.
                        </p>
                      </div>
                    )}

                    {/* Action Buttons */}
                    <div className="flex gap-2 pt-2">
                      <button
                        onClick={() => setShowAssignmentForm(false)}
                        disabled={assignLoading}
                        className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-sm font-medium"
                      >
                        Batal
                      </button>
                      <button
                        onClick={handleAssign}
                        disabled={assignLoading || !selectedUserId || !scheduleAt}
                        className="flex-1 px-3 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium"
                      >
                        {assignLoading ? 'Membuat Task...' : 'Assign & Buat Task'}
                      </button>
                    </div>
                  </div>
                    )}
                  </>
                )}

                {/* No Team Members Warning */}
                {users.length === 0 && (
                  <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                    <div className="flex items-center">
                      <svg className="w-5 h-5 text-yellow-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                      </svg>
                      <div>
                        <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                          Tidak ada anggota tim di project ini
                        </p>
                        <p className="text-xs text-yellow-600 dark:text-yellow-300 mt-1">
                          Tambahkan anggota tim ke project terlebih dahulu
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

              {/* Actions */}
              <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 shadow-sm">
                <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center">
                  <div className="w-8 h-8 bg-orange-500 rounded-lg flex items-center justify-center mr-3">
                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                    </svg>
                  </div>
                  Aksi
                </h3>
              
              <div className="space-y-2">
                <button
                  onClick={() => onEdit(note.id)}
                  className="w-full px-3 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors text-sm font-medium flex items-center justify-center"
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  Edit Catatan
                </button>
                
                <button
                  onClick={() => {
                    if (confirm('Apakah Anda yakin ingin menghapus catatan ini?')) {
                      onDelete(note.id);
                      onClose();
                    }
                  }}
                  className="w-full px-3 py-2 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors text-sm font-medium flex items-center justify-center"
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  Hapus Catatan
                </button>
              </div>
            </div>

              {/* Associated Tasks */}
              {note.assignedTo && (
                <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 shadow-sm">
                  <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center">
                    <div className="w-8 h-8 bg-teal-500 rounded-lg flex items-center justify-center mr-3">
                      <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v11a2 2 0 002 2h6l3.5-4 3.5 4h1a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                      </svg>
                    </div>
                    Task Terkait
                  </h3>
                
                {loadingTasks ? (
                  <div className="flex items-center justify-center py-4">
                    <svg className="animate-spin h-5 w-5 text-gray-400 mr-2" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span className="text-sm text-gray-500">Memuat task...</span>
                  </div>
                ) : associatedTasks.length > 0 ? (
                  <div className="space-y-2">
                    {associatedTasks.map((task, index) => (
                      <div key={task.id} className="p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                            {task.kode}
                          </span>
                          <span className={`text-xs px-2 py-1 rounded-full ${
                            task.status === 'COMPLETED' ? 'bg-green-100 text-green-800' :
                            task.status === 'IN_PROGRESS' ? 'bg-blue-100 text-blue-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {task.status}
                          </span>
                        </div>
                        <div className="text-xs text-gray-600 dark:text-gray-400 space-y-1">
                          <div>Kompleksitas: {task.taskComplexity}</div>
                          <div>Jadwal: {new Date(task.scheduleAt).toLocaleDateString('id-ID')}</div>
                          <div>Dibuat: {new Date(task.createdAt).toLocaleDateString('id-ID')}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
                    Belum ada task yang dibuat dari backlog ini
                  </p>
                )}
              </div>
            )}

              {/* Files Section */}
              <div className="bg-gradient-to-r from-orange-50 to-amber-50 dark:from-gray-800/50 dark:to-gray-700/50 rounded-xl p-5 border border-orange-200 dark:border-gray-700">
                <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center">
                  <div className="w-8 h-8 bg-orange-500 rounded-lg flex items-center justify-center mr-3">
                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                    </svg>
                  </div>
                  Lampiran File
                </h3>
                
                {loadingFiles ? (
                  <div className="flex items-center justify-center py-4">
                    <svg className="animate-spin h-5 w-5 text-gray-400 mr-2" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span className="text-sm text-gray-500">Memuat file...</span>
                  </div>
                ) : files.length > 0 ? (
                  <div className="space-y-3 max-h-60 overflow-y-auto">
                    {files.map((file) => {
                      const fileCategory = getFileTypeCategory({ name: file.originalName, type: file.fileType } as File);
                      const isImage = fileCategory === 'images';

                      // File type icons
                      const getFileIcon = (category: string, mimeType: string) => {
                        if (category === 'images') return '🖼️';
                        if (category === 'documents') {
                          if (mimeType.includes('pdf')) return '📄';
                          return '📝';
                        }
                        if (category === 'spreadsheets') return '📊';
                        if (category === 'presentations') return '📽️';
                        if (category === 'archives') return '🗜️';
                        if (category === 'videos') return '🎥';
                        if (category === 'audio') return '🎵';
                        if (category === 'textFiles') return '📄';
                        if (category === 'codeFiles') return '💻';
                        return '📎';
                      };

                      return (
                        <div key={file.id} className="flex items-center gap-3 p-3 bg-white dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600 hover:shadow-sm transition-shadow">
                          <div className="flex-shrink-0">
                            {isImage ? (
                              <div className="w-10 h-10 rounded-lg overflow-hidden border border-gray-300 dark:border-gray-500">
                                <img
                                  src={file.filePath}
                                  alt={file.originalName}
                                  className="w-full h-full object-cover"
                                />
                              </div>
                            ) : (
                              <div className="w-10 h-10 rounded-lg bg-gray-200 dark:bg-gray-600 flex items-center justify-center text-lg">
                                {getFileIcon(fileCategory, file.fileType)}
                              </div>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                              {file.originalName}
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                              {formatFileSize(file.fileSize)} • {new Date(file.uploadedAt).toLocaleDateString('id-ID')}
                            </p>
                          </div>
                          <a
                            href={file.filePath}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex-shrink-0 p-2 text-gray-400 hover:text-blue-500 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                            title="Buka file"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                            </svg>
                          </a>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
                    Belum ada file yang diupload
                  </p>
                )}
              </div>

              {/* Metadata */}
              <div className="bg-gradient-to-r from-gray-50 to-slate-50 dark:from-gray-800/50 dark:to-slate-800/50 rounded-xl p-5 border border-gray-200 dark:border-gray-700">
                <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center">
                  <div className="w-8 h-8 bg-gray-500 rounded-lg flex items-center justify-center mr-3">
                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  Informasi
                </h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500 dark:text-gray-400">Status:</span>
                  <span className={`font-medium ${note.assignedTo ? 'text-blue-600' : 'text-gray-600'}`}>
                    {note.assignedTo ? 'Assigned' : 'Unassigned'}
                  </span>
                </div>
                {associatedTasks.length > 0 && (
                  <div className="flex justify-between">
                    <span className="text-gray-500 dark:text-gray-400">Task:</span>
                    <span className="text-green-600 font-medium">
                      {associatedTasks.length} task dibuat
                    </span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-gray-500 dark:text-gray-400">Dibuat:</span>
                  <span className="text-gray-700 dark:text-gray-300">
                    {new Date(note.createdAt).toLocaleDateString('id-ID')}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500 dark:text-gray-400">Diperbarui:</span>
                  <span className="text-gray-700 dark:text-gray-300">
                    {new Date(note.updatedAt).toLocaleDateString('id-ID')}
                  </span>
                </div>
              </div>
            </div>
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
};

export default BacklogDetailModal;